import * as invariant from 'invariant'
import Grammar, { GrammarNonterminal, GrammarRule, GrammarSymbol } from 'parsing/Grammar'
import Parser from 'parsing/Parser'
import { DefaultMap, set } from '../common/basic'

function isAugmented(grammar: Grammar) {
  const { start, nonterminals } = grammar
  const startNonterminalRules = nonterminals.get(start)!.rules
  return startNonterminalRules.length === 1
    && startNonterminalRules[0].parsedItems.length === 1
    && startNonterminalRules[0].parsedItems[0].type === 'nonterminal'
}

function ensureAugmented(g: Grammar) {
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

export class LR0AutomatonStateManager {
  // The string format of a LR(0) item set to state number
  readonly set2num = new Map<string, number>()
  // State number to LR(0) item set
  readonly num2set = new Map<number, Set<LR0Item>>()
  private nextStateNumber = 0
  readonly grammar: Grammar

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  getStateNumber(items: Set<LR0Item>) {
    const str = Array.from(items).map(LR0Item.stringify).sort().join(':')
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

/** LR(0) Item. 用来表示当前解析的进度.
 * 静态方法stringify和parse用于在对象形式和字符串形式之间进行转换
 * descriptor字符串的格式为: `${nonterminal.name}/${ruleIndex}/${dotIndex}` */
export class LR0Item {
  readonly nonterminal: GrammarNonterminal
  readonly ruleIndex: number
  readonly dotIndex: number

  constructor(nonterminal: GrammarNonterminal, ruleIndex: number, dotIndex: number) {
    this.nonterminal = nonterminal
    this.ruleIndex = ruleIndex
    this.dotIndex = dotIndex
  }

  static stringify(item: LR0Item) {
    return `${item.nonterminal.name}/${item.ruleIndex}/${item.dotIndex}`
  }

  static parse(grammar: Grammar, descriptor: string): LR0Item {
    const [nonterminalName, ruleIndexStr, dotIndexStr] = descriptor.split('/')
    return new LR0Item(
      grammar.nonterminals.get(nonterminalName)!,
      Number(ruleIndexStr),
      Number(dotIndexStr),
    )
  }

  incDotIndex() {
    return new LR0Item(this.nonterminal, this.ruleIndex, this.dotIndex + 1)
  }

  getRule() {
    return this.nonterminal.rules[this.ruleIndex] as GrammarRule
  }

  isDotAtLast() {
    return this.dotIndex === this.getRule().parsedItems.length
  }

  toString() {
    if (this.getRule().isEpsilon) {
      return `${this.nonterminal.name} -> .`
    } else {
      const array = this.getRule().parsedItems.map(Parser.stringify)
      array.splice(this.dotIndex, 0, '.')
      return `${this.nonterminal.name} -> ${array.join(' ')}`
    }
  }
}

export class LR0Automaton {
  readonly grammar: Grammar
  readonly stateManager: LR0AutomatonStateManager
  readonly start: number
  readonly graph = new DefaultMap<number, Map<string, number>>(() => new Map())

  constructor(g: Grammar) {
    this.grammar = ensureAugmented(g)
    this.stateManager = new LR0AutomatonStateManager(this.grammar)
    const collection = new Set<number>()

    const startNonterminal = this.grammar.nonterminals.get(this.grammar.start)!
    const startItem = new LR0Item(startNonterminal, 0, 0)
    const startItemClosure = this.closure(set(startItem))
    this.start = this.stateManager.getStateNumber(startItemClosure)

    let cntSet = set(this.start)
    while (cntSet.size > 0) {
      const nextSet = new Set<number>()
      for (const stateNumber of cntSet) {
        const items = this.stateManager.getItems(stateNumber)
        for (const symbol of this.grammar.allSymbols()) {
          const gotoResult = this.goto(items, symbol)
          if (gotoResult.size > 0) {
            const gotoStateNumber = this.stateManager.getStateNumber(gotoResult)
            this.graph.get(stateNumber).set(Parser.stringify(symbol), gotoStateNumber)
            if (!collection.has(gotoStateNumber) && !cntSet.has(gotoStateNumber)) {
              nextSet.add(gotoStateNumber)
            }
          }
        }
        collection.add(stateNumber)
      }
      cntSet = nextSet
    }
  }

  closure(items: ReadonlySet<LR0Item>): Set<LR0Item> {
    const result = new Set<string>()
    let cntSet = new Set(Array.from(items).map(LR0Item.stringify))
    while (cntSet.size > 0) {
      const nextSet = new Set<string>()
      for (const descriptor of cntSet) {
        const item = LR0Item.parse(this.grammar, descriptor)
        const rule = item.getRule()
        const xRuleItem = rule.parsedItems[item.dotIndex]
        if (xRuleItem != null && xRuleItem.type === 'nonterminal') {
          const xnonterminal = this.grammar.nonterminals.get(xRuleItem.name)!
          for (let ruleIndex = 0; ruleIndex < xnonterminal.rules.length; ruleIndex++) {
            const xDescriptor = `${xnonterminal.name}/${ruleIndex}/0`
            if (!result.has(xDescriptor) && !cntSet.has(xDescriptor)) {
              nextSet.add(xDescriptor)
            }
          }
        }
        result.add(descriptor)
      }
      cntSet = nextSet
    }
    return new Set(Array.from(result).map(descriptor => LR0Item.parse(this.grammar, descriptor)))
  }

  goto(items: ReadonlySet<LR0Item>, symbol: GrammarSymbol) {
    const result = new Set<LR0Item>()
    for (const item of items) {
      const xRuleItem = item.getRule().parsedItems[item.dotIndex]
      // 如果rule为epsilon-rule, 或是item.ruleIndex === rule.parsedItems.length
      // 那么在这里xRuleItem将为undefined
      if (xRuleItem != null && LR0Automaton.match(xRuleItem, symbol)) {
        result.add(item.incDotIndex())
      }
    }
    return this.closure(result)
  }

  private static match(xRuleItem: Readonly<GrammarSymbol>, target: GrammarSymbol) {
    if (xRuleItem.type === 'token') {
      return target.type === 'token' && xRuleItem.token === target.token
    } else if (xRuleItem.type === 'terminal') {
      return target.type === 'terminal' && xRuleItem.name === target.name
    } else {
      return target.type === 'nonterminal' && xRuleItem.name === target.name
    }
  }
}
