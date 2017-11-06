import * as invariant from 'invariant'
import { escapeWhitespaces, unescapeWhitespaces } from 'basic'
import Grammar, { GrammarNonterminal, GrammarSymbol, GrammarSymbolMaybeUnknown, TranslateAction } from 'parsing/Grammar'
import { Reg } from 'scanning/Reg'

export interface GrammarTransientRule<T> {
  raw: string
  parsedItems: GrammarSymbolMaybeUnknown[]
  translateAction?: TranslateAction<T>
}

export interface GrammarTransientTerminal {
  name: string
  reg: Reg
}

export interface GrammarTransientNonterminal<T> {
  name: string
  rules: GrammarTransientRule<T>[]
}

/** 语法构造器. 提供了一些方便的函数用来动态构造Grammar. */
export default class GrammarBuilder<T> {
  static readonly defaultAlias = Grammar.defaultAlias

  private name: string
  /** 起始规则. 默认使用第一个nonterminal */
  start: string = ''
  /** terminal map */
  tmap = new Map<string, GrammarTransientTerminal>()
  /** nonterminal map */
  nmap = new Map<string, GrammarTransientNonterminal<T>>()

  constructor(name: string) {
    this.name = name
  }

  /** 生成Grammar对象 */
  build(): Grammar<T> {
    const nonterminals = new Map<string, GrammarNonterminal<T>>()

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
    return new Grammar(this.name, this.start, this.tmap, nonterminals)
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
      parsedItems: GrammarBuilder.parseRawRule(rule),
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

  private normalize = (item: GrammarSymbolMaybeUnknown): GrammarSymbol => {
    if (item.type === 'unknown') {
      if (this.tmap.has(item.name)) {
        return { ...item, type: 'terminal' }
      } else if (this.nmap.has(item.name)) {
        return { ...item, type: 'nonterminal' }
      } else {
        invariant(false, `${item.name} is neither a terminal or a nonterminal`)
      }
    }
    return item as GrammarSymbol
  }

  static parseRawRule(rule: string) {
    const result: GrammarSymbolMaybeUnknown[] = []

    let nameChars: string[] = []
    let isInName = false
    let tokenOrAliasChars: string[] = []
    let isEscape = false

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

    for (let char of rule.concat(' ')) {
      let processAsNormalChar = false
      if (!isEscape) {
        if (char === '\\') {
          isEscape = true
        } else if (char === ':') {
          if (isInName) {
            const alias = flushAlias()
            invariant(alias === '', 'Invalid colon')
            tokenOrAliasChars.push(GrammarBuilder.defaultAlias)
          } else {
            isInName = true
          }
        } else if (char === ' ' || char === '\t' || char === '\n') { // whitespaces
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
        } else {
          processAsNormalChar = true
        }
      } else {
        invariant(':\\'.includes(char), 'Escape can only be applied to colon or backslash')
        char = unescapeWhitespaces(char)
        isEscape = false
        processAsNormalChar = true
      }

      if (processAsNormalChar) {
        if (isInName) {
          invariant(char.match(/^[0-9a-zA-Z$_-]$/), `${escapeWhitespaces(char)} is not a valid character of symbol names`)
          nameChars.push(char)
        } else {
          tokenOrAliasChars.push(char)
        }
      }
    }
    return result
  }
}
