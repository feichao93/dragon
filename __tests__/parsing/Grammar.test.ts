import GrammarBuilder from 'parsing/GammarBuilder'
import { epsilon } from '../../src/basic'

test('get left recursion info of grammar simple-arithmetic', () => {
  const grammar = new GrammarBuilder('simple-arithmetic')
    .terminal('addop', '\\+|-')
    .terminal('mulop', '\\*|/')
    .terminal('number', '[0-9]+')
    .nonterminal('exp', ':exp :addop :term', /* TODO translate action */)
    .nonterminal('exp', '::term')
    .nonterminal('term', ':term :mulop :factor', /* TODO translate action */)
    .nonterminal('term', '::factor')
    .nonterminal('factor', '( ::exp )')
    .nonterminal('factor', '::number')
    .build()

  expect(grammar.getLeftRecursionInfo())
    .toEqual({
      result: true,
      loops: new Set([
        'exp->exp',
        'term->term',
      ]),
    })
})

test('simple-arithmetic after left-recursion elimination', () => {
  const grammar = new GrammarBuilder('test-grammar')
    .terminal('number', '[0-9]+')
    .nonterminal('E', ':T :E_1')
    .nonterminal('E_1', '+ :T :E_1')
    .nonterminalEpsilon('E_1')
    .nonterminal('T', ':F :T_1')
    .nonterminal('T_1', '* :F :T_1')
    .nonterminal('F', '( ::E )')
    .nonterminal('F', '::number')
    .build()

  expect(grammar.getLeftRecursionInfo())
    .toEqual({ result: false })
})

test('Long left-recursion chain', () => {
  const grammar = new GrammarBuilder('test-grammar')
    .nonterminal('A', ':B :C :D')
    .nonterminal('A', ':C')
    .nonterminal('B', ':D :A')
    .nonterminal('B', ':D :D :A')
    .nonterminal('C', ':B :B')
    .nonterminal('D', ':A')
    .build()
  expect(grammar.getLeftRecursionInfo())
    .toEqual({
      result: true,
      loops: new Set([
        Array.from('ACBDA').join('->'),
        Array.from('CBDAC').join('->'),
        Array.from('BDACB').join('->'),
        Array.from('DACBD').join('->'),
        Array.from('ABDA').join('->'),
        Array.from('BDAB').join('->'),
        Array.from('DABD').join('->'),
      ]),
    })
})
