import Grammar from 'parsing/Grammar'

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

/** 表示一个terminal/nonterminal的引用, 或表示一个literal */
// export type GSlMaybeUnknown = Terminal | Nonterminal | Literal | Unknown
/** 语法规则中会出现的grammar-symbol的类型 */
export type GSInRule = Terminal | Nonterminal | Literal
/** 在完成解析之前, 语法规则中会出现的grammar-symbol的类型 */
export type GSInRawRule = Unknown | Literal
export type GrammarSymbolDescriptor = string
export type GSAny = Terminal | Nonterminal | Literal | Unknown | Epsilon | Endmarker

/** 一个nonterminal的FIRST集合中会出现的grammar-symbol的类型 */
export type GSInFirst = Terminal | Literal | Epsilon
/** FOLLOW集合中会出现的grammar-symbol的类型 */
export type GSInFollow = Terminal | Literal | Endmarker
/** 一个nonterminal的FIRST/FOLLOW集合中会出现的grammar-symbol的类型 */
export type GSInFirstOrFollow = GSInFirst | GSInFollow
/** 一个symbol序列的FIRST集合中会出现的gramma-symbol的类型 */
export type GSInFirstOfSequence = Terminal | Literal | Epsilon | Endmarker
/** 与LR(1)/LALR(1) Item lookahead相关的grammar-symbol */
export type GSWithLookahead = GSInRule | Endmarker

/** 将描述符(descriptor)解析为对应的GrammarSymbol */
export function resolve(grammar: Grammar, descriptor: GrammarSymbolDescriptor): GSAny {
  if (descriptor === ':epsilon') {
    return { type: 'epsilon' }
  } else if (descriptor === ':endmarker') {
    return { type: 'endmarker' }
  } else if (descriptor.includes(':')) {
    // terminal or nontermianl or unknown
    let alias: string
    let name: string
    if (descriptor.startsWith('::')) {
      alias = Grammar.defaultAlias
      name = descriptor.substring(2)
    } else {
      [alias, name] = descriptor.split(':')
    }
    if (grammar.terminals.has(name)) {
      return { type: 'terminal', name, alias }
    } else if (grammar.nonterminals.has(name)) {
      return { type: 'nonterminal', name, alias }
    } else {
      throw new Error(`Cannot resolve ${descriptor}`)
    }
  } else {
    return { type: 'literal', chars: descriptor }
  }
}

/** 将GrammarSymbol转化为对应的描述符descriptor */
export function stringify(symbol: GSAny): GrammarSymbolDescriptor {
  if (symbol.type === 'endmarker') {
    return ':endmarker'
  } else if (symbol.type === 'epsilon') {
    return ':epsilon'
  } else if (symbol.type === 'literal') {
    return symbol.chars
  } else { // terminal or nonterminal or unknown
    const { alias, name } = symbol
    if (alias === Grammar.defaultAlias) {
      return `::${name}`
    } else {
      return `${alias}:${name}`
    }
  }
}
