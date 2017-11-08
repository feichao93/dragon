import { Reg } from 'scanning/Reg'

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

export interface TranslateAction<T = any> {
  (...args: any[]): T
}

export interface GrammarRule {
  readonly isEpsilon: boolean
  readonly raw: string
  readonly parsedItems: ReadonlyArray<Readonly<GrammarSymbol>>
  readonly translateAction?: TranslateAction
}

export interface GrammarTerminal {
  readonly name: string
  readonly reg: Readonly<Reg>
}

export interface GrammarNonterminal {
  readonly name: string
  readonly rules: ReadonlyArray<GrammarRule>
}

export default class Grammar {
  static readonly defaultAlias = '@@defaultAlias@@'
  readonly grammarName: string
  readonly start: string
  readonly terminals: ReadonlyMap<string, GrammarTerminal>
  readonly nonterminals: ReadonlyMap<string, GrammarNonterminal>

  constructor(
    grammarName: string,
    start: string,
    terminals: ReadonlyMap<string, GrammarTerminal>,
    nonterminals: ReadonlyMap<string, GrammarNonterminal>,
  ) {
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
}
