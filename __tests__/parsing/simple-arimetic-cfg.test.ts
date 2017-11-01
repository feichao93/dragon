import {
  alter,
  literal,
  plus,
  Reg,
  Cfg,
  CfgBuilder,
  terminal,
  nonterminal,
  token as t,
} from '../../src'

describe('context free grammar for simple arithmetic', () => {
  // exp -> exp addop term
  //      | term
  // terminal addop -> +|-
  // term -> term mulop factor
  //       | factor
  // terminal mulop -> '*'
  // factor -> '(' exp ')'
  //         | number
  // terminal number -> (0|1|2|3|4|5|6|7|8|9)+
  const builder = new CfgBuilder('simpe-arithmetic')

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

  const cfg: Cfg = builder.get()

  test('start', () => {
    expect(cfg.start).toBe('exp')
  })

  test('nonterminals', () => {

    expect(cfg.nonterminals.size).toBe(3)

    const expRules = cfg.nonterminals.get('exp')!.rules
    expect(expRules).toHaveLength(2)
    expect(expRules).toContainEqual([
      nonterminal('exp'), terminal('addop'), nonterminal('term')
    ])
    expect(expRules).toContainEqual([
      nonterminal('term')
    ])

    const termRules = cfg.nonterminals.get('term')!.rules
    expect(termRules).toHaveLength(2)
    expect(termRules).toContainEqual([
      nonterminal('term'), terminal('mulop'), nonterminal('factor')
    ])

    const factorRules = cfg.nonterminals.get('factor')!.rules
    expect(factorRules).toHaveLength(2)
    expect(factorRules).toContainEqual([
      t('('), nonterminal('exp'), t(')')
    ])
    expect(factorRules).toContainEqual([
      terminal('number')
    ])
  })

  test('terminals', () => {
    expect(cfg.terminals.size).toBe(3)
    expect(Reg.stringify(cfg.terminals.get('addop')!.reg)).toBe('+|-')
    expect(Reg.stringify(cfg.terminals.get('mulop')!.reg)).toBe('*|/')
    expect(Reg.stringify(cfg.terminals.get('number')!.reg)).toBe('(0|1|2|3|4|5|6|7|8|9)+')
  })
})
