在写语法规则的时候, 本项目使用了下面的标记:

`':xxx'`表示*terminal*或*nonterminal*, 别名为空字符串

`'foo:xxx'`表示*terminal*或*nonterminal*, 且其别名为`foo`

`'bar'`不以冒号为起始字符, 匹配字符串`'bar'`

字符串`'Symbol($)'`和字符串`'Symbol(ϵ)'`有特殊含义, 请勿在语法中出现
