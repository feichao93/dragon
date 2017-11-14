import * as invariant from 'invariant'
import Grammar, { GrammarNonterminal } from 'parsing/Grammar'
import Parser from 'parsing/Parser'

export function getLR0ItemParser(grammar: Grammar) {
  return function (descriptor: string): LR0Item {
    const [nonterminalName, ruleIndexStr, dotIndexStr] = descriptor.split('/')
    return new LR0Item(
      grammar.nonterminals.get(nonterminalName)!,
      Number(ruleIndexStr),
      Number(dotIndexStr),
    )
  }
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

export class LR0Item {
  readonly nonterminal: GrammarNonterminal
  readonly ruleIndex: number
  readonly dotIndex: number

  constructor(nonterminal: GrammarNonterminal, ruleIndex: number, dotIndex: number) {
    this.nonterminal = nonterminal
    this.ruleIndex = ruleIndex
    this.dotIndex = dotIndex
  }

  static stringify(item:LR0Item) {
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
    return this.nonterminal.rules[this.ruleIndex]
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
