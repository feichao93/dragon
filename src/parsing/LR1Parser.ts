import { DefaultMap } from 'common/basic'
import Grammar from 'parsing/Grammar'
import LRParser, { LRAction, LRParsingTable } from 'parsing/LRParser'
import LR1Automaton from 'parsing/LR1Automaton'

export class LR1ParsingTable implements LRParsingTable {
  actionMap = new DefaultMap<number, Map<string, LRAction>>(() => new Map())
  gotoMap = new DefaultMap<number, Map<string, number>>(() => new Map())
  start: number

  constructor(grammar: Grammar) {
    const automaton = new LR1Automaton(grammar)
    this.start = automaton.start

    // TODO 注意我们需要检查该语法是否为LR(1)语法
    // 目前我们假设传入的grammar是LR(1) grammar
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
          actionRow.set(item.lookahead, action)
        } else {
          const x = item.getRule().parsedItems[item.dotIndex]
          const xDescriptor = LR1Parser.stringify(x)
          const next = automaton.graph.get(stateNumber).get(xDescriptor)!
          if (x.type === 'nonterminal') {
            gotoRow.set(xDescriptor, next)
          } else { // terminal or token
            actionRow.set(xDescriptor, { type: 'shift', next })
          }
        }
      }
    }

    const acceptingStateNumber = this.gotoMap.get(this.start).get(':' + grammar.start)!
    this.actionMap.get(acceptingStateNumber).set('Symbol($)', { type: 'accept' })
  }
}

export default class LR1Parser extends LRParser {
  constructor(grammar: Grammar) {
    super(grammar, new LR1ParsingTable(grammar))
  }
}
