import GrammarBuilder from 'parsing/GammarBuilder'
import LL1Parser from 'parsing/LL1Parser'
import { endmarker } from 'basic'

describe('LL(1) Parser', () => {
  const grammar = new GrammarBuilder('')
    .terminal('id', '[a-zA-Z0-9]+')
    .nonterminal('E', ':T :E_1')
    .nonterminal('E_1', '+ :T :E_1')
    .nonterminalEpsilon('E_1')
    .nonterminal('T', ':F :T_1')
    .nonterminal('T_1', '* :F :T_1')
    .nonterminalEpsilon('T_1')
    .nonterminal('F', '( :E )')
    .nonterminal('F', ':id')
    .build()
  const parser = LL1Parser.fromGrammar(grammar)

  const parseResult = Array.from(parser.parse([':id', '+', ':id', '*', ':id', endmarker]))

  test('parse `:id + :id * :id`', () => {
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
