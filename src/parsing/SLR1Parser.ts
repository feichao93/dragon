import Grammar from 'parsing/Grammar'
import Parser from './Parser'

export class SLR1ParsingTable {
}

export default class SLR1Parser extends Parser {
  readonly table: SLR1ParsingTable

  constructor(grammar: Grammar, table: SLR1ParsingTable) {
    super(grammar)
    this.table = table
  }

  static fromGrammar(grammar: Grammar) {
    // TODO
    return new SLR1Parser(grammar, null as any)
  }

  * simpleParse(tokens: Iterable<string>) {
    // TODO
    yield 'todo'
  }
}
