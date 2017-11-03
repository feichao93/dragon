import * as invariant from 'invariant'
import { epsilon, alter, literal, Reg, DefaultMap, includedIn, CharsetRange } from '..'

const emptyDeclarations: ReadonlyMap<string, NFA<any>> = new Map()

function getCharsFromCharsetRanges(ranges: CharsetRange[]) {
  const result: string[] = []
  for (const range of ranges) {
    if (typeof range === 'string') {
      result.push(range)
    } else {
      const fromCode = range.from.codePointAt(0)!
      const toCode = range.to.codePointAt(0)!
      for (let code = fromCode; code <= toCode; code++) {
        result.push(String.fromCharCode(code))
      }
    }
  }
  return result
}

/**
 * State的transient版本. 用于创建NFA.
 */
export interface NFATransientState<T> {
  number: number
  start: boolean
  accept: boolean
  acceptAction?: NFAAcceptAction<T>
  transitions: NFATransientTransitions
}

export type NFATransientTransitions = Map<string | symbol, Set<number>>
export type NFATransitions = ReadonlyMap<string | symbol, ReadonlySet<number>>

/**
 * NFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应于NFA的实际属性: NFA创建完成之后, 其每个状态都不应发生变化.
 * transitions表示在该状态下, "一个输入字符对应的目标状态集合" 的映射表
 */
export interface NFAState<T> {
  readonly number: number
  readonly start: boolean
  readonly accept: boolean
  readonly acceptAction?: NFAAcceptAction<T>
  readonly transitions: NFATransitions
}

export interface NFAAcceptAction<T> {
  (lexeme: string): T | null
}

/**
 * NFA构造辅助类. 用于从Reg中创建对应的NFA.
 */
class NFABuilder<T> {
  private nextNumber = 1
  private states = new Map<number, NFATransientState<T>>()
  private startNumber = -1
  private acceptNumberSet = new Set<number>()

  /**
   * 返回构造得到的NFA.
   */
  build(): NFA<T> {
    if (this.startNumber === -1) {
      throw new Error('startState has not been specified yet')
    }
    if (this.acceptNumberSet.size === 0) {
      throw new Error('acceptState has not been specified yet')
    }
    return new NFA<T>(this.states, this.startNumber, this.acceptNumberSet)
  }

  /**
   * 设置NFA的start-state.
   * 注意NFA的start-state只有一个, 多次调用该函数只有最后一次是有效的
   */
  setStartState(startNumber: number) {
    this.startNumber = startNumber
    this.states.get(startNumber)!.start = true
  }

  /**
   * 添加一个NFA的accept-state.
   */
  setAcceptState(stateNumber: number, acceptAction: NFAAcceptAction<T>) {
    this.acceptNumberSet.add(stateNumber)
    const state = this.states.get(stateNumber)!
    state.accept = true
    state.acceptAction = acceptAction
  }

  /**
   * 往NFA中添加一个新的状态, 并返回新增状态的名称
   * 新增状态的名称会自动生成
   * 新增状态的start, accept属性默认为false, transitions默认为空数组
   */
  addState() {
    this.states.set(this.nextNumber, {
      number: this.nextNumber,
      start: false,
      accept: false,
      transitions: new DefaultMap(() => new Set()),
    })
    return this.nextNumber++
  }

  /** 添加跳转: 在状态from下, 输入字符为char, 则可以跳转到状态to */
  addTransition(from: number, char: string, to: number) {
    this.states.get(from)!.transitions.get(char)!.add(to)
  }

  /** 添加从状态from到状态to的epsilon跳转 */
  addEpsilonTransition(from: number, to: number) {
    this.states.get(from)!.transitions.get(epsilon)!.add(to)
  }

  /**
   * 以head为起始状态, 往NFA中添加若干状态和跳转
   * 调用该函数将在NFA中新增一个子图, 该子图对应reg参数
   * 该子图以head为起始状态, 以tail为结束状态(tail是自动生成的)
   * 函数最终返回tail
   */
  addReg(head: number, reg: Reg, declarations: ReadonlyMap<string, NFA<T>>): number {
    if (reg.type === 'literal') {
      let prev = head
      let next = -1
      for (const char of reg.string) {
        next = this.addState()
        this.addTransition(prev, char, next)
        prev = next
      }
      return next
    } else if (reg.type === 'concat') {
      let s = head
      for (const subreg of reg.subregs) {
        s = this.addReg(s, subreg, declarations)
      }
      return s
    } else if (reg.type === 'alter') {
      // 示例: alter(reg1, reg2, reg3)
      // 2,3,4为subregHead
      // 5,6,7为subregTail
      // 数字表示state加入的次序
      //              ϵ     [reg1]     ϵ
      //         -------> 2 ======> 5 ------
      //        |                           |
      //        |     ϵ     [reg2]     ϵ    V
      // ---> 1.head ---> 3 ======> 6 ---> tail
      //        |                           ^
      //        |     ϵ     [reg3]     ϵ    |
      //         -------> 4 ======> 7 ------
      const subregTailArray: number[] = []
      for (const subreg of reg.subregs) {
        const subregHead = this.addState()
        this.addEpsilonTransition(head, subregHead)
        subregTailArray.push(this.addReg(subregHead, subreg, declarations))
      }
      const tail = this.addState()
      for (const subregTail of subregTailArray) {
        this.addEpsilonTransition(subregTail, tail)
      }
      return tail
    } else if (reg.type === 'asterisk') {
      // ϵ means epsilon     ϵ
      //                 ---------
      //                |         |
      //            ϵ   V  [reg]  |  ϵ
      // ---> head ---> A ======> B ---> C (tail)
      //        |                        ^
      //        |            ϵ           |
      //         ------------------------
      const A = this.addState()
      const B = this.addReg(A, reg.subreg, declarations)
      const C = this.addState()
      this.addEpsilonTransition(head, A)
      this.addEpsilonTransition(head, C)
      this.addEpsilonTransition(B, A)
      this.addEpsilonTransition(B, C)
      return C
    } else if (reg.type === 'plus') {
      // ϵ means epsilon     ϵ
      //                 ---------
      //                |         |
      //            ϵ   V  [reg]  |  ϵ
      // ---> head ---> A ======> B ---> C (tail)
      const A = this.addState()
      const B = this.addReg(A, reg.subreg, declarations)
      const C = this.addState()
      this.addEpsilonTransition(head, A)
      this.addEpsilonTransition(B, A)
      this.addEpsilonTransition(B, C)
      return C
    } else if (reg.type === 'optional') {
      // ϵ means epsilon     ϵ
      //                 ---------
      //                |         |
      //            ϵ   |  [reg]  V  ϵ
      // ---> head ---> A ======> B ---> C (tail)
      const A = this.addState()
      const B = this.addReg(A, reg.subreg, declarations)
      const C = this.addState()
      this.addEpsilonTransition(head, A)
      this.addEpsilonTransition(A, B)
      this.addEpsilonTransition(B, C)
      return C
    } else if (reg.type === 'reg-ref') {
      // ϵ means epsilon
      //            ϵ     [subNFA]      ϵ
      // ---> head ---> A ==========> B ---> C (tail)
      const subNFA = declarations.get(reg.name)!
      invariant(subNFA != null, `RegRef ${reg.name} is not declared`)
      const A = this.addState()
      const B = this.addNFA(A, subNFA, false)
      const C = this.addState()
      this.addEpsilonTransition(head, A)
      this.addEpsilonTransition(B, C)
      return C
    } else if (reg.type === 'charset') {
      // Convert charset to an equivalent alterReg
      const alterReg = alter(...getCharsFromCharsetRanges(reg.ranges).map(literal))
      return this.addReg(head, alterReg, declarations)
    } else {
      throw new Error('Invalid reg')
    }
  }

  addNFA(head: number, nfa: NFA<T>, copyAccept: boolean) {
    const numberMap = new Map<number, number>()
    // For every state in `nfa`, add a cooresponding state in 'this'
    // The `numberMap` records the mapping from old number to new number
    for (const oldState of nfa.states.values()) {
      numberMap.set(oldState.number, this.addState())
    }
    const startNumber = numberMap.get(nfa.startNumber)!
    this.addEpsilonTransition(head, startNumber)
    for (const oldState of nfa.states.values()) {
      const newNumber = numberMap.get(oldState.number)!
      const newState = this.states.get(newNumber)!
      // newState.start should always be false here.
      // And it is false by default so we just skip the assignments to newState.start.
      if (copyAccept) {
        newState.accept = oldState.accept
        if (newState.accept) {
          this.setAcceptState(newState.number, oldState.acceptAction!)
        }
      }
      for (const [char, oldSet] of oldState.transitions) {
        const newSet = newState.transitions.get(char)!
        for (const to of oldSet) {
          newSet.add(numberMap.get(to)!)
        }
      }
    }
    const tail = this.addState()
    for (const acceptNumber of nfa.acceptNumberSet) {
      this.addEpsilonTransition(numberMap.get(acceptNumber)!, tail)
    }
    return tail
  }
}

export const defaultAcceptAction = () => null

/**
 * NFA(nondeterministic finite automaton)
 * NFA对象是不可变的, 创建之后无法修改其状态/跳转.
 * 泛型T是NFA的accept-action产生的token类型
 */
export class NFA<T> {
  /**
   * NFA的状态表
   */
  readonly states: ReadonlyMap<number, NFAState<T>>

  /**
   * NFA的起始状态
   */
  readonly startNumber: number

  /**
   * NFA的接受状态
   */
  readonly acceptNumberSet: Set<number>

  constructor(states: ReadonlyMap<number, NFAState<T>>,
              startNumber: number,
              acceptNumberSet: Set<number>) {
    this.states = states
    this.startNumber = startNumber
    this.acceptNumberSet = acceptNumberSet
  }

  /**
   * 使用NFABuilder, 从Reg中创建NFA对象
   */
  static fromReg<T>(reg: Reg | string,
                    acceptAction: NFAAcceptAction<T> = defaultAcceptAction,
                    declarations: ReadonlyMap<string, NFA<T>> = emptyDeclarations) {
    const builder = new NFABuilder<T>()
    const startNumber = builder.addState()
    if (typeof reg === 'string') {
      reg = Reg.parse(reg)
    }
    const acceptNumber = builder.addReg(startNumber, reg, declarations)
    builder.setStartState(startNumber)
    builder.setAcceptState(acceptNumber, acceptAction)
    return builder.build()
  }

  /** 合并多个NFA, 返回一个大的NFA */
  static mergeNFAs<T>(...nfas: NFA<T>[]) {
    const builder = new NFABuilder<T>()
    const startNumber = builder.addState()
    builder.setStartState(startNumber)
    for (const nfa of nfas) {
      builder.addNFA(startNumber, nfa, true)
    }
    return builder.build()
  }

  /**
   * 替换一个NFA的acceptAction, 返回一个新的NFA
   * 若该NFA包含多个acceptState, 每一个acceptState的acceptAction都会被替换
   */
  static replaceAcceptAction<T>(nfa: NFA<T>, acceptAction: NFAAcceptAction<T>): NFA<T> {
    const newStates = new Map<number, NFAState<T>>()
    for (const state of nfa.states.values()) {
      if (state.accept) {
        newStates.set(state.number, { ...state, acceptAction })
      } else {
        newStates.set(state.number, state)
      }
    }
    return new NFA(newStates, nfa.startNumber, nfa.acceptNumberSet)
  }

  /** 获取NFA的起始状态的epsilon closure */
  getStartEpsilonClosure() {
    return this.getEpsilonClosure(new Set([this.startNumber]))
  }

  /** 获取一个state set(状态集合)的epsilon closure */
  getEpsilonClosure(startSet: Set<number>) {
    const result = new Set<number>()

    let cnt = startSet
    while (cnt.size > 0) {
      const next = new Set<number>()
      for (const num of cnt) {
        const state = this.states.get(num)!
        for (const to of state.transitions.get(epsilon)!) {
          next.add(to)
        }
        result.add(num)
        cnt = next
      }
    }

    return result
  }

  /**
   * 使用简单的模拟方法来测试input是否符合该NFA对应的正则表达式
   */
  test(input: string) {
    const step = (set: Set<number>, inputChar: string) => {
      const next = new Set<number>()
      for (const number of set) {
        const state = this.states.get(number)!
        for (const to of state.transitions.get(inputChar)!) {
          next.add(to)
        }
      }
      return this.getEpsilonClosure(next)
    }

    const finalSet = Array.from(input).reduce(step, this.getStartEpsilonClosure())

    return Array.from(finalSet).some(includedIn(this.acceptNumberSet))
  }
}
