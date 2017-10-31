import { epsilon, Reg } from '..'

function includeIn<T>(set: Set<T>) {
  return (y: T) => set.has(y)
}

/**
 * State的transient版本. 用于创建NFA.
 */
export interface NFATransientState {
  name: string
  start: boolean
  accept: boolean
  transitions: Array<NFATransition>
}

/**
 * NFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应于NFA的实际属性: NFA创建完成之后, 其每个状态都不应发生变化.
 * transitions表示在该状态下, [ 输入字符, 目标状态 ] 的映射表
 * 注意因为时NFA, 一个状态下同一个输入字符可能对应多个目标状态
 */
export interface NFAState {
  readonly name: string
  readonly start: boolean
  readonly accept: boolean
  readonly transitions: ReadonlyArray<NFATransition>
}

export interface NFATransition {
  readonly char: string | symbol
  readonly to: string
}

/**
 * NFA构造辅助类. 用于从Reg中创建对应的NFA.
 */
class NFABuilder {
  private stateCount = 0
  private states = new Map<string, NFATransientState>()
  private startState = ''
  private acceptStateSet = new Set<string>()

  /**
   * 返回构造得到的NFA.
   */
  build() {
    if (this.startState === '') {
      throw new Error('startState has not been specified yet')
    }
    if (this.acceptStateSet.size === 0) {
      throw new Error('acceptState has not been specified yet')
    }
    return new NFA(this.states, this.startState, this.acceptStateSet)
  }

  /**
   * 设置NFA的start-state
   */
  setStartState(startState: string) {
    this.startState = startState
    this.states.get(startState)!.start = true
  }

  /**
   * 设置NFA的accept-state
   * // TODO acceptAction should be set here
   */
  addAcceptState(acceptState: string) {
    this.acceptStateSet.add(acceptState)
    this.states.get(acceptState)!.accept = true
  }

  /**
   * 往NFA中添加一个新的状态, 并返回新增状态的名称
   * 新增状态的名称会自动生成
   * 新增状态的start, accept属性默认为false, transitions默认为空数组
   */
  addState() {
    const name = `s-${this.stateCount}`
    this.states.set(name, { name, start: false, accept: false, transitions: [] })
    this.stateCount += 1
    return name
  }

  /**
   * 添加跳转: 在状态from下, 输入字符为char, 则可以跳转到状态to
   */
  addTransition(from: string, char: string, to: string) {
    this.states.get(from)!.transitions.push({ to, char })
  }

  /**
   * 添加从状态from到状态to的epsilon跳转
   */
  addEpsilonTransition(from: string, to: string) {
    this.states.get(from)!.transitions.push({ to, char: epsilon })
  }

  /**
   * 以head为起始状态, 往NFA中添加若干状态和跳转
   * 调用该函数将在NFA中新增一个子图, 该子图对应reg参数
   * 该子图以head为起始状态, 以tail为结束状态(tail是自动生成的)
   * 函数最终返回tail
   */
  addReg(head: string, reg: Reg) {
    if (reg.type === 'literal') {
      let prev = head
      let next = ''
      for (const char of reg.string) {
        next = this.addState()
        this.addTransition(prev, char, next)
        prev = next
      }
      return next
    } else if (reg.type === 'concat') {
      let s = head
      for (const subreg of reg.subregs) {
        s = this.addReg(s, subreg)
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
      const subregTailArray: string[] = []
      for (const subreg of reg.subregs) {
        const subregHead = this.addState()
        this.addEpsilonTransition(head, subregHead)
        subregTailArray.push(this.addReg(subregHead, subreg))
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
      const B = this.addReg(A, reg.subreg)
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
      //
      const A = this.addState()
      const B = this.addReg(A, reg.subreg)
      const C = this.addState()
      this.addEpsilonTransition(head, A)
      this.addEpsilonTransition(B, A)
      this.addEpsilonTransition(B, C)
      return C
    } else {
      throw new Error('Invalid reg')
    }
  }

  addNFA(head: string, nfa: NFA) {
    const nameMap = new Map<string, string>()
    // For every state in nfa, add a cooresponding state in 'this'
    // The `nameMap` records the mapping between old names and new names
    for (const state of nfa.states.values()) {
      nameMap.set(state.name, this.addState())
    }
    const startState = nameMap.get(nfa.startState)!
    this.addEpsilonTransition(head, startState)
    // const acceptState = nameMap.get(nfa.acceptStateSet)!
    for (const state of nfa.states.values()) {
      const newName = nameMap.get(state.name)!
      const newState = this.states.get(newName)!
      // newState.start should always be false here.
      // And it is false by default so we just skip the assignments to newState.start.
      newState.accept = state.accept
      this.addAcceptState(newState.name) // TODO acceptAction should be added/copied here
      newState.transitions = state.transitions.map(({ char, to }) => ({
        char,
        to: nameMap.get(to)!,
      }))
    }
    const tail = this.addState()
    for (const acceptState of nfa.acceptStateSet) {
      const newState = nameMap.get(acceptState)!
      this.addEpsilonTransition(newState, tail)
    }
    return tail
  }
}

/**
 * NFA(nondeterministic finite automaton)
 * NFA对象是不可变的, 创建之后无法修改其状态/跳转.
 */
export class NFA {
  /**
   * NFA的状态表
   */
  readonly states: ReadonlyMap<string, NFAState>

  /**
   * NFA的起始状态
   */
  readonly startState: string

  /**
   * NFA的接受状态
   */
  readonly acceptStateSet: Set<string>

  constructor(states: ReadonlyMap<string, NFAState>, startState: string, acceptState: Set<string>) {
    this.states = states
    this.startState = startState
    this.acceptStateSet = acceptState
  }

  /**
   * 使用NFABuilder, 从Reg中创建NFA对象
   */
  static fromReg(reg: Reg) {
    const builder = new NFABuilder()
    const startState = builder.addState()
    const acceptState = builder.addReg(startState, reg)
    builder.setStartState(startState)
    builder.addAcceptState(acceptState)
    return builder.build()
  }

  static mergeNFAs(...nfas: NFA[]) {
    const builder = new NFABuilder()
    const startState = builder.addState()
    builder.setStartState(startState)
    for (const nfa of nfas) {
      builder.addNFA(startState, nfa)
    }
    return builder.build()
  }

  /**
   * 获取一个state set(状态集合)的epsilon closure
   */
  getEpsilonClosure(startSet: string[]) {
    const result = new Set<string>()

    let cntset = new Set(startSet)
    while (cntset.size > 0) {
      const next = new Set<string>()
      for (const stateName of cntset) {
        for (const { char, to } of this.states.get(stateName)!.transitions) {
          if (char === epsilon && !result.has(to) && !cntset.has(to)) {
            next.add(to)
          }
        }
        result.add(stateName)
        cntset = next
      }
    }

    return Array.from(result).sort()
  }

  /**
   * 使用简单的模拟方法来测试input是否符合该NFA对应的正则表达式
   */
  test(input: string) {
    const step = (set: string[], inputChar: string) => {
      const result: string[] = []
      for (const stateName of this.getEpsilonClosure(set)) {
        for (const { char, to } of this.states.get(stateName)!.transitions) {
          if (char === inputChar && !result.includes(to)) {
            result.push(to)
          }
        }
      }
      return result
    }

    const finalSet = Array.from(input).reduce(step, [this.startState])

    return this.getEpsilonClosure(finalSet).some(includeIn(this.acceptStateSet))
  }
}
