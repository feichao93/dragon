import { Reg } from '..'

export function nonterminal(name: string): NonterminalSymbol {
  return { type: 'nonterminal', name }
}

export function terminal(name: string): TerminalSymbol {
  return { type: 'terminal', name }
}

export function token(string: string): Token {
  return { type: 'token', string }
}

export interface TerminalSymbol {
  type: 'terminal'
  name: string
}

export interface NonterminalSymbol {
  type: 'nonterminal'
  name: string
}

export interface Token {
  type: 'token'
  string: string
}

/** 表示一个terminal/nonterminal的引用, 或表示一个literal token */
export type Symbol = TerminalSymbol | NonterminalSymbol | Token
type Rule = Symbol[]
export type ReadonlyRule = ReadonlyArray<Symbol>

export interface Terminal {
  readonly name: string
  readonly reg: Readonly<Reg>
}

export interface Nonterminal {
  readonly name: string
  readonly rules: ReadonlyArray<ReadonlyRule>
}

export type TransientTerminal = Terminal

export interface TransientNonterminal {
  name: string
  symbolsArray: Array<Symbol | string>[]
}

export class Cfg {
  readonly cfgName: string
  readonly start: string
  readonly terminals: ReadonlyMap<string, Terminal>
  readonly nonterminals: ReadonlyMap<string, Nonterminal>

  constructor(cfgName: string,
              start: string,
              terminals: ReadonlyMap<string, Terminal>,
              nonterminals: ReadonlyMap<string, Nonterminal>,) {
    this.cfgName = cfgName
    this.start = start
    this.terminals = terminals
    this.nonterminals = nonterminals
  }

  pprint() {
    console.group(`CFG: ${this.cfgName}`)
    console.log('start:', this.start)
    console.group('nonterminals:')
    for (const [name, nonterminal] of this.nonterminals.entries()) {
      for (const rule of nonterminal.rules) {
        const ruleString = rule.map(symbol => {
          if (symbol.type === 'token') {
            return `'${symbol.string}'`
          } else {
            return symbol.name
          }
        }).join(' ')
        console.log(name, '-->', ruleString)
      }
    }
    console.groupEnd()
    console.group('terminals:')
    for (const [name, terminal] of this.terminals.entries()) {
      console.log(name, '-->', Reg.stringify(terminal.reg))
    }
    console.groupEnd()
    console.groupEnd()
  }
}

/** CFG语法构造器. 提供了一些方便的函数用来动态构造CFG. */
export class CfgBuilder {
  /** CFG语法的起始规则. 默认使用第一个nonterminal */
  start: string = ''
  transientTerminals = new Map<string, TransientTerminal>()
  transientNonterminals = new Map<string, TransientNonterminal>()
  private done = false
  private name: string

  constructor(name: string) {
    this.name = name
  }

  /** 生成Cfg对象. 生成之后不能往调用defineTerminal/defineNonterminal */
  get(): Cfg {
    const nonterminals = new Map<string, Nonterminal>()
    for (const [name, n] of this.transientNonterminals.entries()) {
      nonterminals.set(name, {
        name,
        rules: n.symbolsArray.map(this.normalizeSymbols)
      })
    }
    this.done = true
    return new Cfg(this.name, this.start, this.transientTerminals, nonterminals)
  }

  private ensureNotDone() {
    if (this.done) {
      throw new Error('Cfg has been constructor.')
    }
  }

  private ensureNameNotExist(name: string) {
    if (this.transientNonterminals.has(name)
      || this.transientTerminals.has(name)) {
      throw new Error('Terminal/Nonterminal already exists')
    }
  }

  private normalizeSymbols = (symbols: Array<Symbol | string>): Rule => symbols.map(s => {
    if (typeof s === 'string') {
      if (this.transientTerminals.has(s)) {
        return terminal(s)
      } else if (this.transientNonterminals.has(s)) {
        return nonterminal(s)
      } else {
        throw new Error(`${s} is not a valid nonterminal/terminal name`)
      }
    } else {
      return s
    }
  })

  /** 定义一个新的nonterminal
   * defineNonterminal(name, A, B, C)对应CFG规则 name -> A | B | C
   * */
  defineNonterminal(name: string, ...symbolsArray: Array<Symbol | string>[]): this {
    this.ensureNameNotExist(name)
    this.ensureNotDone()
    if (this.start === '') {
      this.start = name
    }
    const nonterminal: TransientNonterminal = { name, symbolsArray: [] }
    this.transientNonterminals.set(name, nonterminal)
    for (const symbols of symbolsArray) {
      nonterminal.symbolsArray.push(symbols)
    }
    return this
  }

  /**
   * 定义一个新的terminal, reg为terminal对应的正则表达式
   */
  defineTerminal(name: string, reg: Reg | string): this {
    this.ensureNameNotExist(name)
    this.ensureNotDone()
    if (typeof reg === 'string') {
      reg = Reg.parse(reg)
    }
    this.transientTerminals.set(name, { name, reg })
    return this
  }
}
