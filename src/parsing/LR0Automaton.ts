import { DefaultMap, range, set } from 'common/basic'
import { stringify } from 'parsing/GrammarSymbol'
import Grammar, { GrammarNonterminal } from 'parsing/Grammar'
import { ensureAugmented, LRAutomaton, LRAutomatonStateManager, LRItem, } from 'parsing/LRParser-utils'

/** LR(0) Item. 用来表示当前解析的进度.
 * 静态方法stringify和parse用于在对象形式和字符串形式之间进行转换
 * descriptor字符串的格式为: `${nonterminal.name}/${ruleIndex}/${dotIndex}` */
export class LR0Item extends LRItem {
  readonly nonterminal: GrammarNonterminal
  readonly ruleIndex: number
  readonly dotIndex: number

  constructor(nonterminal: GrammarNonterminal, ruleIndex: number, dotIndex: number) {
    super()
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

  toString() {
    if (this.getRule().isEpsilon) {
      return `${this.nonterminal.name} -> .`
    } else {
      const array = this.getRule().parsedItems.map(stringify)
      array.splice(this.dotIndex, 0, '.')
      return `${this.nonterminal.name} -> ${array.join(' ')}`
    }
  }
}

export default class LR0Automaton extends LRAutomaton<LR0Item> {
  readonly grammar: Grammar
  readonly stateManager: LRAutomatonStateManager<LR0Item>
  readonly start: number
  readonly graph = new DefaultMap<number, Map<string, number>>(() => new Map())

  constructor(g: Grammar) {
    super()
    this.grammar = ensureAugmented(g)
    this.stateManager = new LRAutomatonStateManager(this.grammar, LR0Item.stringify)
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
            this.graph.get(stateNumber).set(stringify(symbol), gotoStateNumber)
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

  isKernelItem = (item: LR0Item) => {
    return item.dotIndex !== 0 || item.nonterminal.name === this.grammar.start
  }

  closure(items: ReadonlySet<LR0Item>): Set<LR0Item> {
    const result = new Set<string>()
    const parse = (descriptor: string) => LR0Item.parse(this.grammar, descriptor)
    let cntSet = new Set(Array.from(items).map(LR0Item.stringify))
    while (cntSet.size > 0) {
      const nextSet = new Set<string>()
      for (const descriptor of cntSet) {
        const item = parse(descriptor)
        const rule = item.getRule()
        const xRuleItem = rule.parsedItems[item.dotIndex]
        if (xRuleItem != null && xRuleItem.type === 'nonterminal') {
          const xnonterminal = this.grammar.nonterminals.get(xRuleItem.name)!
          for (const ruleIndex of range(xnonterminal.rules.length)) {
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
    return new Set(Array.from(result).map(parse))
  }
}
