import Grammar, { GrammarNonterminal, GrammarRule, GrammarSymbol } from 'parsing/Grammar'
import { getLR0ItemParser, LR0AutomatonStateManager, LR0Item } from 'parsing/LR0-utils'
import Parser from 'parsing/Parser'
import { DefaultMap, set } from 'basic'
import { calculateFirstSetMap, calculateFollowSetMap } from './grammar-utils'

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

export class LR0Automaton {
  readonly grammar: Grammar
  readonly stateManager: LR0AutomatonStateManager
  readonly start: number
  readonly graph = new DefaultMap<number, Map<string, number>>(() => new Map())

  constructor(g: Grammar) {
    this.grammar = ensureAugmented(g)
    this.stateManager = new LR0AutomatonStateManager(this.grammar)
    const collection = new Set<number>()

    /** 解析 LR(0)-Item descriptor. 将字符串解析为LR0Item对象
     * 例如 'T/0/1' 将被解析为  LR0Item { nonterminal: T, ruleIndex: 0, dotIndex: 1 }
     * */
    const parse = getLR0ItemParser(this.grammar)

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

export type LRAction = LRActionShift | LRActionReduce | LRActionAccept

export interface LRActionShift {
  type: 'shift'
  // Next state number
  next: number
}

export interface LRActionReduce {
  type: 'reduce'
  // TODO 将rule改为ruleNumber更好一些
  rule: GrammarRule
  nonterminalName: string
}

export interface LRActionAccept {
  type: 'accept'
}

export class SLR1ParsingTable {
  // ACTION[stateNumber, tokenOrTerminalName]  shift-N / reduce-RULE
  // GOTO[stateNumber, nonterminalName] STATE-NUMBER
  actionMap = new DefaultMap<number, Map<string, LRAction>>(() => new Map())
  gotoMap = new DefaultMap<number, Map<string, number>>(() => new Map())
  start: number

  constructor(grammar: Grammar) {
    const firstSetMap = calculateFirstSetMap(grammar)
    const followSetMap = calculateFollowSetMap(grammar, firstSetMap)

    const automaton = new LR0Automaton(grammar)
    this.start = automaton.start

    // TODO 注意我们需要检查该语法是否为SLR(1)语法
    // 目前我们假设传入的grammar是SLR(1) grammar
    for (const [stateNumber, itemSet] of automaton.stateManager.num2set) {
      const actionRow = this.actionMap.get(stateNumber)
      const gotoRow = this.gotoMap.get(stateNumber)
      for (const item of itemSet) {
        if (item.isDotAtLast()) {
          const action: LRAction = {
            type: 'reduce',
            rule: item.getRule(),
            nonterminalName: item.nonterminal.name,
          }
          for (const symbol of followSetMap.get(item.nonterminal.name)!) {
            actionRow.set(Parser.stringify(symbol), action)
          }
        } else {
          const x = item.getRule().parsedItems[item.dotIndex]
          const xstr = Parser.stringify(x)
          const next = automaton.graph.get(stateNumber).get(xstr)!
          if (x.type === 'nonterminal') {
            gotoRow.set(xstr, next)
          } else { // terminal or token
            actionRow.set(xstr, { type: 'shift', next })
          }
        }
      }
    }

    const acceptingStateNumber = this.gotoMap.get(this.start).get(':' + grammar.start)!
    this.actionMap.get(acceptingStateNumber).set('Symbol($)', { type: 'accept' })
  }
}

export default class SLR1Parser extends Parser {
  readonly table: SLR1ParsingTable

  constructor(grammar: Grammar, table: SLR1ParsingTable) {
    super(grammar)
    this.table = table
  }

  static fromGrammar(grammar: Grammar) {
    return new SLR1Parser(grammar, new SLR1ParsingTable(grammar))
  }

  * simpleParse(tokenDescriptors: Iterable<string>) {
    const stack: number[] = []
    stack.push(this.table.start)

    nextDescriptor: for (const descriptor of tokenDescriptors) {
      while (true) {
        const cntStateNumber = stack[stack.length - 1]
        const action = this.table.actionMap.get(cntStateNumber).get(descriptor)!
        if (action == null) { // error cell
          return yield 'error'
        } else if (action.type === 'shift') {
          yield 'shift'
          stack.push(action.next)
          continue nextDescriptor
        } else if (action.type === 'reduce') {
          yield `reduce by ${action.nonterminalName} -> ${action.rule.raw}`
          const count = action.rule.parsedItems.length
          stack.splice(stack.length - count, count)
          const newStateNumber = stack[stack.length - 1]
          stack.push(this.table.gotoMap.get(newStateNumber).get(`:${action.nonterminalName}`)!)
          // Does not consume input.
        } else { // action.type === 'accept'
          return yield 'accept'
        }
      }
    }
  }
}
