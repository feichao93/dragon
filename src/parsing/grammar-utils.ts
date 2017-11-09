import * as invariant from 'invariant'
import Grammar, { GrammarSymbol } from 'parsing/Grammar'
import { addAll, DefaultMap, endmarker, epsilon } from 'basic'

export type SymbolOfFirstSet = GrammarSymbol.Token | GrammarSymbol.Terminal | epsilon
export type SymbolOfFollowSet = GrammarSymbol.Token | GrammarSymbol.Terminal | endmarker
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
  // Dragon book page 221: To compute FOLLOW(A) for all nonterminals A,
  // apply the following rules until nothing can be added to any FOLLOW set.
  // 1) Place $ in FOLLOW(S), where S is the start symbol, and $ is the input
  //  right endmarker.
  // 2) If there is a production A ⟶ αBβ, then everything in FIRST(β)
  //  expect ϵ is in FOLLOW(B).
  // 3) If there is a production A ⟶ αB, or a production a ⟶ αBβ, where
  //  FIRST(β) contains ϵ, then everything in FOLLOW(A) is in FOLLOW(B).

  // 实现思路: 构建一个有向图, 每个节点表示一个non-terminal
  // 一条从节点A指向节点B的边表示: FOLLOW(B) 包含 FOLLOW(A)
  // 每当FOLLOW(A)更新的时候, 找到所有从A出发的边并更新结点B
  const graph = new CascadeSetMap<SymbolOfFollowSet>()
  // Apply rule-1
  graph.add(endmarker, grammar.start)

  for (const A of grammar.nonterminals.values()) {
    for (const { isEpsilon, parsedItems } of A.rules) {
      if (!isEpsilon) {
        for (let i = 0; i < parsedItems.length; i++) {
          // A ⟶ αBβ
          const B = parsedItems[i]
          if (B.type === 'nonterminal') {
            // const alpha = parsedItems.slice(0, i)
            const beta = parsedItems.slice(i + 1)
            const firstOfBeta = getFirstSetOfSymbolSequence(beta, firstSetMap)
            if (firstOfBeta.has(epsilon) && A.name !== B.name) {
              // Apply rule-3
              graph.addEdge(A.name, B.name)
            }
            // Apply rule-2
            firstOfBeta.delete(epsilon)
            graph.cascadeAddAll(firstOfBeta, B.name)
          }
        }
      }
    }
  }
  return graph.setMap
}

/** 获取一个symbol sequence的 FIRST集合 */
export function getFirstSetOfSymbolSequence(
  symbolSequence: ReadonlyArray<Readonly<GrammarSymbol>>,
  firstSetMap: FirstSetMap,
): Set<SymbolOfFirstSet> {
  const result = new Set<SymbolOfFirstSet>()
  for (const symbol of symbolSequence) {
    if (symbol.type === 'token' || symbol.type === 'terminal') {
      result.add(symbol)
      return result
    } else { // symbol.type === 'nonterminal'
      const firstSet = firstSetMap.get(symbol.name)!
      addAll(firstSet, result)
      if (!firstSet.has(epsilon)) {
        return result
      }
    }
  }
  result.add(epsilon)
  return result
}

class CascadeSetMap<T> {
  readonly setMap: DefaultMap<string, Set<T>>
  private edges = new DefaultMap<string, Set<string>>(() => new Set())

  constructor() {
    this.setMap = new DefaultMap<string, Set<T>>(() => new Set())
  }

  addEdge(from: string, to: string) {
    this.edges.get(from).add(to)
    this.cascadeAddAll(this.setMap.get(from), to)
  }

  add(item: T, targetName: string) {
    this.setMap.get(targetName).add(item)
  }

  cascadeAddAll(source: Set<T>, targetName: string) {
    for (const name of this.getRelated(targetName)) {
      addAll(source, this.setMap.get(name)!)
    }
  }

  private getRelated(start: string) {
    const result = new Set<string>()
    let cntSet = new Set<string>()
    cntSet.add(start)

    while (cntSet.size > 0) {
      const nextSet = new Set<string>()
      for (const name of cntSet) {
        for (const next of this.edges.get(name)) {
          if (!result.has(next) && !cntSet.has(next)) {
            nextSet.add(next)
          }
        }
        result.add(name)
      }
      cntSet = nextSet
    }
    return result
  }
}
