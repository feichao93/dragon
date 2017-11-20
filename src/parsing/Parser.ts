import Grammar from 'parsing/Grammar'

export default abstract class Parser {
  readonly grammar: Grammar

  constructor(grammar: Grammar) {
    this.grammar = grammar
  }

  /** 简单的parse方法, 主要用于测试语法解析是否正常工作 */
  abstract simpleParse(tokenDescriptors: Iterable<string>): IterableIterator<string>

  // TODO abstract parse()
}
