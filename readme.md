# Dragon

My code practices on the "Dragon" book (Compilers Principles, Techniques, & Tools).

## 该项目目前包括的内容

1. *scanning/Reg.ts*   一个简单的正则表达式(Reg)的类型定义 (该正则表达式功能有限, 但用于构建词法分析器是足够了的)
2. *scanning/RegParser.ts*  一个手写的正则表达式的解析器. 该解析器从一个字符串中解析得到一个中间对象; 该中间对象可以被很容易地转化为Reg对象
3. *scanning/NFA.ts*  NFA的定义以及NFA相关函数; 主要包括了以下功能: 从Reg表达式中构造NFA, 合并多个NFA形成一个大的NFA, 测试一个字符串是否被NFA接受
4. *scanning/NFASimulator.ts*  基于NFA的模拟器; 该模拟器基于一个NFA将输入的字符串转化为token的迭代器 `IterableIterator<Token>`
5. *scanning/DFA.ts*  DFA的定义以及DFA相关函数; 主要包括了以下功能: 从一个DFA中构造DFA, 测试一个字符串是否被DFA接受
6. *scanning/Lexer.ts*  包括词法解析器的定义(Lexer)以及一个词法解析器生成器(LexerBuilder). LexerBuilder和[lex](http://dinosaur.compilertools.net/)类似. 目前LexerBuilder功能较为有限
7. *parsing/Cfg.ts*  上下文无关语法的相关TypeScript类型定义(Cfg), 以及一个Cfg的构造器(CfgBuilder)
8. 其他内容仍在学习中......

