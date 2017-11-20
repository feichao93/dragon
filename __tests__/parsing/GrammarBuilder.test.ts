import { Reg } from 'scanning/Reg'
import Grammar from 'parsing/Grammar'
import GrammarBuilder from 'parsing/GammarBuilder'
import { GSInRawRule } from 'parsing/GrammarSymbol'

describe('test GrammarBuilder.parseRawRule', () => {
  test('parse `:exp`', () => {
    expect(GrammarBuilder.parseRawRule(':exp'))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: '' },
      ] as GSInRawRule[])
  })

  test('parse `e:exp`', () => {
    expect(GrammarBuilder.parseRawRule('e:exp'))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: 'e' },
      ] as GSInRawRule[])
  })

  test('parse `:exp :addop :term`', () => {
    expect(GrammarBuilder.parseRawRule(`:exp :addop :term`))
      .toEqual([
        { type: 'unknown', name: 'exp', alias: '' },
        { type: 'unknown', name: 'addop', alias: '' },
        { type: 'unknown', name: 'term', alias: '' },
      ] as GSInRawRule[])
  })

  test('parse `( ::exp )`', () => {
    expect(GrammarBuilder.parseRawRule(`( ::exp )`))
      .toEqual([
        { type: 'literal', chars: '(' },
        { type: 'unknown', name: 'exp', alias: GrammarBuilder.defaultAlias },
        { type: 'literal', chars: ')' },
      ] as GSInRawRule[])
  })

  test('parse `if s1:stmt then s2:stmt`', () => {
    expect(GrammarBuilder.parseRawRule(`if s1:stmt then s2:stmt`))
      .toEqual([
        { type: 'literal', chars: 'if' },
        { type: 'unknown', name: 'stmt', alias: 's1' },
        { type: 'literal', chars: 'then' },
        { type: 'unknown', name: 'stmt', alias: 's2' },
      ] as GSInRawRule[])
  })
})

describe('context free grammar for simple arithmetic', () => {
  const { N, T, literal } = Grammar
  // exp -> exp addop term
  //      | term
  // addop -> '+' | '/'
  // term -> term mulop factor
  //       | factor
  // mulop -> '*' | '/'
  // factor -> '(' exp ')'
  //         | number
  // number -> [0-9]+
  const builder = new GrammarBuilder('simple-arithmetic')
    .terminal('addop', '\\+|-')
    .terminal('mulop', '\\*|/')
    .terminal('number', '[0-9]+')
    .nonterminal('exp', `:exp :addop :term`)
    .nonterminal('exp', `::term`)
    .nonterminal('term', `:term :mulop :factor`)
    .nonterminal('term', `::factor`)
    .nonterminal('factor', `( ::exp )`)
    .nonterminal('factor', `::number`)

  const grammar = builder.build()

  test('grammarName', () => {
    expect(grammar.grammarName).toBe('simple-arithmetic')
  })

  test('start symbol', () => {
    expect(grammar.start).toBe('exp')
  })

  test('count of nonterminals', () => {
    expect(grammar.nonterminals.size).toBe(3)
  })

  test('nonterminal exp', () => {
    const exp = grammar.nonterminals.get('exp')!
    expect(exp.name).toBe('exp')
    expect(exp.rules).toEqual([
      {
        isEpsilon: false,
        raw: ':exp :addop :term',
        parsedItems: [N(':exp'), T(':addop'), N(':term')],
      },
      {
        isEpsilon: false,
        raw: '::term',
        parsedItems: [N('::term')],
      }
    ])
  })

  test('nonterminal term', () => {
    const term = grammar.nonterminals.get('term')!
    expect(term.name).toBe('term')
    expect(term.rules).toEqual([
      {
        isEpsilon: false,
        raw: ':term :mulop :factor',
        parsedItems: [N(':term'), T(':mulop'), N(':factor')]
      },
      {
        isEpsilon: false,
        raw: '::factor',
        parsedItems: [N('::factor')]
      }
    ])
  })

  test('nonterminal factor', () => {
    const factor = grammar.nonterminals.get('factor')!
    expect(factor.name).toBe('factor')
    expect(factor.rules).toEqual([
      {
        isEpsilon: false,
        raw: '( ::exp )',
        parsedItems: [literal('('), N('::exp'), literal(')')],
      },
      {
        isEpsilon: false,
        raw: '::number',
        parsedItems: [T('::number')],
      }
    ])
  })

  test('count of terminals', () => {
    expect(grammar.terminals.size).toBe(3)
  })

  test('terminal addop', () => {
    const addopReg = grammar.terminals.get('addop')!
    expect(addopReg.name).toBe('addop')
    expect(Reg.stringify(addopReg.reg)).toBe('+|-')
  })

  test('terminal mulop', () => {
    const mulopReg = grammar.terminals.get('mulop')!
    expect(mulopReg.name).toBe('mulop')
    expect(Reg.stringify(mulopReg.reg)).toBe('*|/')
  })

  test('terminal number', () => {
    const numberReg = grammar.terminals.get('number')!
    expect(numberReg.name).toBe('number')
    expect(Reg.stringify(numberReg.reg)).toBe('[0-9]+')
  })
})
