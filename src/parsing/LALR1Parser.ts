import * as invariant from 'invariant'
import { DefaultMap, range, set } from 'common/basic'
import CascadeSetMap from 'common/CascadeSetMap'
import Grammar from 'parsing/Grammar'
import { calculateFirstSetMap, getFirstSetOfSymbolSequence } from 'parsing/grammar-utils'
import LR0Automaton, { LR0Item } from 'parsing/LR0Automaton'
import { LR1Item } from 'parsing/LR1Automaton'
import { GSWithLookahead, resolve, stringify } from 'parsing/GrammarSymbol'
import LRParser, { LRAction, LRParsingTable } from 'parsing/LRParser'

// Get a vacuum symbol of this grammar.
// Vacuum is a literal symbol descriptor but it will never appear in this grammar.
function getVacuum(grammar: Grammar) {
  function isValidVacuum(s: string) {
    for (const symbol of grammar.allSymbols()) {
      if (symbol.type === 'literal' && symbol.chars === s) {
        return false
      }
    }
    return true
  }

  let result = 'vacuum'
  while (true) {
    if (isValidVacuum(result)) {
      return result
    } else {
      result += '$'
    }
  }
}

function lalr1closure(auto: LR0Automaton, item: LR0Item) {
  const firstSetMap = calculateFirstSetMap(auto.grammar)

  const result = new Set<string>()
  const parse = (descriptor: string) => LR1Item.parse(auto.grammar, descriptor)
  let cntSet = set(`${LR0Item.stringify(item)}/${getVacuum(auto.grammar)}`)
  while (cntSet.size > 0) {
    const nextSet = new Set<string>()
    for (const descriptor of cntSet) {
      const item = parse(descriptor)
      const rule = item.getRule()
      const xRuleItem = rule.parsedItems[item.dotIndex]
      if (xRuleItem != null && xRuleItem.type === 'nonterminal') {
        const xnonterminal = auto.grammar.nonterminals.get(xRuleItem.name)!
        const symbolSequence = (rule.parsedItems as GSWithLookahead[])
          .slice(item.dotIndex + 1)
          .concat(resolve(auto.grammar, item.lookahead) as GSWithLookahead)
        const nextLookaheadSet = getFirstSetOfSymbolSequence(symbolSequence, firstSetMap)

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

export class LALR1ParsingTable implements LRParsingTable {
  actionMap = new DefaultMap<number, Map<string, LRAction>>(() => new Map())
  gotoMap = new DefaultMap<number, Map<string, number>>(() => new Map())
  start: number

  constructor(grammar: Grammar) {
    const auto = new LR0Automaton(grammar)
    this.start = auto.start

    const lookaheadTable = this.initLookaheadTable(auto)

    for (const [stateNumber, itemSet] of auto.stateManager.num2set) {
      const actionRow = this.actionMap.get(stateNumber)
      const gotoRow = this.gotoMap.get(stateNumber)
      for (const item of itemSet) {
        const lookaheads = lookaheadTable.get(`${stateNumber}/${LR0Item.stringify(item)}`)
        if (item.isDotAtLast()) {
          const reduceAction: LRAction = {
            type: 'reduce',
            rule: item.getRule(),
            nonterminalName: item.nonterminal.name,
          }
          for (const descriptor of lookaheads) {
            const existedAction = actionRow.get(descriptor)
            invariant(!(existedAction && existedAction.type === 'reduce'),
              'Reduce-Reduce conflict occurred. The grammar is not LALR(1)')
            invariant(!(existedAction && existedAction.type === 'shift'),
              'Shift-Reduce conflict occurred. The grammar is not LALR(1)')
            actionRow.set(descriptor, reduceAction)
          }
        } else {
          const ruleSymbol = item.getRule().parsedItems[item.dotIndex]
          const descriptor = stringify(ruleSymbol)
          const next = auto.graph.get(stateNumber).get(descriptor)!
          if (ruleSymbol.type === 'nonterminal') {
            gotoRow.set(descriptor, next)
          } else { // terminal or literal
            invariant(!actionRow.has(descriptor) || actionRow.get(descriptor)!.type === 'shift',
              'Shift-Reduce conflict occurred. The grammar is not SLR(1)')

            actionRow.set(descriptor, { type: 'shift', next })
          }
        }
      }
    }

    const acceptingStateNumber = this.gotoMap.get(this.start).get(':' + grammar.start)!
    this.actionMap.get(acceptingStateNumber).set(':endmarker', { type: 'accept' })
  }

  initLookaheadTable(auto: LR0Automaton) {
    const vacuum = getVacuum(auto.grammar)
    const lookaheadGraph = new CascadeSetMap<string>()

    function propagate(fromStateNumber: number, from: LR0Item, toStateNumber: number, to: LR0Item) {
      lookaheadGraph.addEdge(
        `${fromStateNumber}/${LR0Item.stringify(from)}`,
        `${toStateNumber}/${LR0Item.stringify(to)}`,
      )
    }

    function spontaneouslyGenerate(stateNumber: number, item: LR0Item, lookahead: string) {
      lookaheadGraph.add(`${stateNumber}/${LR0Item.stringify(item)}`, lookahead)
    }

    for (const [fromStateNumber, items] of auto.stateManager.num2set) {
      for (const item of items) {
        if (auto.isKernelItem(item)) {
          const closure = lalr1closure(auto, item)
          for (const citem of closure) {
            if (!citem.isDotAtLast()) {
              const incCore = citem.incDotIndex().getCore()
              const xRuleItemDescriptor = stringify(citem.getXRuleItem())
              const toStateNumber = auto.graph.get(fromStateNumber).get(xRuleItemDescriptor)!
              if (citem.lookahead === vacuum) {
                propagate(fromStateNumber, item, toStateNumber, incCore)
              } else {
                spontaneouslyGenerate(toStateNumber, incCore, citem.lookahead)
              }
            }
          }
        }
      }
    }
    lookaheadGraph.add(`${auto.start}/${auto.grammar.start}/0/0`, ':endmarker')

    return lookaheadGraph.cascade()
  }
}

export default class LALR1Parser extends LRParser {
  constructor(grammar: Grammar) {
    super(grammar, new LALR1ParsingTable(grammar))
  }
}
