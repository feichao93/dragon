import { DefaultMap } from 'common/basic'
import Grammar, { GrammarRule } from 'parsing/Grammar'
import { LR0Automaton } from 'parsing/LR0-utils'
import Parser from 'parsing/Parser'
import { calculateFirstSetMap, calculateFollowSetMap } from 'parsing/grammar-utils'

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
