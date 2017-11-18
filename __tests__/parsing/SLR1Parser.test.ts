import SLR1Parser from 'parsing/SLR1Parser'
import { grammar as simpleArithmeticGrammar } from 'examples/simple-arithmetic.grammar'
import { default as lvrv } from 'examples/l-value-r-value.grammar'

describe('simple-arithmetic', () => {
  const parser = new SLR1Parser(simpleArithmeticGrammar)

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

test('l-value-r-value', () => {
  expect(() => new SLR1Parser(lvrv))
    .toThrow('Shift-Reduce conflict occurred. The grammar is not SLR(1)')
})
