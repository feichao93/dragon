import LL1Parser from 'parsing/LL1Parser'
import { leftRecursionRemoved as simpleArithmeticGrammar } from 'examples/simple-arithmetic.grammar'

describe('LL(1) Parser', () => {
  const parser = LL1Parser.fromGrammar(simpleArithmeticGrammar)

  test('parse `:id + :id * :id`', () => {
    const tokenDescriptors = ':id + :id * :id :endmarker'.split(' ')
    const parseResult = Array.from(parser.simpleParse(tokenDescriptors))

    expect(parseResult).toEqual([
      'apply E -> :T :E_1',
      'apply T -> :F :T_1',
      'apply F -> :id',
      'match :id',
      'apply T_1 -> ϵ',
      'apply E_1 -> + :T :E_1',
      'match +',
      'apply T -> :F :T_1',
      'apply F -> :id',
      'match :id',
      'apply T_1 -> * :F :T_1',
      'match *',
      'apply F -> :id',
      'match :id',
      'apply T_1 -> ϵ',
      'apply E_1 -> ϵ',
      'accept',
    ])
  })
})
