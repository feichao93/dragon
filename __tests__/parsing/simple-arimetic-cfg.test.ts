import { alter, literal, plus, Reg } from '../../build/scanning/Reg'
import { default as Cfg, CfgBuilder, token as t, terminal, nonterminal } from '../../build/parsing/Cfg'
import { getDictSize } from '../../build/basic'

// exp -> exp addop term
//      | term
// terminal addop -> +|-
// term -> term mulop factor
//       | factor
// terminal mulop -> '*'
// factor -> '(' exp ')'
//         | number
// terminal number -> (0|1|2|3|4|5|6|7|8|9)+
const builder = new CfgBuilder()

builder.defineNonterminal('exp',
  ['exp', 'addop', 'term'],
  ['term'],
)
builder.defineTerminal('addop', alter(literal('+'), literal('-')))
builder.defineNonterminal('term',
  ['term', 'mulop', 'factor'],
  ['factor'],
)
builder.defineTerminal('mulop', alter(literal('*'), literal('/')))
builder.defineNonterminal('factor',
  [t('('), 'exp', t(')')],
  ['number'],
)
builder.defineTerminal('number', plus(alter(...'0123456789'.split('').map(literal))))

const cfg: Cfg = builder.cfg('simpe-arithmetic')

test('start', () => {
  expect(cfg.start).toBe('exp')
})

test('nonterminals', () => {

  expect(getDictSize(cfg.nonterminals)).toBe(3)

  const expRules = cfg.nonterminals['exp'].rules
  expect(expRules).toHaveLength(2)
  expect(expRules).toContainEqual([
    nonterminal('exp'), terminal('addop'), nonterminal('term')
  ])
  expect(expRules).toContainEqual([
    nonterminal('term')
  ])

  const termRules = cfg.nonterminals['term'].rules
  expect(termRules).toHaveLength(2)
  expect(termRules).toContainEqual([
    nonterminal('term'), terminal('mulop'), nonterminal('factor')
  ])

  const factorRules = cfg.nonterminals['factor'].rules
  expect(factorRules).toHaveLength(2)
  expect(factorRules).toContainEqual([
    t('('), nonterminal('exp'), t(')')
  ])
  expect(factorRules).toContainEqual([
    terminal('number')
  ])
})

test('terminals', () => {
  expect(getDictSize(cfg.terminals)).toBe(3)
  expect(Reg.stringify(cfg.terminals['addop'].reg)).toBe('+|-')
  expect(Reg.stringify(cfg.terminals['mulop'].reg)).toBe('*|/')
  expect(Reg.stringify(cfg.terminals['number'].reg)).toBe('(0|1|2|3|4|5|6|7|8|9)+')
})
