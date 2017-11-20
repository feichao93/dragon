import { DefaultMap, range, set } from 'common/basic'
import { GSInFirst, GSWithLookahead, resolve, stringify } from 'parsing/GrammarSymbol'
import Grammar, { GrammarNonterminal } from 'parsing/Grammar'
import { LR0Item } from 'parsing/LR0Automaton'
import { calculateFirstSetMap, getFirstSetOfSymbolSequence, ReadonlySetMap, } from 'parsing/grammar-utils'
import { ensureAugmented, LRAutomaton, LRAutomatonStateManager, LRItem, } from 'parsing/LRParser-utils'

/** LR(1) Item. 用来表示当前解析的进度.
 * 静态方法stringify和parse用于在对象形式和字符串形式之间进行转换
 * descriptor字符串的格式为: `${nonterminal.name}/${ruleIndex}/${dotIndex}/${lookahead}`
 * 例如对于production  T -> :T * :F | :F
 * descriptor `T/0/2/:endmarker` 表示LR(1) Item `T -> :T * . :F, $`
 * */
export class LR1Item extends LRItem {
  readonly nonterminal: GrammarNonterminal
  readonly ruleIndex: number
  readonly dotIndex: number
  readonly lookahead: string

  constructor(nonterminal: GrammarNonterminal, ruleIndex: number, dotIndex: number, lookahead: string) {
    super()
    this.nonterminal = nonterminal
    this.ruleIndex = ruleIndex
    this.dotIndex = dotIndex
    this.lookahead = lookahead
  }

  static stringify(item: LR1Item) {
    const { nonterminal: { name }, ruleIndex, dotIndex, lookahead } = item
    return `${name}/${ruleIndex}/${dotIndex}/${lookahead}`
  }

  static parse(grammar: Grammar, descriptor: string): LR1Item {
    const [nonterminalName, ruleIndexStr, dotIndexStr, lookahead] = descriptor.split('/')
    return new LR1Item(
      grammar.nonterminals.get(nonterminalName)!,
      Number(ruleIndexStr),
      Number(dotIndexStr),
      lookahead,
    )
  }

  incDotIndex() {
    return new LR1Item(this.nonterminal, this.ruleIndex, this.dotIndex + 1, this.lookahead)
  }

  getCore(): LR0Item {
    return new LR0Item(this.nonterminal, this.ruleIndex, this.dotIndex)
  }

  toString() {
    if (this.getRule().isEpsilon) {
      return `${this.nonterminal.name} -> .`
    } else {
      const array = this.getRule().parsedItems.map(stringify)
      array.splice(this.dotIndex, 0, '.')
      return `${this.nonterminal.name} -> ${array.join(' ')}, ${this.lookahead}`
    }
  }
}

export default class LR1Automaton extends LRAutomaton<LR1Item> {
  readonly grammar: Grammar
  readonly stateManager: LRAutomatonStateManager<LR1Item>
  readonly start: number
  readonly graph = new DefaultMap<number, Map<string, number>>(() => new Map())
  readonly firstSetMap: ReadonlySetMap<GSInFirst>

  constructor(g: Grammar) {
    super()
    this.grammar = ensureAugmented(g)
    this.firstSetMap = calculateFirstSetMap(this.grammar)
    this.stateManager = new LRAutomatonStateManager(this.grammar, LR1Item.stringify)
    const collection = new Set<number>()

    const startNonterminal = this.grammar.nonterminals.get(this.grammar.start)!
    const startItem = new LR1Item(startNonterminal, 0, 0, ':endmarker')
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

  closure(items: ReadonlySet<LR1Item>): Set<LR1Item> {
    const result = new Set<string>()
    const parse = (descriptor: string) => LR1Item.parse(this.grammar, descriptor)
    let cntSet = new Set(Array.from(items).map(LR1Item.stringify))
    while (cntSet.size > 0) {
      const nextSet = new Set<string>()
      for (const descriptor of cntSet) {
        const item = parse(descriptor)
        const rule = item.getRule()
        const xRuleItem = rule.parsedItems[item.dotIndex]
        if (xRuleItem != null && xRuleItem.type === 'nonterminal') {
          const xnonterminal = this.grammar.nonterminals.get(xRuleItem.name)!
          const symbolSequence = (rule.parsedItems as GSWithLookahead[])
            .slice(item.dotIndex + 1)
            .concat(resolve(this.grammar, item.lookahead) as GSWithLookahead)
          const nextLookaheadSet = getFirstSetOfSymbolSequence(symbolSequence, this.firstSetMap);

          for (const ruleIndex of range(xnonterminal.rules.length)) {
            for (const lookahead of nextLookaheadSet) {
              const xDescriptor = `${xnonterminal.name}/${ruleIndex}/0/${stringify(lookahead)}`
              if (!result.has(xDescriptor) && !cntSet.has(xDescriptor)) {
                nextSet.add(xDescriptor)
              }
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
