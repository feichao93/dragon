语法符号(`GrammarSymbol`)在语法分析中十分重要, 本项目中使用TypeScript Discriminated Unions定义了语法符号的对象形式, 不同类型的符号使用`type`字段进行区分. 为了方便书写/序列化, 本项目还定义了各个符号的字符串形式(`GrammarSymbolDescritpor`)

* `':epsilon'` 表示空字符串epsilon; 对象形式为 `{ type: 'epsilon' }`
* `':endmarker'` 表示结束符; 对象形式为 `{ type: 'endmarker' }`
* `':xxx'`表示*terminal* / *nonterminal* / *unknown* (由具体的场景或语法决定), 别名为空字符串; 对象形式为 `{ type: 'terminal', alias: '', name: 'xxx' }` (type也可以是`'nonterminal'`或`'unknown'`)
* `'foo:xxx'`表示*terminal* / *nonterminal* / *unkown* (由具体的场景或语法决定), 且其别名为`foo`; 对象形式为 `{ type: 'terminal', alias: 'foo', name: 'xxx' }` (type也可以是`'nonterminal'`或`'unknown'`)
* `'bar'`不以冒号为起始字符, 匹配字符串`'bar'`; 对象形式为 `{ type: 'literal' }`

*parsing/GrammarSymbol.ts* 文件也提供了工具函数用来在两种形式之间进行转换
