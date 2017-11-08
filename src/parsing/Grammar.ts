import { Reg } from 'scanning/Reg'
import { DefaultMap } from 'basic'

export namespace GrammarSymbol {
  export interface Terminal {
    type: 'terminal'
    name: string
    alias: string
  }

  export interface Nonterminal {
    type: 'nonterminal'
    name: string
    alias: string
  }

  export interface Token {
    type: 'token'
    token: string
  }

  export interface Unknown {
    type: 'unknown'
    name: string
    alias: string
  }

  /** 表示一个terminal/nonterminal的引用, 或表示一个literal token */
  export type SymbolMaybeUnknown = Terminal | Nonterminal | Token | Unknown
  export type Symbol = Terminal | Nonterminal | Token
}

export type GrammarSymbolMaybeUnknown = GrammarSymbol.SymbolMaybeUnknown
export type GrammarSymbol = GrammarSymbol.Symbol

export interface TranslateAction<T> {
  (...args: any[]): T
}

export interface GrammarRule<T> {
  readonly raw: string
  readonly parsedItems: ReadonlyArray<Readonly<GrammarSymbol>>
  readonly translateAction?: TranslateAction<T>
}

export interface GrammarTerminal {
  readonly name: string
  readonly reg: Readonly<Reg>
}

export interface GrammarNonterminal<T> {
  readonly name: string
  readonly rules: ReadonlyArray<GrammarRule<T>>
}

export default class Grammar<T> {
  static readonly defaultAlias = '@@defaultAlias@@'
  readonly grammarName: string
  readonly start: string
  readonly terminals: ReadonlyMap<string, GrammarTerminal>
  readonly nonterminals: ReadonlyMap<string, GrammarNonterminal<T>>

  constructor(grammarName: string,
              start: string,
              terminals: ReadonlyMap<string, GrammarTerminal>,
              nonterminals: ReadonlyMap<string, GrammarNonterminal<T>>,) {
    this.grammarName = grammarName
    this.start = start
    this.terminals = terminals
    this.nonterminals = nonterminals
  }

  /** Helper fn to create nonterminal symbol */
  static N(s: string): GrammarSymbol.Nonterminal {
    if (s.startsWith('::')) {
      return { type: 'nonterminal', name: s.substring(2), alias: Grammar.defaultAlias }
    } else {
      const [alias, name] = s.split(':')
      return { type: 'nonterminal', name, alias }
    }
  }

  /** Helper fn to create terminal symbol */
  static T(s: string): GrammarSymbol.Terminal {
    if (s.startsWith('::')) {
      return { type: 'terminal', name: s.substring(2), alias: Grammar.defaultAlias }
    } else {
      const [alias, name] = s.split(':')
      return { type: 'terminal', name, alias }
    }
  }

  /** Helper fn to create token symbol */
  static t(token: string): GrammarSymbol.Token {
    return { type: 'token', token }
  }

  // TODO Algorithm to eliminating Ambiguity
  // TODO Algorithm to eliminating of left recursion
  // TODO Compute FIRST and FOLLOW set for nonterminals in a context-free grammar

  // TODO pretty-print
  // pprint() {
  //   console.group(`Grammar: ${this.grammarName}`)
  //   console.log('start:', this.start)
  //   console.group('nonterminals:')
  //   for (const [name, nonterminal] of this.nonterminals.entries()) {
  //     for (const rule of nonterminal.rules) {
  //       const ruleString = rule.map(symbol => {
  //         if (symbol.type === 'token') {
  //           return `'${symbol.string}'`
  //         } else {
  //           return symbol.name
  //         }
  //       }).join(' ')
  //       console.log(name, '-->', ruleString)
  //     }
  //   }
  //   console.groupEnd()
  //   console.group('terminals:')
  //   for (const [name, terminal] of this.terminals.entries()) {
  //     console.log(name, '-->', Reg.stringify(terminal.reg))
  //   }
  //   console.groupEnd()
  //   console.groupEnd()
  // }

  getLeftRecursionInfo(): LeftRecursionInfo {
    const edges = new DefaultMap<string, Set<string>>(() => new Set())
    for (const { name, rules } of this.nonterminals.values()) {
      for (const { parsedItems } of rules) {
        const firstItem = parsedItems[0]
        if (firstItem.type === 'nonterminal') {
          edges.get(name).add(firstItem.name)
        }
      }
    }

    const loops: string[] = []
    for (const startName of this.nonterminals.keys()) {
      loops.push(...this.getNonterminalLoopsFromStart(startName, edges))
    }

    return {
      result: loops.length > 0,
      loops: new Set(loops),
    }
  }

  private getNonterminalLoopsFromStart(startName: string, edges: DefaultMap<string, Set<string>>) {
    const stack: string[] = []
    const loops: string[] = []

    const fn = (name: string) => {
      stack.push(name)
      for (const next of edges.get(name)) {
        if (next === startName) {
          loops.push(stack.concat(next).join('->'))
        } else if (!stack.includes(next)) {
          fn(next)
        }
      }
      stack.pop()
    }

    fn(startName)
    return loops
  }

  getCommonPrefixInfo(): CommonPrefixInfo {
    const result: CommonPrefixInfo = []
    for (const n of this.nonterminals.values()) {
      for (let i = 0; i < n.rules.length; i++) {
        const { raw: raw1, parsedItems: items1 } = n.rules[i]
        for (let j = i + 1; j < n.rules.length; j++) {
          const { raw: raw2, parsedItems: items2 } = n.rules[j]
          let t = 0;
          while (t < items1.length && t < items2.length) {
            const item1 = items1[t]
            const item2 = items2[t]
            const option1 = item1.type === 'token' && item2.type === 'token' && item1.token === item2.token
            const option2 = item1.type === 'terminal' && item2.type === 'terminal' && item1.name === item2.name
            const option3 = item1.type === 'nonterminal' && item2.type === 'nonterminal' && item1.name === item2.name
            const common = option1 || option2 || option3
            if (!common) {
              break
            }
            t++
          }
          if (t > 0) {
            result.push({
              name: n.name,
              rule1Raw: raw1,
              rule2Raw: raw2,
              commonSymbols: items1.slice(0, t),
            })
          }
        }
      }
    }
    return result
  }
}

export interface LeftRecursionInfo {
  result: boolean,
  loops: Set<string>
}

export type CommonPrefixInfo = {
  name: string,
  rule1Raw: string,
  rule2Raw: string,
  commonSymbols: GrammarSymbol[]
}[]
