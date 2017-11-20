import * as invariant from 'invariant'
import { DefaultMap } from 'common/basic'
import Grammar from 'parsing/Grammar'
import LRParser, { LRAction, LRParsingTable } from 'parsing/LRParser'
import LR1Automaton from 'parsing/LR1Automaton'
import { stringify } from 'parsing/GrammarSymbol'

export class LR1ParsingTable implements LRParsingTable {
  actionMap = new DefaultMap<number, Map<string, LRAction>>(() => new Map())
  gotoMap = new DefaultMap<number, Map<string, number>>(() => new Map())
  start: number

  constructor(grammar: Grammar) {
    const automaton = new LR1Automaton(grammar)
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
          const existedAction = actionRow.get(item.lookahead)
          invariant(!(existedAction && existedAction.type === 'reduce'),
            'Reduce-Reduce conflict occurred. The grammar is not LR(1)')
          invariant(!(existedAction && existedAction.type === 'shift'),
            'Shift-Reduce conflict occurred. The grammar is not LR(1)')
          actionRow.set(item.lookahead, reduceAction)
        } else {
          const x = item.getRule().parsedItems[item.dotIndex]
          const xDescriptor = stringify(x)
          const next = automaton.graph.get(stateNumber).get(xDescriptor)!
          if (x.type === 'nonterminal') {
            gotoRow.set(xDescriptor, next)
          } else { // terminal or literal
            invariant(!actionRow.has(xDescriptor) || actionRow.get(xDescriptor)!.type === 'shift',
              'Shift-Reduce conflict occurred. The grammar is not LR(1)')
            actionRow.set(xDescriptor, { type: 'shift', next })
          }
        }
      }
    }

    const acceptingStateNumber = this.gotoMap.get(this.start).get(':' + grammar.start)!
    this.actionMap.get(acceptingStateNumber).set(':endmarker', { type: 'accept' })
  }
}

export default class LR1Parser extends LRParser {
  constructor(grammar: Grammar) {
    super(grammar, new LR1ParsingTable(grammar))
  }
}
