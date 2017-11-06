import { Cfg, CfgBuilder, CfgSymbol, Reg } from '../../src'

describe('test CfgBuilder.parseRawRule', () => {
  test('parse `:exp`', () => {
    expect(CfgBuilder.parseRawRule(':exp'))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: '' },
      ] as CfgSymbol.SymbolMaybeUnknown[])
  })

  test('parse `e:exp`', () => {
    expect(CfgBuilder.parseRawRule('e:exp'))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: 'e' },
      ] as CfgSymbol.SymbolMaybeUnknown[])
  })

  test('parse `:exp :addop :term`', () => {
    expect(CfgBuilder.parseRawRule(`:exp :addop :term`))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: '' },
        { type: 'unknown', name: 'addop', alias: '' },
        { type: 'unknown', name: 'term', alias: '' },
      ] as CfgSymbol.SymbolMaybeUnknown[])
  })

  test('parse `( ::exp )`', () => {
    expect(CfgBuilder.parseRawRule(`( ::exp )`))
      .toEqual([
        { type: 'token', token: '(' },
        { type: 'unknown', name: 'exp', alias: CfgBuilder.defaultAlias },
        { type: 'token', token: ')' },
      ] as CfgSymbol.SymbolMaybeUnknown[])
  })

  test('parse `if s1:stmt then s2:stmt`', () => {
    expect(CfgBuilder.parseRawRule(`if s1:stmt then s2:stmt`))
      .toEqual([
        { type: 'token', token: 'if' },
        { type: 'unknown', name: 'stmt', alias: 's1' },
        { type: 'token', token: 'then' },
        { type: 'unknown', name: 'stmt', alias: 's2' },
      ] as CfgSymbol.SymbolMaybeUnknown[])
  })
})

describe('context free grammar for simple arithmetic', () => {
  const { N, T, t } = Cfg
  // exp -> exp addop term
  //      | term
  // addop -> '+' | '/'
  // term -> term mulop factor
  //       | factor
  // mulop -> '*' | '/'
  // factor -> '(' exp ')'
  //         | number
  // number -> [0-9]+
  const builder = new CfgBuilder('simple-arithmetic')
    .terminal('addop', '\\+|-')
    .terminal('mulop', '\\*|/')
    .terminal('number', '[0-9]+')
    .nonterminal('exp', `:exp :addop :term`, /* TODO translate action */)
    .nonterminal('exp', `::term`)
    .nonterminal('term', `:term :mulop :factor`, /* TODO translate action */)
    .nonterminal('term', `::factor`)
    .nonterminal('factor', `( ::exp )`)
    .nonterminal('factor', `::number`)

  const cfg = builder.build()

  test('cfgName', () => {
    expect(cfg.cfgName).toBe('simple-arithmetic')
  })

  test('start symbol', () => {
    expect(cfg.start).toBe('exp')
  })

  test('count of nonterminals', () => {
    expect(cfg.nonterminals.size).toBe(3)
  })

  test('nonterminal exp', () => {
    const exp = cfg.nonterminals.get('exp')!
    expect(exp.name).toBe('exp')
    expect(exp.rules).toEqual([
      {
        raw: ':exp :addop :term',
        parsedItems: [N(':exp'), T(':addop'), N(':term')],
      },
      {
        raw: '::term',
        parsedItems: [N('::term')],
      }
    ])
  })

  test('nonterminal term', () => {
    const term = cfg.nonterminals.get('term')!
    expect(term.name).toBe('term')
    expect(term.rules).toEqual([
      {
        raw: ':term :mulop :factor',
        parsedItems: [N(':term'), T(':mulop'), N(':factor')]
      },
      {
        raw: '::factor',
        parsedItems: [N('::factor')]
      }
    ])
  })

  test('nonterminal factor', () => {
    const factor = cfg.nonterminals.get('factor')!
    expect(factor.name).toBe('factor')
    expect(factor.rules).toEqual([
      {
        raw: '( ::exp )',
        parsedItems: [t('('), N('::exp'), t(')')],
      },
      {
        raw: '::number',
        parsedItems: [T('::number')],
      }
    ])
  })

  test('count of terminals', () => {
    expect(cfg.terminals.size).toBe(3)
  })

  test('terminal addop', () => {
    const addopReg = cfg.terminals.get('addop')!
    expect(addopReg.name).toBe('addop')
    expect(Reg.stringify(addopReg.reg)).toBe('+|-')
  })

  test('terminal mulop', () => {
    const mulopReg = cfg.terminals.get('mulop')!
    expect(mulopReg.name).toBe('mulop')
    expect(Reg.stringify(mulopReg.reg)).toBe('*|/')
  })

  test('terminal number', () => {
    const numberReg = cfg.terminals.get('number')!
    expect(numberReg.name).toBe('number')
    expect(Reg.stringify(numberReg.reg)).toBe('[0-9]+')
  })
})
