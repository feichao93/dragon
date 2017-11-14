import SLR1Parser from 'parsing/SLR1Parser'
import { grammar as simpleArithmeticGrammar } from 'examples/simple-arithmetic.grammar'

describe('SLR(1) Parser', () => {
  const parser = SLR1Parser.fromGrammar(simpleArithmeticGrammar)

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
