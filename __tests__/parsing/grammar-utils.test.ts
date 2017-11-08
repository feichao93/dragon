import { endMarker, epsilon } from 'basic'
import GrammarBuilder from 'parsing/GammarBuilder'
import Grammar from 'parsing/Grammar'
import {
  getCommonPrefixInfo,
  getFirstSetMap,
  getFollowSetMap,
  getLeftRecursionInfo,
  SymbolOfFirstSet,
  SymbolOfFollowSet,
} from 'parsing/grammar-utils'

const { N, T, t } = Grammar

function set(...args: (SymbolOfFirstSet | SymbolOfFollowSet)[]) {
  return new Set(args)
}

describe('grammar of simple-arithmetic', () => {
  const grammar = new GrammarBuilder('simple-arithmetic')
    .terminal('addop', '\\+|-')
    .terminal('mulop', '\\*|/')
    .terminal('number', '[0-9]+')
    .nonterminal('exp', ':exp :addop :term')
    .nonterminal('exp', '::term')
    .nonterminal('term', ':term :mulop :factor')
    .nonterminal('term', '::factor')
    .nonterminal('factor', '( ::exp )')
    .nonterminal('factor', '::number')
    .build()

  test('left-recursion-info', () => {
    expect(getLeftRecursionInfo(grammar))
      .toEqual({
        result: true,
        loops: new Set([
          'exp->exp',
          'term->term',
        ]),
      })
  })

  test('common-prefix-info', () => {
    expect(getCommonPrefixInfo(grammar)).toEqual([])
  })

  test('FIRST', () => {
    expect(() => getFirstSetMap(grammar))
      .toThrow('Left recursion detected')
  })
})

describe('simple-arithmetic after left-recursion elimination ( 4.28 in dragon book)', () => {
  const grammar = new GrammarBuilder('')
    .terminal('id', '[a-zA-Z0-9]+')
    .nonterminal('E', ':T :E_1')
    .nonterminal('E_1', '+ :T :E_1')
    .nonterminalEpsilon('E_1')
    .nonterminal('T', ':F :T_1')
    .nonterminal('T_1', '* :F :T_1')
    .nonterminalEpsilon('T_1')
    .nonterminal('F', '( ::E )')
    .nonterminal('F', '::id')
    .build()

  test('left-recursion-info', () => {
    expect(getLeftRecursionInfo(grammar))
      .toEqual({ result: false, loops: new Set() })
  })

  test('common-prefix-info', () => {
    expect(getCommonPrefixInfo(grammar)).toEqual([])
  })

  test('FIRST', () => {
    const firstSetMap = getFirstSetMap(grammar)
    expect(firstSetMap.size).toBe(5)
    expect(firstSetMap.get('E')).toEqual(set(t('('), T(':id')))
    expect(firstSetMap.get('E_1')).toEqual(set(t('+'), epsilon))
    expect(firstSetMap.get('T')).toEqual(set(t('('), T(':id')))
    expect(firstSetMap.get('T_1')).toEqual(set(t('*'), epsilon))
    expect(firstSetMap.get('F')).toEqual(set(t('('), T(':id')))
  })

  // test('FOLLOW', () => {
  //   const followSetMap = getFollowSetMap(grammar, getFirstSetMap(grammar))
  //   expect(followSetMap.size).toBe(5)
  //   expect(followSetMap.get('E')).toEqual(set(t(')'), endMarker))
  //   expect(followSetMap.get('E_1')).toEqual(set(t(')'), endMarker))
  //   expect(followSetMap.get('T')).toEqual(set(t('+'), t(')'), endMarker))
  //   expect(followSetMap.get('T_1')).toEqual(set(t('+'), t(')'), endMarker))
  //   expect(followSetMap.get('F')).toEqual(set(t('+'), t('*'), t(')'), endMarker))
  // })
})

describe('A hypothesis grammar', () => {
  const grammar = new GrammarBuilder('')
    .nonterminal('A', ':B :C :D')
    .nonterminal('A', ':C')
    .nonterminal('B', ':D :A')
    .nonterminal('B', ':D :D :A')
    .nonterminal('C', ':B :B')
    .nonterminal('D', ':A')
    .build()

  test('left-recursion-info', () => {
    expect(getLeftRecursionInfo(grammar))
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

  test('common-prefix-info', () => {
    expect(getCommonPrefixInfo(grammar))
      .toEqual([{
        name: 'B',
        rule1Raw: ':D :A',
        rule2Raw: ':D :D :A',
        commonSymbols: [N(':D')],
      }])
  })

  test('FIRST', () => {
    expect(() => getFirstSetMap(grammar))
      .toThrow('Left recursion detected')
  })
})
