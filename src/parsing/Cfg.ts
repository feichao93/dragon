import { Reg } from '../scanning/Reg'
import { Dict, ReadonlyDict } from '../basic'

export function nonterminal(name: string): NonterminalSymbol {
  return { type: 'nonterminal', name }
}

export function terminal(name: string): TerminalSymbol {
  return { type: 'terminal', name }
}

export function token(string: string): Token {
  return { type: 'token', string }
}

interface TerminalSymbol {
  type: 'terminal'
  name: string
}

interface NonterminalSymbol {
  type: 'nonterminal'
  name: string
}

interface Token {
  type: 'token'
  string: string
}

/** 表示一个terminal/nonterminal的引用, 或表示一个literal token */
type Symbol = TerminalSymbol | NonterminalSymbol | Token
type Rule = Symbol[]
type ReadonlyRule = ReadonlyArray<Symbol>

interface Terminal {
  readonly name: string
  readonly reg: Readonly<Reg>
}

interface Nonterminal {
  readonly name: string
  readonly rules: ReadonlyArray<ReadonlyRule>
}

type TransientTerminal = Terminal

interface TransientNonterminal {
  name: string
  symbolsArray: Array<Symbol | string>[]
}

export default class Cfg {
  readonly cfgName: string
  readonly start: string
  readonly terminals: ReadonlyDict<Terminal>
  readonly nonterminals: ReadonlyDict<Nonterminal>

  constructor(cfgName: string,
              start: string,
              terminals: ReadonlyDict<Terminal>,
              nonterminals: ReadonlyDict<Nonterminal>,) {
    this.cfgName = cfgName
    this.start = start
    this.terminals = terminals
    this.nonterminals = nonterminals
  }

  pprint() {
    console.group(`CFG: ${this.cfgName}`)
    console.log('start:', this.start)
    console.group('nonterminals:')
    for (const [name, nonterminal] of Object.entries(this.nonterminals)) {
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
    for (const [name, terminal] of Object.entries(this.terminals)) {
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
  transientTerminals: Dict<TransientTerminal> = {}
  transientNonterminals: Dict<TransientNonterminal> = {}
  private done = false

  /** 生成Cfg对象. 生成之后不能往调用defineTerminal/defineNonterminal */
  cfg(cfgName: string): Cfg {
    const nonterminals: Dict<Nonterminal> = {}
    for (const [name, n] of Object.entries(this.transientNonterminals)) {
      nonterminals[name] = {
        name,
        rules: n.symbolsArray.map(this.normalizeSymbols)
      }
    }
    this.done = true
    return new Cfg(cfgName, this.start, this.transientTerminals, nonterminals)
  }

  private ensureNotDone() {
    if (this.done) {
      throw new Error('Cfg has been constructor.')
    }
  }

  private ensureNameNotExist(name: string) {
    if (name in this.transientNonterminals
      || name in this.transientTerminals) {
      throw new Error('Terminal/Nonterminal already exists')
    }
  }

  private normalizeSymbols = (symbols: Array<Symbol | string>): Rule => symbols.map(s => {
    if (typeof s === 'string') {
      if (s in this.transientTerminals) {
        return terminal(s)
      } else if (s in this.transientNonterminals) {
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
    this.transientNonterminals[name] = nonterminal
    for (const symbols of symbolsArray) {
      nonterminal.symbolsArray.push(symbols)
    }
    return this
  }

  /**
   * 定义一个新的terminal, reg为terminal对应的正则表达式
   */
  defineTerminal(name: string, reg: Reg): this {
    this.ensureNameNotExist(name)
    this.ensureNotDone()
    this.transientTerminals[name] = { name, reg }
    return this
  }
}
