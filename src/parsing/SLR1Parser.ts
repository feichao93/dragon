import { DefaultMap } from 'common/basic'
import Grammar from 'parsing/Grammar'
import { LR0Automaton } from 'parsing/LR0-utils'
import Parser from 'parsing/Parser'
import { calculateFirstSetMap, calculateFollowSetMap } from 'parsing/grammar-utils'
import LRParser, { LRAction, LRParsingTable } from 'parsing/LRParser'

export class SLR1ParsingTable implements LRParsingTable {
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

export default class SLR1Parser extends LRParser {
  constructor(grammar: Grammar) {
    super(grammar, new SLR1ParsingTable(grammar))
  }
}
