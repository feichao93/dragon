import Grammar, { GrammarSymbol } from './Grammar'
import { endmarker, epsilon } from 'basic'

export default abstract class Parser {
  readonly grammar: Grammar

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** 简单的parse方法, 主要用于测试语法解析是否正常工作 */
  abstract simpleParse(tokenDescriptors: Iterable<string>): IterableIterator<string>

  // TODO abstract parse()

  /** 将GrammarSymbol/epsilon/endmarker转化为对应的token-descriptor */
  static stringify(symbol: GrammarSymbol | symbol): string {
    if (typeof symbol === 'symbol') {
      return String(symbol)
    } else if (symbol.type === 'token') {
      return symbol.token
    } else { // terminal or nonterminal
      const { alias, name } = symbol
      if (alias === Grammar.defaultAlias) {
        return `::${name}`
      } else {
        return `${alias}:${name}`
      }
    }
  }

  /** 将输入的token-descriptor解析为对应的GrammarSymbol/epsilon/endmarker */
  resolve(descriptor: string): GrammarSymbol | symbol {
    if (descriptor === 'Symbol(ϵ)') {
      return epsilon
    } else if (descriptor === 'Symbol($)') {
      return endmarker
    } else {
      const s = descriptor as string
      if (s.includes(':')) {
        let alias: string
        let name: string
        if (s.startsWith('::')) {
          alias = Grammar.defaultAlias
          name = s.substring(2)
        } else {
          [alias, name] = s.split(':')
        }
        if (this.grammar.terminals.has(name)) {
          return { type: 'terminal', name, alias }
        } else if (this.grammar.nonterminals.has(name)) {
          return { type: 'nonterminal', name, alias }
        } else {
          throw new Error(`Cannot resolve ${s}`)
        }
      } else {
        return { type: 'token', token: s }
      }
    }
  }
}
