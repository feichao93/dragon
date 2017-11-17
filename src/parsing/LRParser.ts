import Grammar, { GrammarRule } from 'parsing/Grammar'
import Parser from 'parsing/Parser'

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

export interface LRParsingTable {
  actionMap: ReadonlyMap<number, ReadonlyMap<string, LRAction>>
  gotoMap: ReadonlyMap<number, Map<string, number>>
  start: number
}

export default class LRParser extends Parser {
  readonly table: LRParsingTable

  constructor(grammar: Grammar, table: LRParsingTable) {
    super(grammar)
    this.table = table
  }

  * simpleParse(tokenDescriptors: Iterable<string>) {
    const stack: number[] = []
    stack.push(this.table.start)

    nextDescriptor: for (const descriptor of tokenDescriptors) {
      while (true) {
        const cntStateNumber = stack[stack.length - 1]
        const action = this.table.actionMap.get(cntStateNumber)!.get(descriptor)!
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
          stack.push(this.table.gotoMap.get(newStateNumber)!.get(`:${action.nonterminalName}`)!)
          // Does not consume input.
        } else { // action.type === 'accept'
          return yield 'accept'
        }
      }
    }
  }
}
