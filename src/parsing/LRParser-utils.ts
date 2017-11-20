import * as invariant from 'invariant'
import Grammar, { GrammarNonterminal, GrammarRule } from 'parsing/Grammar'
import { DefaultMap } from 'common/basic'
import { GSInRule } from 'parsing/GrammarSymbol'

function isAugmented(grammar: Grammar) {
  const { start, nonterminals } = grammar
  const startNonterminalRules = nonterminals.get(start)!.rules
  return startNonterminalRules.length === 1
    && startNonterminalRules[0].parsedItems.length === 1
    && startNonterminalRules[0].parsedItems[0].type === 'nonterminal'
}

export function ensureAugmented(g: Grammar) {
  if (isAugmented(g)) {
    return g
  }
  const newStart = '$' + g.start
  const newNonterminals = new Map<string, GrammarNonterminal>()
  newNonterminals.set(newStart, {
    name: newStart,
    rules: [{
      isEpsilon: false,
      raw: g.start,
      parsedItems: [{ type: 'nonterminal', alias: '', name: g.start }],
    }],
  })
  for (const [name, value] of g.nonterminals) {
    newNonterminals.set(name, value)
  }
  return new Grammar(
    g.grammarName,
    newStart,
    g.terminals,
    newNonterminals,
  )
}

export class LRAutomatonStateManager<T> {
  // The string format of a LR item set to state number
  readonly set2num = new Map<string, number>()
  // State number to LR item set
  readonly num2set = new Map<number, Set<T>>()
  private nextStateNumber = 0
  readonly grammar: Grammar
  stringify: (LRItem: T) => string

  constructor(grammar: Grammar, stringify: (LRItem: T) => string) {
    this.grammar = grammar
    this.stringify = stringify
  }

  getStateNumber(items: Set<T>) {
    const str = Array.from(items).map(this.stringify).sort().join(':')
    if (!this.set2num.has(str)) {
      this.set2num.set(str, this.nextStateNumber)
      this.num2set.set(this.nextStateNumber, items)
      this.nextStateNumber++
    }
    return this.set2num.get(str)!
  }

  getItems(stateNumber: number) {
    invariant(this.num2set.has(stateNumber), `Invalid state-number ${stateNumber}`)
    return this.num2set.get(stateNumber)!
  }
}

/** LR(k) Item基类. 用来表示当前解析的进度. */
export abstract class LRItem {
  abstract readonly nonterminal: GrammarNonterminal
  abstract readonly ruleIndex: number
  abstract readonly dotIndex: number

  abstract incDotIndex(): LRItem

  abstract toString(): string

  getRule() {
    return this.nonterminal.rules[this.ruleIndex] as GrammarRule
  }

  getXRuleItem() {
    return this.getRule().parsedItems[this.dotIndex]
  }

  isDotAtLast() {
    return this.dotIndex === this.getRule().parsedItems.length
  }
}

/** LR(k) Automaton基类. 提供了一些公共方法 */
export abstract class LRAutomaton<T extends LRItem> {
  abstract readonly grammar: Grammar
  abstract readonly stateManager: LRAutomatonStateManager<T>
  abstract readonly start: number
  abstract readonly graph = new DefaultMap<number, Map<string, number>>(() => new Map())

  abstract closure(items: ReadonlySet<T>): Set<T>

  goto(items: ReadonlySet<T>, symbol: GSInRule) {
    const result = new Set<T>()
    for (const item of items) {
      const xRuleItem = item.getRule().parsedItems[item.dotIndex]
      // 如果rule为epsilon-rule, 或是item.ruleIndex === rule.parsedItems.length
      // 那么在这里xRuleItem将为undefined
      if (xRuleItem != null && LRAutomaton.match(xRuleItem, symbol)) {
        result.add(item.incDotIndex() as T)
      }
    }
    return this.closure(result)
  }

  private static match(xRuleItem: Readonly<GSInRule>, target: GSInRule) {
    if (xRuleItem.type === 'literal') {
      return target.type === 'literal' && xRuleItem.chars === target.chars
    } else if (xRuleItem.type === 'terminal') {
      return target.type === 'terminal' && xRuleItem.name === target.name
    } else {
      return target.type === 'nonterminal' && xRuleItem.name === target.name
    }
  }
}
