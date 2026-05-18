/*
 * UFRGS vestibular scraper (Node CLI).
 *
 * Reads a prova PDF (URL or local path), extracts text via pdfjs-dist, parses
 * it into questions with heuristic regex, optionally cross-references a gabarito
 * (answer key) PDF, and writes a JSON file that the app can import via Settings.
 *
 * Heuristics (best-effort):
 *   - Question marker: line starting with NN. or QUESTÃO NN
 *   - Alternatives: (A) (B) (C) (D) (E)  or  a)  b)  ...
 *   - Gabarito: lines like "01-A 02-C 03-D" or "01) A"
 *
 * Math formulas inside PDFs often come out garbled and figures are dropped.
 * Every output question is flagged needsReview=1 so you can fix in the editor.
 *
 * Usage:
 *   npx tsx scripts/scrape-ufrgs.ts <prova-pdf> [options]
 *     --gabarito <path|url>   answer key PDF or text file
 *     --subject <name>        subject name (must match a seeded subject)
 *     --year <YYYY>           prova year
 *     --source <label>        defaults to UFRGS
 *     --prefix <slug>         external_id prefix, default "ufrgs"
 *     --out <file>            output JSON path
 *     --dump                  dump raw text and exit (debugging)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// pdfjs-dist legacy build works in Node without a worker thread
// @ts-expect-error - pdfjs legacy build has no types in this entry
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

interface RangeMap { from: number; to: number; subject: string }

interface Args {
  input: string
  gabarito?: string
  subject?: string
  ranges?: RangeMap[]
  year?: number
  source: string
  prefix: string
  out?: string
  dump: boolean
}

function parseArgs(argv: string[]): Args {
  const a: Args = { input: '', source: 'UFRGS', prefix: 'ufrgs', dump: false }
  const positional: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i]
    switch (v) {
      case '--gabarito':  a.gabarito = argv[++i]; break
      case '--subject':   a.subject = argv[++i]; break
      case '--ranges':    a.ranges = parseRanges(argv[++i]); break
      case '--year':      a.year = Number(argv[++i]); break
      case '--source':    a.source = argv[++i]; break
      case '--prefix':    a.prefix = argv[++i]; break
      case '--out':       a.out = argv[++i]; break
      case '--dump':      a.dump = true; break
      default:            positional.push(v)
    }
  }
  if (!positional[0]) {
    console.error('Uso: tsx scripts/scrape-ufrgs.ts <pdf> [--opts]')
    process.exit(2)
  }
  a.input = positional[0]
  return a
}

function parseRanges(spec: string): RangeMap[] {
  return spec.split(',').map((part) => {
    const m = part.trim().match(/^(\d+)\s*-\s*(\d+)\s*:\s*(.+)$/)
    if (!m) throw new Error(`--ranges inválido: "${part}". Use "1-15:Matéria,16-30:Outra".`)
    return { from: Number(m[1]), to: Number(m[2]), subject: m[3].trim() }
  })
}

async function readSource(path: string): Promise<Uint8Array> {
  if (/^https?:\/\//.test(path)) {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${path}`)
    return new Uint8Array(await res.arrayBuffer())
  }
  const buf = await readFile(resolve(path))
  return new Uint8Array(buf)
}

async function pdfToText(data: Uint8Array): Promise<string> {
  const pdf = await getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true,
  }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const tc = await page.getTextContent()
    let last = 0
    const out: string[] = []
    for (const item of tc.items as Array<{ str: string; transform?: number[]; hasEOL?: boolean }>) {
      const y = item.transform?.[5] ?? 0
      if (last && Math.abs(y - last) > 4) out.push('\n')
      out.push(item.str)
      if (item.hasEOL) out.push('\n')
      last = y
    }
    pages.push(out.join(' '))
  }
  return pages.join('\n\n')
}

interface RawQuestion {
  number: number
  statement: string
  alternatives: string[]   // 5 strings (may be empty)
}

interface Context {
  from: number
  to: number
  text: string
}

interface ParseResult {
  questions: RawQuestion[]
  contexts: Context[]
}

function parseQuestions(text: string): ParseResult {
  // Normalize whitespace
  const norm = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')

  // Split by question markers: "01.", "01)", "QUESTÃO 01"
  const markerRe = /(?:^|\n)\s*(?:QUESTÃO\s+)?(\d{1,3})[\.\)]\s+/gi
  type Slice = { num: number; markerStart: number; bodyStart: number }
  const slices: Slice[] = []
  for (const m of norm.matchAll(markerRe)) {
    const num = Number(m[1])
    if (num < 1 || num > 200) continue
    slices.push({ num, markerStart: m.index!, bodyStart: m.index! + m[0].length })
  }

  const contexts = parseContexts(norm, slices)

  const out: RawQuestion[] = []
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i]
    const end = i + 1 < slices.length ? slices[i + 1].markerStart : norm.length
    const chunk = norm.slice(s.bodyStart, end).trim()
    const alts = splitAlternatives(chunk)
    if (!alts) continue
    out.push({ number: s.num, statement: alts.statement, alternatives: alts.options })
  }
  return { questions: out, contexts }
}

type Slice = { num: number; markerStart: number; bodyStart: number }

function parseContexts(norm: string, slices: Slice[]): Context[] {
  // Match the whole intro SENTENCE (up to terminating ./!/?) that mentions a question range.
  // Greedy enough to span PDF-induced line breaks inside a single sentence.
  const introRe = /[^.!?\n]{0,200}?quest[õo]es\s+(?:de\s+)?(\d{1,3})\s+(?:a|at[ée])\s+(\d{1,3})[^.!?]{0,300}?[.!?]/gi
  const REQUIRED = /\b(texto|textos|abaixo|seguir|referem-se|refere-se|responder|relaciona|leia|considere)\b/i
  const NOISY_START = /^(Caderno|Folha|Atenção|Instru[çc][ãa]o|Preencha|Verifique|Para cada|Ao transcrever|Você dispõe|N[ãa]o ser[áa])/i

  const contexts: Context[] = []
  for (const m of norm.matchAll(introRe)) {
    const from = Number(m[1])
    const to = Number(m[2])
    if (from < 1 || from > 200 || to <= from || to > 200) continue
    if (!REQUIRED.test(m[0])) continue   // skip TOC-like "(questões 46 a 60)"

    const introEnd = m.index! + m[0].length
    const fromSlice = slices.find((s) => s.num === from)
    if (!fromSlice || fromSlice.markerStart <= introEnd) continue

    const raw = norm.slice(introEnd, fromSlice.markerStart).trim()
    if (raw.length < 50 || raw.length > 5000) continue
    if (NOISY_START.test(raw)) continue

    contexts.push({ from, to, text: raw })
  }
  return contexts
}

function splitAlternatives(chunk: string): { statement: string; options: string[] } | null {
  const altRe = /(?:^|\n|\s)\(?([A-Ea-e])\)\s+/g
  const matches = [...chunk.matchAll(altRe)]
  if (matches.length < 5) return null
  // Take the LAST run of 5 sequential A..E markers — handles statements that
  // accidentally contain "(a)" earlier.
  let start = 0
  for (let i = matches.length - 5; i >= 0; i--) {
    const slice = matches.slice(i, i + 5)
    const letters = slice.map((m) => m[1].toUpperCase()).join('')
    if (letters === 'ABCDE') { start = i; break }
  }
  const altMarkers = matches.slice(start, start + 5)
  const statement = chunk.slice(0, altMarkers[0].index!).trim()
  const options: string[] = []
  for (let i = 0; i < 5; i++) {
    const from = altMarkers[i].index! + altMarkers[i][0].length
    const to = i + 1 < 5 ? altMarkers[i + 1].index! : chunk.length
    options.push(chunk.slice(from, to).trim())
  }
  return { statement, options }
}

function parseGabarito(text: string): Map<number, number> {
  const map = new Map<number, number>()
  // patterns: "01-A", "01. A", "01) A", "01 A"
  const re = /(\d{1,3})\s*[-\.\)]?\s*([A-Ea-e])\b/g
  for (const m of text.matchAll(re)) {
    const num = Number(m[1])
    const letter = m[2].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
    if (num >= 1 && num <= 200 && letter >= 0 && letter < 5) {
      map.set(num, letter)
    }
  }
  return map
}

interface ExportQuestion {
  externalId: string
  subjectId: number
  topicId: null
  year: number | null
  source: string
  difficulty: null
  statementMd: string
  alternatives: string[]
  correctAlt: number
  explanationMd: null
  tags: string[]
  isFavorite: 0
  isArchived: 0
  needsReview: 1
  createdAt: string
  updatedAt: string
}

interface ExportPayload {
  version: 1
  exportedAt: string
  subjects: Array<{ id?: number; name: string; color: string; displayOrder: number }>
  topics: []
  questions: ExportQuestion[]
  sessions: []
  attempts: []
  notes: []
  srs: []
  settings: []
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  console.log(`→ Lendo ${args.input}…`)
  const bytes = await readSource(args.input)
  const text = await pdfToText(bytes)

  if (args.dump) {
    console.log(text)
    return
  }

  const { questions: rawAll, contexts } = parseQuestions(text)
  const seen = new Set<number>()
  const raw = rawAll.filter((q) => {
    if (seen.has(q.number)) return false
    seen.add(q.number)
    return true
  })
  if (rawAll.length !== raw.length) {
    console.log(`→ ${rawAll.length - raw.length} duplicata(s) ignorada(s)`)
  }
  console.log(`→ ${raw.length} questão(ões) únicas detectada(s)`)
  if (contexts.length) {
    console.log(`→ ${contexts.length} bloco(s) de texto-base detectado(s): ${contexts.map(c => `${c.from}–${c.to}`).join(', ')}`)
  }

  let answers = new Map<number, number>()
  if (args.gabarito) {
    console.log(`→ Lendo gabarito ${args.gabarito}…`)
    const gBytes = await readSource(args.gabarito)
    const gText = args.gabarito.endsWith('.pdf') ? await pdfToText(gBytes) : new TextDecoder().decode(gBytes)
    answers = parseGabarito(gText)
    console.log(`→ ${answers.size} resposta(s) no gabarito`)
  }

  // Resolve subject name per question (range mapping or single subject).
  function subjectFor(num: number): string {
    if (args.ranges) {
      const m = args.ranges.find((r) => num >= r.from && num <= r.to)
      if (m) return m.subject
    }
    return args.subject ?? 'Por revisar'
  }

  // Allocate placeholder IDs per unique subject name
  const subjectIds = new Map<string, number>()
  let next = -1
  function idFor(name: string): number {
    let id = subjectIds.get(name)
    if (id == null) { id = next--; subjectIds.set(name, id) }
    return id
  }

  const now = new Date().toISOString()
  const yearSlug = args.year ? `-${args.year}` : ''
  const skipped: number[] = []
  const questions: ExportQuestion[] = []
  for (const q of raw) {
    if (args.gabarito && !answers.has(q.number)) {
      skipped.push(q.number)
      continue
    }
    const correctAlt = answers.get(q.number) ?? 0
    const subjectName = subjectFor(q.number)
    // When multiple contexts overlap (e.g., "Read texts 1-2 (Qs 01-15)" + "Text 1 (Qs 01-07)"),
    // prefer the most specific (smallest) range.
    const ctx = contexts
      .filter((c) => q.number >= c.from && q.number <= c.to)
      .sort((a, b) => (a.to - a.from) - (b.to - b.from))[0]
    const statementMd = ctx
      ? `**Texto-base (questões ${ctx.from}–${ctx.to}):**\n\n${ctx.text}\n\n---\n\n${q.statement}`
      : q.statement
    questions.push({
      externalId: `${args.prefix}${yearSlug}-${String(q.number).padStart(2, '0')}`,
      subjectId: idFor(subjectName),
      topicId: null,
      year: args.year ?? null,
      source: args.source,
      difficulty: null,
      statementMd,
      alternatives: q.alternatives,
      correctAlt,
      explanationMd: null,
      tags: [],
      isFavorite: 0,
      isArchived: 0,
      needsReview: 1,
      createdAt: now,
      updatedAt: now,
    })
  }

  if (skipped.length) {
    console.log(`→ Puladas (sem resposta no gabarito, ex: anuladas): ${skipped.join(', ')}`)
  }

  const subjects = [...subjectIds.entries()].map(([name, id], i) => ({
    id, name, color: 'oklch(0.65 0.18 240)', displayOrder: 99 + i,
  }))

  const payload: ExportPayload = {
    version: 1,
    exportedAt: now,
    subjects,
    topics: [],
    questions,
    sessions: [],
    attempts: [],
    notes: [],
    srs: [],
    settings: [],
  }

  const outDir = args.out ? dirname(args.out) : join(dirname(fileURLToPath(import.meta.url)), '..', 'scraper-out')
  await mkdir(outDir, { recursive: true })
  const outFile = args.out ?? join(outDir, basename(args.input).replace(/\.[^.]+$/, '') + '.json')
  await writeFile(outFile, JSON.stringify(payload, null, 2), 'utf8')
  console.log(`✓ Escrito: ${outFile}`)
  console.log(`  Importe via Configurações → Importar JSON. Todas as questões vêm com needsReview=1.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
