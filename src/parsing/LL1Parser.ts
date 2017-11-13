import * as invariant from 'invariant'
import Grammar, { GrammarRule, GrammarSymbol } from 'parsing/Grammar'
import {
  getCommonPrefixInfo,
  getFirstSetMap,
  getFirstSetOfSymbolSequence,
  getFollowSetMap,
  getLeftRecursionInfo,
  SymbolOfFollowSet,
  SymbolOfFirstSet,
} from 'parsing/grammar-utils'
import { epsilon, DefaultMap, endmarker } from '../basic'
import Parser from 'parsing/Parser'

export class LL1ParsingTable {
  map = new DefaultMap<string, Map<string, GrammarRule>>(() => new Map())

  set(nonterminalName: string, symbol: SymbolOfFollowSet, rule: GrammarRule) {
    let s: string
    if (typeof symbol === 'symbol') {
      s = String(symbol)
    } else if (symbol.type === 'token') {
      s = symbol.token
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
    } else if (symbol.type === 'token') {
      s = symbol.token
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
    const firstSetMap = getFirstSetMap(grammar)
    const followSetMap = getFollowSetMap(grammar, firstSetMap)
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

    for (const token of tokenDescriptors) {
      while (true) {
        const topItem = this.resolve(stack[stack.length - 1])
        if (typeof topItem === 'symbol') {
          const item = this.resolve(token)
          invariant(item === topItem, 'ERROR')
          return yield 'accept'
        } else if (topItem.type === 'token') {
          const item = this.resolve(token) as GrammarSymbol.Token
          invariant(item.type === 'token' && item.token === topItem.token, `No match for ${token}`)
          yield `match ${token}`
          stack.pop()
          break
        } else if (topItem.type === 'terminal') {
          const item = this.resolve(token) as GrammarSymbol.Terminal
          invariant(item.type === 'terminal' && item.name === topItem.name, `No match for ${token}`)
          yield `match ${token}`
          stack.pop()
          break
        } else { // top.type === 'nonterminal'
          const item = this.resolve(token) as SymbolOfFirstSet
          const rule = this.table.get(topItem.name, item)
          yield `apply ${topItem.name} -> ${rule.raw}`
          stack.pop()
          stack.push(...rule.parsedItems.map(Parser.stringify).reverse())
        }
      }
    }
  }
}
