[![Build Status](https://img.shields.io/travis/shinima/dragon/master.svg?style=flat-square)](https://travis-ci.org/shinima/dragon) [![Coverage Status](https://img.shields.io/coveralls/shinima/dragon/master.svg?style=flat-square)](https://coveralls.io/github/shinima/dragon?branch=master)

# Dragon

My code practices on the "Dragon" book (Compilers Principles, Techniques, & Tools).

## 该项目目前包括的内容

### 词法分析

* *scanning/Reg.ts*   一个简单的正则表达式`Reg`的类型定义 (该正则表达式功能有限, 但目前用于构建词法分析器是足够了的)
* *scanning/RegParser.ts*  一个手写的正则表达式的解析器`RegParser`. 该解析器从一个字符串中解析得到一个中间对象; 该中间对象可以被很容易地转化为`Reg`对象
* *scanning/NFA.ts*  NFA的定义以及NFA相关函数; 主要包括了以下功能: 从Reg表达式中构造NFA, 合并多个NFA形成一个大的NFA, 测试一个字符串是否被NFA接受
* *scanning/NFASimulator.ts*  基于NFA的模拟器`NFASimulator`; 该模拟器基于一个NFA将输入的字符串转化为token的迭代器`IterableIterator<Token>`
* *scanning/DFA.ts*  DFA的定义以及DFA相关函数; 主要包括了以下功能: 使用子集构造法(Subset Construction Algorithm)从一个NFA中构造DFA, 测试一个字符串是否被DFA接受
* *scanning/DFASimulator.ts*  基于DFA的模拟器`DFASimulator`; 和`NFASimulator`拥有相同的接口, 有着更好的词法分析性能; 不过构造DFASimulator需要先构造DFA, 该步骤有较大开销.
* *scanning/Lexer.ts*  包括词法解析器的定义`Lexer`以及一个词法解析器生成器`LexerBuilder`. `LexerBuilder`和[lex](http://dinosaur.compilertools.net/)类似. 目前`LexerBuilder`功能较为有限.  可以通过参数来`Lexer`指定所用的`FiniteAutomatonSimulator`, 可以选择NFA或DFA.
* TODO DFA优化算法的实现(龙书3.9)
* 以上代码的单元测试 ヽ(´▽`)/

### 语法分析

* *parsing/Grammar.ts*  上下文无关语法的相关TypeScript类型定义`Grammar`  (龙书4.2)
* *parsing/GrammarBuilder.ts* 一个上下文无关语法的构造器`GrammarBuilder`
* *parsing/grammar-utils.ts* 上下文无法语法相关工具函数, 包括以下内容:  (龙书4.3)
  + 计算语法的左递归信息
  + 语法中各个non-terminal的FIRST/FOLLOW集合
  + 计算语法符号序列的FIRST集合
  + 计算同一个non-terminal的各个production是否存在相同前缀
* *parsing/Parser.ts* 语法解析器基类, 所有的语法解析器都继承自该基类
* *parsing/LL1Parser.ts* 一个最最最简单的LL(1)语法解析器生成器  (龙书4.4)
* *parsing/LRParser.ts* LR语法解析器的基类. 因为所有的LR语法解析器有相同的解析流程(不同LR解析算法的不同点在于Parsing Table), 所以该基类也提供了通用的解析函数
* *parsing/LRParser-utils.ts* LR语法解析器相关工具函数/类, 包括以下内容:
  + 函数`isAugmented`/`ensureAugmented`用于提升语法, 使其满足LR的解析要求
  + 类`LRAutomatonStateManager`用于管理LR(k)自动机的状态序号
  + 抽象类`LRItem`表示LR(k) Item  (龙书4.6.2)
  + 抽象类`LRAutomaton`表示LR(k) Automaton  (龙书4.6.2)
* *parsing/LR0Automaton.ts* LR(0)自动机的实现. 用于构造SLR(1)语法解析器
* *parsing/LR1Automaton.ts* LR(1)自动机的实现. 用于构造canonical-LR(1)语法解析器
* *parsing/SLR1Parser.ts* 一个最最最简单的SLR(1)语法解析器生成器  (龙书4.6.3, 4.6.4)
* *parsing/LR1Parser.ts* 一个最最最简单的canonical-LR(1)语法解析器生成器
* TODO 其他内容仍在学习中...
* 以上代码的单元测试(后续会添加更多) 本项目采用测试驱动开发 (｡◕‿◕｡)

### 亮点

* 使用tarjan算法(计算一个图中的强连通分量)优化了`CascadeSetMap`数据结构, 提高了语法解析过程中nonterminal的FIRST/FOLLOW集合的计算效率
* 合适地使用TypeScript readonly关键字, ReadonlyArray, ReadonlySet以及ReadonlyMap来保护数据结构, 防止不经意的修改
