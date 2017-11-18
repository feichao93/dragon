import GrammarBuilder from 'parsing/GammarBuilder'
import Grammar from 'parsing/Grammar'

// Dragon book Example 4.48
// This grammar is NOT SLR(1)
// This grammar IS LALR(1) and LR(1)

const grammar: Grammar = new GrammarBuilder('l-value-r-value')
  .terminal('id', '<reg>')
  .nonterminal('S', ':L = :R')
  .nonterminal('S', ':R')
  .nonterminal('L', '* :R')
  .nonterminal('L', ':id')
  .nonterminal('R', ':L')
  .build()

export default grammar
