import * as invariant from 'invariant'
import { Reg, escapeWhitespaces } from '..'

export namespace CfgSymbol {
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

export type CfgSymbolMaybeUnknown = CfgSymbol.SymbolMaybeUnknown
export type CfgSymbol = CfgSymbol.Symbol

export interface TranslateAction<T> {
  (...args: any[]): T
}

//#region immutable
export interface CfgRule<T> {
  readonly raw: string
  readonly parsedItems: ReadonlyArray<Readonly<CfgSymbol>>
  readonly translateAction?: TranslateAction<T>
}

export interface CfgTerminal {
  readonly name: string
  readonly reg: Readonly<Reg>
}

export interface CfgNonterminal<T> {
  readonly name: string
  readonly rules: ReadonlyArray<CfgRule<T>>
}

//#endregion

//#region transient
export interface CfgTransientRule<T> {
  raw: string
  parsedItems: CfgSymbolMaybeUnknown[]
  translateAction?: TranslateAction<T>
}

export interface CfgTransientTerminal {
  name: string
  reg: Reg
}

export interface CfgTransientNonterminal<T> {
  name: string
  rules: CfgTransientRule<T>[]
}

//#endregion

export class Cfg<T> {
  static readonly defaultAlias = '@@defaultAlias@@'
  readonly cfgName: string
  readonly start: string
  readonly terminals: ReadonlyMap<string, CfgTerminal>
  readonly nonterminals: ReadonlyMap<string, CfgNonterminal<T>>

  constructor(cfgName: string,
              start: string,
              terminals: ReadonlyMap<string, CfgTerminal>,
              nonterminals: ReadonlyMap<string, CfgNonterminal<T>>,) {
    this.cfgName = cfgName
    this.start = start
    this.terminals = terminals
    this.nonterminals = nonterminals
  }

  /** Helper fn to create nonterminal symbol */
  static N(s: string): CfgSymbol.Nonterminal {
    if (s.startsWith('::')) {
      return { type: 'nonterminal', name: s.substring(2), alias: Cfg.defaultAlias }
    } else {
      const [alias, name] = s.split(':')
      return { type: 'nonterminal', name, alias }
    }
  }

  /** Helper fn to create terminal symbol */
  static T(s: string): CfgSymbol.Terminal {
    if (s.startsWith('::')) {
      return { type: 'terminal', name: s.substring(2), alias: Cfg.defaultAlias }
    } else {
      const [alias, name] = s.split(':')
      return { type: 'terminal', name, alias }
    }
  }

  /** Helper fn to create token symbol */
  static t(token: string): CfgSymbol.Token {
    return { type: 'token', token }
  }

  // TODO Algorithm to eliminating Ambiguity
  // TODO Algorithm to eliminating of left recursion
  // TODO Compute FIRST and FOLLOW set for nonterminals in a context-free grammar

  // TODO pretty-print
  // pprint() {
  //   console.group(`CFG: ${this.cfgName}`)
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

/** CFG语法构造器. 提供了一些方便的函数用来动态构造CFG. */
export class CfgBuilder<T> {
  static readonly defaultAlias = Cfg.defaultAlias

  private name: string
  /** CFG语法的起始规则. 默认使用第一个nonterminal */
  start: string = ''
  /** terminal map */
  tmap = new Map<string, CfgTransientTerminal>()
  /** nonterminal map */
  nmap = new Map<string, CfgTransientNonterminal<T>>()

  constructor(name: string) {
    this.name = name
  }

  /** 生成Cfg对象 */
  build(): Cfg<T> {
    const nonterminals = new Map<string, CfgNonterminal<T>>()

    for (const [name, N] of this.nmap.entries()) {
      nonterminals.set(name, {
        name,
        rules: N.rules.map(({ raw, parsedItems, translateAction }) => ({
          raw,
          parsedItems: parsedItems.map(this.normalize),
          translateAction,
        }))
      })
    }
    return new Cfg(this.name, this.start, this.tmap, nonterminals)
  }

  nonterminal(name: string, rule: string, translateAction?: TranslateAction<T>) {
    if (this.start === '') {
      this.start = name
    }
    if (!this.nmap.has(name)) {
      this.nmap.set(name, { name, rules: [] })
    }
    const N = this.nmap.get(name)!
    N.rules.push({
      raw: rule,
      parsedItems: CfgBuilder.parseRawRule(rule),
      translateAction,
    })
    return this
  }

  /** 定义一个新的terminal, reg为terminal对应的正则表达式 */
  terminal<T>(name: string, reg: Reg | string, acceptAction?: T): this {
    invariant(!this.tmap.has(name), `Terminal ${name} has been already defined.`)
    if (typeof reg === 'string') {
      reg = Reg.parse(reg)
    }
    this.tmap.set(name, { name, reg })
    return this
  }

  private normalize = (item: CfgSymbolMaybeUnknown): CfgSymbol => {
    if (item.type === 'unknown') {
      if (this.tmap.has(item.name)) {
        return { ...item, type: 'terminal' }
      } else if (this.nmap.has(item.name)) {
        return { ...item, type: 'nonterminal' }
      } else {
        invariant(false, `${item.name} is neither a terminal or a nonterminal`)
      }
    }
    return item as CfgSymbol
  }

  static parseRawRule(rule: string) {
    const result: CfgSymbolMaybeUnknown[] = []

    let nameChars: string[] = []
    let isInName = false
    let tokenOrAliasChars: string[] = []

    function flushAlias() {
      const alias = tokenOrAliasChars.join('')
      tokenOrAliasChars = []
      return alias
    }

    function flushToken() {
      const token = tokenOrAliasChars.join('')
      tokenOrAliasChars = []
      return token
    }

    function flushName() {
      const name = nameChars.join('')
      nameChars = []
      return name
    }

    for (const c of rule.concat(' ')) {
      if (c === ':') {
        if (isInName) {
          const alias = flushAlias()
          invariant(alias === '', 'Invalid colon')
          tokenOrAliasChars.push(CfgBuilder.defaultAlias)
        } else {
          isInName = true
        }
      } else if (c === ' ' || c === '\t' || c === '\n') { // whitespaces
        if (isInName) {
          const name = flushName()
          const alias = flushAlias()
          result.push({ type: 'unknown', name, alias })
          isInName = false
        } else {
          const token = flushToken()
          if (token) {
            result.push({ type: 'token', token })
          }
        }
      } else if (c.match(/^[0-9a-zA-Z$_-]$/)) { // characters of name
        if (isInName) {
          nameChars.push(c)
        } else {
          tokenOrAliasChars.push(c)
        }
      } else if (c === '\\') {
        // TODO isEscape = true
      } else {
        invariant(!isInName, `${escapeWhitespaces(c)} is not a valid character of symbol names`)
        tokenOrAliasChars.push(c)
      }
    }
    return result
  }
}
