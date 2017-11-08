import * as invariant from 'invariant'
import Grammar, { GrammarSymbol } from 'parsing/Grammar'
import { addAll, DefaultMap, endMarker, epsilon } from 'basic'

export type SymbolOfFirstSet = GrammarSymbol.Token | GrammarSymbol.Terminal | epsilon
export type SymbolOfFollowSet = GrammarSymbol.Token | GrammarSymbol.Terminal | endMarker
export type FirstSetMap = ReadonlyMap<string, ReadonlySet<SymbolOfFirstSet>>
export type FollowSetMap = FirstSetMap

export type CommonPrefixInfo = {
  name: string,
  rule1Raw: string,
  rule2Raw: string,
  commonSymbols: GrammarSymbol[]
}[]

export function getCommonPrefixInfo(grammar: Grammar): CommonPrefixInfo {
  const result: CommonPrefixInfo = []
  for (const n of grammar.nonterminals.values()) {
    for (let i = 0; i < n.rules.length; i++) {
      const { raw: raw1, parsedItems: items1 } = n.rules[i]
      for (let j = i + 1; j < n.rules.length; j++) {
        const { raw: raw2, parsedItems: items2 } = n.rules[j]
        let t = 0;
        while (t < items1.length && t < items2.length) {
          const item1 = items1[t]
          const item2 = items2[t]
          const option1 = item1.type === 'token' && item2.type === 'token' && item1.token === item2.token
          const option2 = item1.type === 'terminal' && item2.type === 'terminal' && item1.name === item2.name
          const option3 = item1.type === 'nonterminal' && item2.type === 'nonterminal' && item1.name === item2.name
          const common = option1 || option2 || option3
          if (!common) {
            break
          }
          t++
        }
        if (t > 0) {
          result.push({
            name: n.name,
            rule1Raw: raw1,
            rule2Raw: raw2,
            commonSymbols: items1.slice(0, t),
          })
        }
      }
    }
  }
  return result
}

export interface LeftRecursionInfo {
  result: boolean,
  loops: Set<string>
}

export function getLeftRecursionInfo(grammar: Grammar): LeftRecursionInfo {
  const edges = new DefaultMap<string, Set<string>>(() => new Set())
  for (const { name, rules } of grammar.nonterminals.values()) {
    for (const { isEpsilon, parsedItems: [firstItem] } of rules) {
      // TODO 这里isEpsilon为true的话 处理方式是不是得改变一下?
      if (!isEpsilon && firstItem.type === 'nonterminal') {
        edges.get(name).add(firstItem.name)
      }
    }
  }

  const loops: string[] = []
  for (const startName of grammar.nonterminals.keys()) {
    loops.push(...getNonterminalLoopsFromStart(startName, edges))
  }

  return {
    result: loops.length > 0,
    loops: new Set(loops),
  }
}

function getNonterminalLoopsFromStart(startName: string, edges: ReadonlyMap<string, ReadonlySet<string>>) {
  const stack: string[] = []
  const loops: string[] = []

  const fn = (name: string) => {
    stack.push(name)
    for (const next of edges.get(name)!) {
      if (next === startName) {
        loops.push(stack.concat(next).join('->'))
      } else if (!stack.includes(next)) {
        fn(next)
      }
    }
    stack.pop()
  }

  fn(startName)
  return loops
}

/** 计算grammar中所有non-terminal的 FIRST集合 */
export function getFirstSetMap<T>(grammar: Grammar): FirstSetMap {
  invariant(!getLeftRecursionInfo(grammar).result, 'Left recursion detected')
  const cache = new Map<string, Set<SymbolOfFirstSet>>()
  for (const nonterminalName of grammar.nonterminals.keys()) {
    getFirstSet(grammar, nonterminalName, cache)
  }
  return cache
}

/** 获取grammar中一个non-terminal的 FIRST集合 */
export function getFirstSet<T>(
  grammar: Grammar,
  nonterminalName: string,
  cache: Map<string, Set<SymbolOfFirstSet>> = new Map(),
): Set<SymbolOfFirstSet> {
  if (!cache.has(nonterminalName)) {
    const nonterminal = grammar.nonterminals.get(nonterminalName)!
    const result: Set<SymbolOfFirstSet> = new Set()
    for (const { isEpsilon, parsedItems: [firstItem] } of nonterminal.rules) {
      if (isEpsilon) {
        result.add(epsilon)
      } else {
        if (firstItem.type === 'nonterminal') {
          addAll(getFirstSet(grammar, firstItem.name, cache), result)
        } else if (firstItem.type === 'token') {
          result.add(firstItem)
        } else {
          result.add({ ...firstItem, alias: '' })
        }
      }
    }
    cache.set(nonterminalName, result)
  }
  return cache.get(nonterminalName)!
}

/** 计算grammar中所有non-terminal的 FOLLOW集合 */
export function getFollowSetMap<T>(
  grammar: Grammar,
  firstSetMap: FirstSetMap,
): FollowSetMap {
  // 构建一个有向图: 每个节点表示一个non-terminal
  // 一条从节点A指向节点B的边表示: FOLLOW(B) 包含 FOLLOW(A)
  // 每当FOLLOW(A)更新的时候, 找到所有从A出发的边并更新结点B
  // TODO
  return new Map()
}
