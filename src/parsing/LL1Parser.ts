import * as invariant from 'invariant'
import { DefaultMap, endmarker, epsilon } from 'common/basic'
import Grammar, { GrammarRule, GrammarSymbol } from 'parsing/Grammar'
import Parser from 'parsing/Parser'
import {
  calculateFirstSetMap,
  calculateFollowSetMap,
  getCommonPrefixInfo,
  getFirstSetOfSymbolSequence,
  getLeftRecursionInfo,
  SymbolOfFirstSet,
  SymbolOfFollowSet,
} from 'parsing/grammar-utils'

export class LL1ParsingTable {
  map = new DefaultMap<string, Map<string, GrammarRule>>(() => new Map())

  set(nonterminalName: string, symbol: SymbolOfFollowSet, rule: GrammarRule) {
    let s: string
    if (typeof symbol === 'symbol') {
      s = String(symbol)
    } else if (symbol.type === 'literal') {
      s = symbol.chars
    } else {
      s = `:${symbol.name}`
    }
    invariant(!this.map.get(nonterminalName).has(s), 'LL1 Parsing Table Conflict.')
    this.map.get(nonterminalName).set(s, rule)
  }

  get(nonterminalName: string, symbol: SymbolOfFirstSet): GrammarRule {
    let s: string
    if (typeof symbol === 'symbol') {
      s = String(symbol)
    } else if (symbol.type === 'literal') {
      s = symbol.chars
    } else {
      s = `:${symbol.name}`
    }
    invariant(this.map.get(nonterminalName).get(s), 'ERROR cell!')
    return this.map.get(nonterminalName).get(s)!
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
            if (typeof a !== 'symbol') {
              table.set(A.name, a, rule)
            }
          }
          if (first.has(epsilon)) {
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
    const stack: string[] = []
    stack.push(String(endmarker))
    stack.push(':' + this.grammar.start)

    // td means `tokenDescritpor`
    nextDescriptor: for (const td of tokenDescriptors) {
      while (true) {
        const topItem = this.resolve(stack[stack.length - 1])
        if (typeof topItem === 'symbol') {
          const symbol = this.resolve(td)
          invariant(symbol === topItem, 'ERROR')
          return yield 'accept'
        } else if (topItem.type === 'literal') {
          const symbol = this.resolve(td) as GrammarSymbol.Literal
          invariant(symbol.type === 'literal' && symbol.chars === topItem.chars, `No match for ${td}`)
          yield `match ${td}`
          stack.pop()
          continue nextDescriptor
        } else if (topItem.type === 'terminal') {
          const symbol = this.resolve(td) as GrammarSymbol.Terminal
          invariant(symbol.type === 'terminal' && symbol.name === topItem.name, `No match for ${td}`)
          yield `match ${td}`
          stack.pop()
          continue nextDescriptor
        } else { // top.type === 'nonterminal'
          const symbol = this.resolve(td) as SymbolOfFirstSet
          const rule = this.table.get(topItem.name, symbol)
          yield `apply ${topItem.name} -> ${rule.raw}`
          stack.pop()
          stack.push(...rule.parsedItems.map(Parser.stringify).reverse())
          // Does not consume input.
        }
      }
    }
  }
}
