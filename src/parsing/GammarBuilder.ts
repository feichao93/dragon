import * as invariant from 'invariant'
import { escapeWhitespaces, unescapeWhitespaces } from 'common/basic'
import Grammar, { GrammarNonterminal, TranslateAction } from 'parsing/Grammar'
import { Reg } from 'scanning/Reg'
import { GSInRawRule, GSInRule } from 'parsing/GrammarSymbol'

export interface GrammarTransientRule<T> {
  isEpsilon: boolean
  raw: string
  parsedItems: GSInRawRule[]
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
  build(): Grammar {
    const finalNonterminals = new Map<string, GrammarNonterminal>()

    for (const [name, nonterminal] of this.nmap.entries()) {
      const rules = nonterminal.rules.map(rule => ({
        ...rule,
        parsedItems: rule.parsedItems.map(this.normalize),
      }))
      finalNonterminals.set(name, { name, rules })
    }
    return new Grammar(this.name, this.start, this.tmap, finalNonterminals)
  }

  nonterminal(name: string, rule: string, translateAction?: TranslateAction<T>) {
    if (this.start === '') {
      this.start = name
    }
    if (!this.nmap.has(name)) {
      this.nmap.set(name, { name, rules: [] })
    }
    const nonterminal = this.nmap.get(name)!
    nonterminal.rules.push({
      isEpsilon: false,
      raw: rule,
      parsedItems: GrammarBuilder.parseRawRule(rule),
      translateAction,
    })
    return this
  }

  nonterminalEpsilon(name: string, translateAction?: TranslateAction<T>) {
    if (this.start === '') {
      this.start = name
    }
    if (!this.nmap.has(name)) {
      this.nmap.set(name, { name, rules: [] })
    }
    const nonterminal = this.nmap.get(name)!
    nonterminal.rules.push({
      isEpsilon: true,
      raw: 'ϵ',
      parsedItems: [],
      translateAction,
    })
    return this
  }

  /** 定义一个新的terminal, reg为terminal对应的正则表达式 */
  terminal<T>(name: string, reg: Reg | string, acceptAction?: T): this {
    invariant(!this.tmap.has(name), `Terminal ${name} has been already defined.`)
    invariant(!this.nmap.has(name), `There is a non-terminal named ${name} already.`)
    if (typeof reg === 'string') {
      reg = Reg.parse(reg)
    }
    this.tmap.set(name, { name, reg })
    return this
  }

  private normalize = (item: GSInRawRule): GSInRule => {
    if (item.type === 'unknown') {
      if (this.tmap.has(item.name)) {
        return { ...item, type: 'terminal' }
      } else if (this.nmap.has(item.name)) {
        return { ...item, type: 'nonterminal' }
      } else {
        throw new Error(`${item.name} is neither a terminal or a nonterminal`)
      }
    } else {
      return item
    }
  }

  static parseRawRule(rule: string) {
    const result: GSInRawRule[] = []

    let nameChars: string[] = []
    let isInName = false
    let literalOrAliasChars: string[] = []
    let isEscape = false

    function flushAlias() {
      const alias = literalOrAliasChars.join('')
      literalOrAliasChars = []
      return alias
    }

    function flushLiteral() {
      const chars = literalOrAliasChars.join('')
      literalOrAliasChars = []
      return chars
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
            literalOrAliasChars.push(GrammarBuilder.defaultAlias)
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
            const chars = flushLiteral()
            if (chars) {
              result.push({ type: 'literal', chars })
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
          literalOrAliasChars.push(char)
        }
      }
    }
    return result
  }
}
