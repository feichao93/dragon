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

  export interface Literal {
    type: 'literal'
    chars: string
  }

  export interface Unknown {
    type: 'unknown'
    name: string
    alias: string
  }

  export interface Epsilon {
    type: 'epsilon'
  }

  export interface Endmarker {
    type: 'endmarker'
  }

  // Vacuum represents a symbol that is not in the grammar
  // It is useful when constructing LALR(1) parsing table
  export interface Vacuum {
    type: 'vacuum'
  }

  /** 表示一个terminal/nonterminal的引用, 或表示一个literal */
  export type SymbolMaybeUnknown = Terminal | Nonterminal | Literal | Unknown
  export type Symbol = Terminal | Nonterminal | Literal
}

export interface TranslateAction<T = any> {
  (...args: any[]): T
}

export interface GrammarRule {
  readonly isEpsilon: boolean
  readonly raw: string
  readonly parsedItems: ReadonlyArray<Readonly<GrammarSymbol.Symbol>>
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

  /** Helper fn to create literal symbol */
  static t(chars: string): GrammarSymbol.Literal {
    return { type: 'literal', chars }
  }

  * allSymbols(): IterableIterator<GrammarSymbol.Symbol> {
    for (const name of this.terminals.keys()) {
      yield { type: 'terminal', alias: '', name }
    }
    for (const name of this.nonterminals.keys()) {
      yield { type: 'nonterminal', alias: '', name }
    }

    const seen = new Set<string>()
    for (const nonterminal of this.nonterminals.values()) {
      for (const rule of nonterminal.rules) {
        for (const item of rule.parsedItems) {
          if (item.type === 'literal' && !seen.has(item.chars)) {
            seen.add(item.chars)
            yield item
          }
        }
      }
    }
  }
}
