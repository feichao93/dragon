import { endmarker, epsilon } from 'common/basic'
import GrammarBuilder from 'parsing/GammarBuilder'
import Grammar from 'parsing/Grammar'
import {
  getCommonPrefixInfo,
  calculateFirstSetMap,
  calculateFollowSetMap,
  getLeftRecursionInfo,
  SymbolOfFirstSet,
  SymbolOfFollowSet,
} from 'parsing/grammar-utils'

const { N, T, t } = Grammar

type S = SymbolOfFirstSet | SymbolOfFollowSet

function set(...args: S[]) {
  return new Set(args)
}

function isEqual(set1: Iterable<S>, set2: Iterable<S>) {
  const arr1 = Array.from(set1)
  const arr2 = Array.from(set2)
  for (const [A, B] of [[arr1, arr2], [arr2, arr1]]) {
    for (const a of A) {
      if (typeof a === 'symbol') {
        if (!B.includes(a)) {
          return false
        }
      } else if (a.type === 'literal') {
        if (!B.some(b => (
            typeof b !== 'symbol'
            && b.type === 'literal'
            && a.chars === b.chars))) {
          return false
        }
      } else {
        if (!B.some(b => (
            typeof b !== 'symbol'
            && b.type === 'terminal'
            && a.name === b.name
          ))) {
          return false
        }
      }
    }
  }
  return true
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
    const firstSetMap = calculateFirstSetMap(grammar)
    expect(firstSetMap.size).toBe(3)
    expect(isEqual(firstSetMap.get('exp')!, set(t('('), T('::number')))).toBe(true)
    expect(isEqual(firstSetMap.get('term')!, set(t('('), T('::number')))).toBe(true)
    expect(isEqual(firstSetMap.get('factor')!, set(t('('), T('::number')))).toBe(true)
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
    const firstSetMap = calculateFirstSetMap(grammar)
    expect(firstSetMap.size).toBe(5)
    expect(isEqual(firstSetMap.get('E')!, set(t('('), T(':id')))).toBe(true)
    expect(isEqual(firstSetMap.get('E_1')!, set(t('+'), epsilon))).toBe(true)
    expect(isEqual(firstSetMap.get('T')!, set(t('('), T(':id')))).toBe(true)
    expect(isEqual(firstSetMap.get('T_1')!, set(t('*'), epsilon))).toBe(true)
    expect(isEqual(firstSetMap.get('F')!, set(t('('), T(':id')))).toBe(true)
  })

  test('FOLLOW', () => {
    const followSetMap = calculateFollowSetMap(grammar, calculateFirstSetMap(grammar))
    expect(followSetMap.size).toBe(5)
    expect(isEqual(followSetMap.get('E')!, set(t(')'), endmarker))).toBe(true)
    expect(isEqual(followSetMap.get('E_1')!, set(t(')'), endmarker))).toBe(true)
    expect(isEqual(followSetMap.get('T')!, set(t('+'), t(')'), endmarker))).toBe(true)
    expect(isEqual(followSetMap.get('T_1')!, set(t('+'), t(')'), endmarker))).toBe(true)
    expect(isEqual(followSetMap.get('F')!, set(t('+'), t('*'), t(')'), endmarker))).toBe(true)
  })
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
    const firstSetMap = calculateFirstSetMap(grammar)
    expect(firstSetMap.size).toBe(4)
    expect(firstSetMap.get('A')).toEqual(set())
    expect(firstSetMap.get('B')).toEqual(set())
    expect(firstSetMap.get('C')).toEqual(set())
    expect(firstSetMap.get('D')).toEqual(set())
  })
})
