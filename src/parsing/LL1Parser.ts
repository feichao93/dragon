import * as invariant from 'invariant'
import { DefaultMap, hasEpsilon } from 'common/basic'
import Grammar, { GrammarRule } from 'parsing/Grammar'
import Parser from 'parsing/Parser'
import { GSInFirst, GSInFollow, Literal, Nonterminal, resolve, stringify, Terminal, } from 'parsing/GrammarSymbol'
import {
  calculateFirstSetMap,
  calculateFollowSetMap,
  getCommonPrefixInfo,
  getFirstSetOfSymbolSequence,
  getLeftRecursionInfo,
} from 'parsing/grammar-utils'

export class LL1ParsingTable {
  map = new DefaultMap<string, Map<string, GrammarRule>>(() => new Map())

  set(nonterminalName: string, symbol: GSInFollow, rule: GrammarRule) {
    const descriptor = stringify(symbol)
    invariant(!this.map.get(nonterminalName).has(descriptor), 'LL1 Parsing Table Conflict.')
    this.map.get(nonterminalName).set(descriptor, rule)
  }

  get(nonterminalName: string, symbol: GSInFirst): GrammarRule {
    const descriptor = stringify(symbol)
    if (!this.map.get(nonterminalName).has(descriptor)) {
      console.log(nonterminalName, descriptor)
    }
    invariant(this.map.get(nonterminalName).has(descriptor), 'ERROR cell!')
    return this.map.get(nonterminalName).get(descriptor)!
  }
}

export default class LL1Parser extends Parser {
  readonly table: LL1ParsingTable

  constructor(grammar: Grammar, table: LL1ParsingTable) {
    super(grammar)
    this.table = table
  }

  static fromGrammar(grammar: Grammar) {
    invariant(!getLeftRecursionInfo(grammar).result, 'Grammar has left recursion')
    invariant(getCommonPrefixInfo(grammar).length === 0, 'Grammar has common prefix')
    const table = new LL1ParsingTable()
    const firstSetMap = calculateFirstSetMap(grammar)
    const followSetMap = calculateFollowSetMap(grammar, firstSetMap)
    for (const A of grammar.nonterminals.values()) {
      for (const rule of A.rules) {
        if (!rule.isEpsilon) {
          const first = getFirstSetOfSymbolSequence(rule.parsedItems, firstSetMap)
          for (const a of first) {
            if (a.type !== 'epsilon') {
              table.set(A.name, a, rule)
            }
          }
          if (hasEpsilon(first)) {
            for (const b of followSetMap.get(A.name)!) {
              table.set(A.name, b, rule)
            }
          }
        } else {
          for (const b of followSetMap.get(A.name)!) {
            table.set(A.name, b, rule)
          }
        }
      }
    }
    return new LL1Parser(grammar, table)
  }

  * simpleParse(tokenDescriptors: Iterable<string>) {
    const g = this.grammar
    const stack: string[] = []
    stack.push(':endmarker')
    stack.push(':' + this.grammar.start)

    // td means `tokenDescritpor`
    nextDescriptor: for (const td of tokenDescriptors) {
      while (true) {
        const topItem = resolve(g, stack[stack.length - 1]) as GSInFollow | Nonterminal
        if (topItem.type === 'endmarker') {
          const symbol = resolve(g, td)
          invariant(symbol.type === 'endmarker', 'ERROR')
          return yield 'accept'
        } else if (topItem.type === 'literal') {
          const symbol = resolve(g, td) as Literal
          invariant(symbol.type === 'literal' && symbol.chars === topItem.chars, `No match for ${td}`)
          yield `match ${td}`
          stack.pop()
          continue nextDescriptor
        } else if (topItem.type === 'terminal') {
          const symbol = resolve(g, td) as Terminal
          invariant(symbol.type === 'terminal' && symbol.name === topItem.name, `No match for ${td}`)
          yield `match ${td}`
          stack.pop()
          continue nextDescriptor
        } else { // top.type === 'nonterminal'
          const symbol = resolve(g, td) as GSInFirst
          const rule = this.table.get(topItem.name, symbol)
          yield `apply ${topItem.name} -> ${rule.raw}`
          stack.pop()
          stack.push(...rule.parsedItems.map(stringify).reverse())
          // Does not consume input.
        }
      }
    }
  }
}
