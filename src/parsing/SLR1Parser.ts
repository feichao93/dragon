import * as invariant from 'invariant'
import { DefaultMap } from 'common/basic'
import Grammar from 'parsing/Grammar'
import LR0Automaton from 'parsing/LR0Automaton'
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

    for (const [stateNumber, itemSet] of automaton.stateManager.num2set) {
      const actionRow = this.actionMap.get(stateNumber)
      const gotoRow = this.gotoMap.get(stateNumber)
      for (const item of itemSet) {
        if (item.isDotAtLast()) {
          const reduceAction: LRAction = {
            type: 'reduce',
            rule: item.getRule(),
            nonterminalName: item.nonterminal.name,
          }
          for (const symbol of followSetMap.get(item.nonterminal.name)!) {
            const descriptor = SLR1Parser.stringify(symbol)
            const existedAction = actionRow.get(descriptor)
            invariant(!(existedAction && existedAction.type === 'reduce'),
              'Reduce-Reduce conflict occurred. The grammar is not SLR(1)')
            invariant(!(existedAction && existedAction.type === 'shift'),
              'Shift-Reduce conflict occurred. The grammar is not SLR(1)')
            actionRow.set(descriptor, reduceAction)
          }
        } else {
          const ruleSymbol = item.getRule().parsedItems[item.dotIndex]
          const descriptor = SLR1Parser.stringify(ruleSymbol)
          const next = automaton.graph.get(stateNumber).get(descriptor)!
          if (ruleSymbol.type === 'nonterminal') {
            gotoRow.set(descriptor, next)
          } else { // terminal or token
            invariant(!actionRow.has(descriptor) || actionRow.get(descriptor)!.type === 'shift',
              'Shift-Reduce conflict occurred. The grammar is not SLR(1)')

            actionRow.set(descriptor, { type: 'shift', next })
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
