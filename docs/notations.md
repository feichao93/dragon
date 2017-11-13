在写语法规则的时候, 本项目使用了下面的标记:

`':xxx'`表示*terminal*或*nonterminal*, 别名为空字符串

`'foo:xxx'`表示*terminal*或*nonterminal*, 且其别名为`foo`

`'bar'`不以冒号为起始字符, 匹配字符串`'bar'`

字符串`'Symbol($)'`和字符串`'Symbol(ϵ)'`有特殊含义, 请勿在语法中出现


在对Parser进行测试的时候, 我们用TokenDescriptor来表示来自lexer的输入, TokenDescriptor的类型为string, 可以有下面多种不同的形式:

1. 'Symbol($)'或'Symbol(ϵ)', 分别表示`endmarker`和`epsilon`
2. 不以冒号为起始字符的字符串, 例如'if', 表示token 'if'
3. 以冒号为起始字符的字符串, 例如 ':number' ':id'等, 表示terminal或nonterminal(通过grammar可以判断出来)
4. 字符串, 并且包含一个冒号, 例如: 'count:number', 表示terminal或nonterminal, 且其别名为count(不过在这个情况下别名是没用的)

使用Parser#resolve(descriptor: TokenDescriptor)方法来将TokenDescriptor转化为对应的GrammarSymbol/epsilon/endmarker
