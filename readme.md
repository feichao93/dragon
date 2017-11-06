[![Build Status](https://img.shields.io/travis/shinima/dragon/master.svg?style=flat-square)](https://travis-ci.org/shinima/dragon) [![Coverage Status](https://img.shields.io/coveralls/shinima/dragon/master.svg?style=flat-square)](https://coveralls.io/github/shinima/dragon?branch=master)

# Dragon

My code practices on the "Dragon" book (Compilers Principles, Techniques, & Tools).

## 该项目目前包括的内容

### 词法分析

1. *scanning/Reg.ts*   一个简单的正则表达式`Reg`的类型定义 (该正则表达式功能有限, 但目前用于构建词法分析器是足够了的)
2. *scanning/RegParser.ts*  一个手写的正则表达式的解析器`RegParser`. 该解析器从一个字符串中解析得到一个中间对象; 该中间对象可以被很容易地转化为`Reg`对象
3. *scanning/NFA.ts*  NFA的定义以及NFA相关函数; 主要包括了以下功能: 从Reg表达式中构造NFA, 合并多个NFA形成一个大的NFA, 测试一个字符串是否被NFA接受
4. *scanning/NFASimulator.ts*  基于NFA的模拟器`NFASimulator`; 该模拟器基于一个NFA将输入的字符串转化为token的迭代器`IterableIterator<Token>`
5. *scanning/DFA.ts*  DFA的定义以及DFA相关函数; 主要包括了以下功能: 使用子集构造法(Subset Construction Algorithm)从一个NFA中构造DFA, 测试一个字符串是否被DFA接受
6. *scanning/DFASimulator.ts*  基于DFA的模拟器`DFASimulator`; 和`NFASimulator`拥有相同的接口, 有着更好的词法分析性能; 不过构造DFASimulator需要先构造DFA, 该步骤有较大开销.
7. *scanning/Lexer.ts*  包括词法解析器的定义`Lexer`以及一个词法解析器生成器`LexerBuilder`. `LexerBuilder`和[lex](http://dinosaur.compilertools.net/)类似. 目前`LexerBuilder`功能较为有限.  可以通过参数来`Lexer`指定所用的`FiniteAutomatonSimulator`, 可以选择NFA或DFA.
8. 以上代码的单元测试 (本项目采用测试驱动开发 ^ ^)

### 语法分析

1. *parsing/Grammar.ts*  上下文无关语法的相关TypeScript类型定义`Grammar`
2. *parsing/GrammarBuilder.ts* 一个上下文无关语法的构造器`GrammarBuilder`
3. 其他内容仍在学习中......
