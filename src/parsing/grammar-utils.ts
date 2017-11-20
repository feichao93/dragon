import Grammar, { GrammarNonterminal } from 'parsing/Grammar'
import { GSInFirst, GSInFirstOfSequence, GSInFollow, GSInRule, GSWithLookahead } from 'parsing/GrammarSymbol'
import CascadeSetMap from 'common/CascadeSetMap'
import { addAll, DefaultMap, hasEpsilon, range } from 'common/basic'

export type ReadonlySetMap<T> = ReadonlyMap<string, ReadonlySet<T>>

export type CommonPrefixInfo = {
  name: string,
  rule1Raw: string,
  rule2Raw: string,
  commonSymbols: GSInRule[]
}[]

export function getCommonPrefixInfo(grammar: Grammar): CommonPrefixInfo {
  const result: CommonPrefixInfo = []
  for (const n of grammar.nonterminals.values()) {
    for (const i of range(n.rules.length)) {
      const { raw: raw1, parsedItems: items1 } = n.rules[i]
      for (const j of range(i + 1, n.rules.length)) {
        const { raw: raw2, parsedItems: items2 } = n.rules[j]
        let t = 0;
        while (t < items1.length && t < items2.length) {
          const item1 = items1[t]
          const item2 = items2[t]
          const option1 = item1.type === 'literal' && item2.type === 'literal' && item1.chars === item2.chars
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

/** 计算grammar中有哪些nonterminal可以推导出epsilon */
export function getEpsilonable(grammar: Grammar) {
  function canDerivedToEpsilonNow(nonterminal: GrammarNonterminal, cntResult: Set<string>) {
    for (const rule of nonterminal.rules) {
      if (rule.isEpsilon
        || rule.parsedItems.every(item =>
          item.type === 'nonterminal' && cntResult.has(item.name))
      ) {
        return true
      }
    }
    return false
  }

  // A set to record whether a nonterminal can be derived to epsilon
  let cntSet = new Set<string>()
  for (const nonterminal of grammar.nonterminals.values()) {
    for (const rule of nonterminal.rules) {
      if (rule.isEpsilon) {
        cntSet.add(nonterminal.name)
      }
    }
  }

  const result = new Set<string>()
  while (cntSet.size > 0) {
    const nextSet = new Set<string>()
    for (const nonterminalName of cntSet) {
      result.add(nonterminalName)
    }
    for (const [nonterminalName, nonterminal] of grammar.nonterminals) {
      if (!result.has(nonterminalName) && canDerivedToEpsilonNow(nonterminal, result)) {
        nextSet.add(nonterminalName)
      }
    }
    cntSet = nextSet
  }

  return result
}

/** 计算grammar中所有non-terminal的 FIRST集合 */
export function calculateFirstSetMap(grammar: Grammar): ReadonlySetMap<GSInFirst> {
  const epsilonable = getEpsilonable(grammar)

  const graph = new CascadeSetMap<GSInFirst>()

  // 在这里加入所有的epsilon. 后面就不需要再次添加epsilon了.
  for (const nonterminalName of epsilonable) {
    graph.add(nonterminalName, { type: 'epsilon' })
  }

  for (const [nonterminalName, nonterminal] of grammar.nonterminals) {
    for (const rule of nonterminal.rules) {
      // 如果rule.isEpsilon为true, 那么这里rule.parsedItems为空数组, 结果仍然是正确的
      for (const item of rule.parsedItems) {
        if (item.type === 'nonterminal') {
          graph.addEdge(item.name, nonterminalName)
          if (epsilonable.has(item.name)) {
            continue
          }
        } else { // literal or terminal
          graph.add(nonterminalName, item)
        }
        break
      }
    }
  }

  return graph.cascade()
}

/** 计算grammar中所有non-terminal的 FOLLOW集合 */
export function calculateFollowSetMap<T>(
  grammar: Grammar,
  firstSetMap: ReadonlySetMap<GSInFirst>,
): ReadonlySetMap<GSInFollow> {
  // Dragon book page 221: To compute FOLLOW(A) for all nonterminals A,
  // apply the following rules until nothing can be added to any FOLLOW set.
  // 1) Place $ in FOLLOW(S), where S is the start symbol, and $ is the input
  //  right endmarker.
  // 2) If there is a production A ⟶ αBβ, then everything in FIRST(β)
  //  expect ϵ is in FOLLOW(B).
  // 3) If there is a production A ⟶ αB, or a production a ⟶ αBβ, where
  //  FIRST(β) contains ϵ, then everything in FOLLOW(A) is in FOLLOW(B).
  const graph = new CascadeSetMap<GSInFollow>()
  // Apply rule-1
  graph.add(grammar.start, { type: 'endmarker' })

  for (const A of grammar.nonterminals.values()) {
    for (const { isEpsilon, parsedItems } of A.rules) {
      if (!isEpsilon) {
        for (const i of range(parsedItems.length)) {
          // A ⟶ αBβ
          const B = parsedItems[i]
          if (B.type === 'nonterminal') {
            // const alpha = parsedItems.slice(0, i)
            const beta = parsedItems.slice(i + 1)
            const firstOfBeta = getFirstSetOfSymbolSequence(beta, firstSetMap)
            if (hasEpsilon(firstOfBeta) && A.name !== B.name) {
              // Apply rule-3
              graph.addEdge(A.name, B.name)
            }
            // Apply rule-2
            for (const symbol of firstOfBeta) {
              if (symbol.type !== 'epsilon') {
                graph.add(B.name, symbol)
              }
            }
          }
        }
      }
    }
  }
  return graph.cascade()
}

/** 获取一个symbol sequence的 FIRST集合 */
export function getFirstSetOfSymbolSequence(
  symbolSequence: ReadonlyArray<Readonly<GSWithLookahead>>,
  firstSetMap: ReadonlySetMap<GSInFirst>,
): Set<GSInFirstOfSequence> {
  const result = new Set<GSInFirstOfSequence>()
  for (const symbol of symbolSequence) {
    if (symbol.type === 'nonterminal') {
      const firstSet = firstSetMap.get(symbol.name)!
      addAll(firstSet, result)
      if (!hasEpsilon(firstSet)) {
        return result
      }
    } else {
      result.add(symbol)
      return result
    }
  }
  result.add({ type: 'epsilon' })
  return result
}
