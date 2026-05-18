/* Smoke test for the scraper's parsing functions, without needing a real PDF. */
import { strict as assert } from 'node:assert'

// Inline copies of the parser logic from scrape-ufrgs.ts to keep this standalone.
// Keep in sync if the source ones change.

interface RawQuestion { number: number; statement: string; alternatives: string[] }

function parseQuestions(text: string): RawQuestion[] {
  const norm = text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n')
  const markerRe = /(?:^|\n)\s*(?:QUESTÃO\s+)?(\d{1,3})[\.\)]\s+/gi
  type Slice = { num: number; markerStart: number; bodyStart: number }
  const slices: Slice[] = []
  for (const m of norm.matchAll(markerRe)) {
    const num = Number(m[1])
    if (num < 1 || num > 200) continue
    slices.push({ num, markerStart: m.index!, bodyStart: m.index! + m[0].length })
  }
  const out: RawQuestion[] = []
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i]
    const end = i + 1 < slices.length ? slices[i + 1].markerStart : norm.length
    const chunk = norm.slice(s.bodyStart, end).trim()
    const alts = splitAlternatives(chunk)
    if (!alts) continue
    out.push({ number: s.num, statement: alts.statement, alternatives: alts.options })
  }
  return out
}

function splitAlternatives(chunk: string): { statement: string; options: string[] } | null {
  const altRe = /(?:^|\n|\s)\(?([A-Ea-e])\)\s+/g
  const matches = [...chunk.matchAll(altRe)]
  if (matches.length < 5) return null
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
  const re = /(\d{1,3})\s*[-\.\)]?\s*([A-Ea-e])\b/g
  for (const m of text.matchAll(re)) {
    const num = Number(m[1])
    const letter = m[2].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
    if (num >= 1 && num <= 200 && letter >= 0 && letter < 5) map.set(num, letter)
  }
  return map
}

const provaSample = `
UNIVERSIDADE FEDERAL DO RIO GRANDE DO SUL
VESTIBULAR 2024 — BIOLOGIA

01. A respeito da membrana plasmática, é correto afirmar que:
(A) é exclusiva de células eucariontes.
(B) é composta apenas de proteínas.
(C) apresenta permeabilidade seletiva.
(D) impede totalmente a passagem de água.
(E) é rígida e inflexível.

02. Considere o ciclo de Krebs. Qual a molécula que entra no ciclo?
(A) glicose
(B) piruvato
(C) acetil-CoA
(D) ATP
(E) lactato

03. Sobre a teoria sintética da evolução, é INCORRETO afirmar:
(A) reúne genética e seleção natural.
(B) explica especiação.
(C) ignora deriva genética.
(D) considera fluxo gênico.
(E) é base da biologia moderna.
`

const gabaritoSample = `
GABARITO PROVA BIOLOGIA 2024
01-C 02-C 03-C
`

const qs = parseQuestions(provaSample)
console.log('Questões detectadas:', qs.length)
console.log(JSON.stringify(qs, null, 2))
assert.equal(qs.length, 3, 'esperava 3 questões')
assert.equal(qs[0].number, 1)
assert.equal(qs[0].alternatives.length, 5)
assert.match(qs[0].statement, /membrana plasm/)
assert.match(qs[0].alternatives[2], /permeabilidade/)
assert.doesNotMatch(qs[0].alternatives[4], /\d{2}\./, 'última alt não pode conter número da próxima questão')
assert.doesNotMatch(qs[1].alternatives[4], /\d{2}\./, 'última alt não pode conter número da próxima questão')

const g = parseGabarito(gabaritoSample)
console.log('Gabarito:', [...g.entries()])
assert.equal(g.get(1), 2) // C = index 2
assert.equal(g.get(2), 2)
assert.equal(g.get(3), 2)

console.log('\n✓ smoke test passou')
