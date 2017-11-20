import LALR1Parser from 'parsing/LALR1Parser'
import lvrv from 'examples/l-value-r-value.grammar'
import { grammar as simpleArithmeticGrammar } from 'examples/simple-arithmetic.grammar'

describe('simple-arithmetic', () => {
  const parser = new LALR1Parser(simpleArithmeticGrammar)

  test('parse `:id * :id + :id`', () => {
    const tokenDescriptors = ':id * :id + :id Symbol($)'.split(' ')
    const parseResult = Array.from(parser.simpleParse(tokenDescriptors))

    expect(parseResult).toEqual([
      'shift',
      'reduce by F -> :id',
      'reduce by T -> :F',
      'shift',
      'shift',
      'reduce by F -> :id',
      'reduce by T -> :T * :F',
      'reduce by E -> :T',
      'shift',
      'shift',
      'reduce by F -> :id',
      'reduce by T -> :F',
      'reduce by E -> :E + :T',
      'accept',
    ])
  })
})

describe('l-value-r-value', () => {
  const parser = new LALR1Parser(lvrv)

  test('parse `:id = :id`', () => {
    const tokenDescriptors = ':id = :id Symbol($)'.split(' ')
    const actual = Array.from(parser.simpleParse(tokenDescriptors))

    const expected: string [] = [
      'shift',
      'reduce by L -> :id',
      'shift',
      'shift',
      'reduce by L -> :id',
      'reduce by R -> :L',
      'reduce by S -> :L = :R',
      'accept',
    ]
    expect(actual).toEqual(expected)
  })

  test('parse `:id = * :id`', () => {
    const tokenDescriptors = ':id = * :id Symbol($)'.split(' ')
    const actual = Array.from(parser.simpleParse(tokenDescriptors))

    const expected: string [] = [
      'shift',
      'reduce by L -> :id',
      'shift',
      'shift',
      'shift',
      'reduce by L -> :id',
      'reduce by R -> :L',
      'reduce by L -> * :R',
      'reduce by R -> :L',
      'reduce by S -> :L = :R',
      'accept',
    ]
    expect(actual).toEqual(expected)
  })
})
