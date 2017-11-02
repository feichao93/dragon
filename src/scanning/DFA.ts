import { DefaultMap, NFA, includedIn } from '..'

/** Stat的transient版本. 用于创建DFA */
export interface DFATransientState {
  name: string
  start: boolean
  accept: boolean
  transitionMap: Map<string, string>
}

/**
 * DFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应与DFA的实际性质: DFA创建完成之后, 起每个状态都不应发生变化.
 * transitionMap表示在该状态下, 输入字符到目标状态的映射
 */
export interface DFAState {
  // TODO 去掉name, 使用number来标志DFA的state
  readonly name: string
  readonly start: boolean
  readonly accept: boolean
  readonly transitionMap: ReadonlyMap<string, string>
}

export class DFA {
  readonly states: ReadonlyMap<string, DFAState>
  readonly startState: string
  readonly acceptStateSet: Set<string>

  constructor(states: Map<string, DFATransientState>, startState: string, acceptStateSet: Set<string>) {
    this.states = states
    this.startState = startState
    this.acceptStateSet = acceptStateSet
  }

  static fromNFA<T>(nfa: NFA<T>) {
    const builder = new DFABuilder(nfa)
    return builder.build()
  }

  /** 判断input是否符合该DFA对应的正则表达式 */
  test(input: string) {
    let state = this.startState
    for (const char of input) {
      const map = this.states.get(state)!.transitionMap
      if (!map.has(char)) {
        return false
      } else {
        state = map.get(char)!
      }
    }
    return this.acceptStateSet.has(state)
  }
}

const convert = {
  dfa2nfa(name: string): Set<number> {
    return new Set(name.split(':').map(Number))
  },
  nfa2dfa(nfaNumberSet: Set<number>): string {
    return Array.from(nfaNumberSet).sort().join(':')
  },
}

/** DFA构造器. 使用subset construction从NFA构造DFA */
class DFABuilder<T> {
  private states = new Map<string, DFATransientState>()
  private nfa: NFA<T>
  private startState = ''
  private acceptStateSet = new Set<string>()

  build() {
    return new DFA(this.states, this.startState, this.acceptStateSet)
  }

  setStartState(startState: string) {
    this.startState = startState
    this.states.get(startState)!.start = true
  }

  addAcceptState(acceptState: string /* todo acceptAction */) {
    this.acceptStateSet.add(acceptState)
    this.states.get(acceptState)!.accept = true
  }

  constructor(nfa: NFA<T>) {
    this.nfa = nfa
    const startStateName = convert.nfa2dfa(nfa.getStartEpsilonClosure())
    this.addState(startStateName)
    this.setStartState(startStateName)

    let dfaStateNameArray: string[] = [startStateName]
    while (dfaStateNameArray.length > 0) {
      const nextStateNameArray: string[] = []

      for (const from of dfaStateNameArray) {
        const transitions = new DefaultMap<string, Set<number>>(() => new Set())
        const nfaNumberSet = convert.dfa2nfa(from)

        for (const nfaNumber of nfaNumberSet) {
          const nfaState = nfa.states.get(nfaNumber)!
          for (const [char, toSet] of nfaState.transitions) {
            if (typeof char === 'string') { // not epsilon
              const entry = transitions.get(char)
              for (const to of toSet) {
                entry.add(to)
              }
            }
          }
        }

        for (const [char, nextDFANumberSet] of transitions.entries()) {
          const nextClosure = nfa.getEpsilonClosure(nextDFANumberSet)
          const to = convert.nfa2dfa(nextClosure)
          if (!this.states.has(to)) {
            this.addState(to)
            nextStateNameArray.push(to)
          }
          this.addTransition(from, char, to)
        }

        dfaStateNameArray = nextStateNameArray
      }
    }

    for (const state of this.states.values()) {
      const nfaNumberArray = state.name.split(':').map(Number)
      if (nfaNumberArray.some(includedIn(nfa.acceptNumberSet))) {
        this.addAcceptState(state.name)
      }
    }
  }

  addTransition(from: string, char: string, to: string) {
    this.states.get(from)!.transitionMap.set(char, to)
  }

  addState(name: string) {
    this.states.set(name, {
      name,
      accept: false,
      start: false,
      transitionMap: new Map(),
    })
  }
}
