import Grammar, { GrammarSymbol } from './Grammar'
import { endmarker, epsilon } from 'common/basic'

export function resolve(grammar: Grammar, descriptor: string): GrammarSymbol.Symbol | symbol {
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
      if (grammar.terminals.has(name)) {
        return { type: 'terminal', name, alias }
      } else if (grammar.nonterminals.has(name)) {
        return { type: 'nonterminal', name, alias }
      } else {
        throw new Error(`Cannot resolve ${s}`)
      }
    } else {
      return { type: 'literal', chars: s }
    }
  }
}

export function stringify(symbol: GrammarSymbol.Symbol | symbol): string {
  if (typeof symbol === 'symbol') {
    return String(symbol)
  } else if (symbol.type === 'literal') {
    return symbol.chars
  } else { // terminal or nonterminal
    const { alias, name } = symbol
    if (alias === Grammar.defaultAlias) {
      return `::${name}`
    } else {
      return `${alias}:${name}`
    }
  }
}

export default abstract class Parser {
  readonly grammar: Grammar

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** 简单的parse方法, 主要用于测试语法解析是否正常工作 */
  abstract simpleParse(tokenDescriptors: Iterable<string>): IterableIterator<string>

  // TODO abstract parse()

  /** 将GrammarSymbol转化为对应的描述符descriptor */
  static stringify = stringify

  /** 将输入的描述符(descriptor)解析为对应的GrammarSymbol */
  resolve(descriptor: string) {
    return resolve(this.grammar, descriptor)
  }
}
