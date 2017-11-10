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

export default class LL1Parser {
  readonly grammar: Grammar
  readonly table: LL1ParsingTable

  constructor(grammar: Grammar, table: LL1ParsingTable) {
    this.grammar = grammar
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

  private resolve(s: string | symbol) {
    if (s === endmarker || s === 'Symbol($)') {
      return endmarker
    } else if (s === epsilon || s === 'Symbol(ϵ)') {
      return epsilon
    } else {
      s = s as string
      if (s.startsWith(':')) {
        const name = s.substring(1)
        if (this.grammar.terminals.has(name)) {
          return Grammar.T(s)
        } else if (this.grammar.nonterminals.has(name)) {
          return Grammar.N(s)
        } else {
          throw new Error(`Cannot resolve ${s}`)
        }
      } else {
        return Grammar.t(s)
      }
    }
  }

  private stringify(symbol: GrammarSymbol) {
    if (symbol.type === 'token') {
      return symbol.token
    } else {
      return ':' + symbol.name
    }
  }

  * parse(tokens: Iterable<string | symbol>) {
    const stack: string[] = []
    stack.push(String(endmarker))
    stack.push(':' + this.grammar.start)

    for (const token of tokens) {
      while (true) {
        const top = this.resolve(stack[stack.length - 1])
        if (typeof top === 'symbol') {
          invariant(token === top, 'ERROR')
          return yield 'accept'
        } else if (top.type === 'token') {
          invariant(top.token === token, `No match for ${token}`)
          yield `match ${token}`
          stack.pop()
          break
        } else if (top.type === 'terminal') {
          invariant(':' + top.name === token, `No match for ${token}`)
          yield `match ${token}`
          stack.pop()
          break
        } else { // top.type === 'nonterminal'
          const rule = this.table.get(top.name, this.resolve(token as any) as any)
          yield `apply ${top.name} -> ${rule.raw}`
          stack.pop()
          for (let i = rule.parsedItems.length - 1; i >= 0; i--) {
            stack.push(this.stringify(rule.parsedItems[i]))
          }
        }
      }
    }
  }
}
