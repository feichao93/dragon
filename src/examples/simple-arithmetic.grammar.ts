import GrammarBuilder from 'parsing/GammarBuilder'
import Grammar from 'parsing/Grammar'

export const leftRecursionRemoved: Grammar = new GrammarBuilder('simple-arithmetic-left-recursion-removed')
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

export const grammar: Grammar = new GrammarBuilder('simple-arithmetic')
  .terminal('id', '[a-zA-Z0-9]+')
  .nonterminal('E', ':E + :T')
  .nonterminal('E', ':T')
  .nonterminal('T', ':T * :F')
  .nonterminal('T', ':F')
  .nonterminal('F', '( :E )')
  .nonterminal('F', ':id')
  .build()
