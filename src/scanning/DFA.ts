import { DefaultMap, includedIn, NFA } from '..'
import NumberConverter from '../utils/NumberConverter'

/** Stat的transient版本. 用于创建DFA */
export interface DFATransientState {
  number: number
  start: boolean
  accept: boolean
  transitionMap: Map<string, number>
}

/**
 * DFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应与DFA的实际性质: DFA创建完成之后, 起每个状态都不应发生变化.
 * transitionMap表示在该状态下, 输入字符到目标状态的映射
 */
export interface DFAState {
  readonly number: number
  readonly start: boolean
  readonly accept: boolean
  // todo readonly acceptAction: DFAAcceptAction<T>
  readonly transitionMap: ReadonlyMap<string, number>
}

export class DFA {
  readonly states: ReadonlyMap<number, DFAState>
  readonly startNumber: number
  readonly acceptNumberSet: Set<number>

  constructor(states: Map<number, DFATransientState>, startState: number, acceptStateSet: Set<number>) {
    this.states = states
    this.startNumber = startState
    this.acceptNumberSet = acceptStateSet
  }

  static fromNFA<T>(nfa: NFA<T>) {
    const builder = new DFABuilder(nfa)
    return builder.build()
  }

  /** 判断input是否符合该DFA对应的正则表达式 */
  test(input: string) {
    let state = this.startNumber
    for (const char of input) {
      const map = this.states.get(state)!.transitionMap
      if (!map.has(char)) {
        return false
      } else {
        state = map.get(char)!
      }
    }
    return this.acceptNumberSet.has(state)
  }
}

/** DFA构造器. 使用subset construction从NFA构造DFA */
class DFABuilder<T> {
  private converter = new NumberConverter()
  private states = new Map<number, DFATransientState>()
  private nfa: NFA<T>
  private startNumber = -1
  private acceptNumberSet = new Set<number>()

  constructor(nfa: NFA<T>) {
    this.nfa = nfa
  }

  build() {
    const { nfa, converter } = this

    const startNumber = converter.nfa2dfa(nfa.getStartEpsilonClosure())
    this.addState(startNumber)
    this.setStartState(startNumber)

    let dfaNumberArray: number[] = [startNumber]
    while (dfaNumberArray.length > 0) {
      const nextDfaNumberArray: number[] = []

      for (const from of dfaNumberArray) {
        const transitions = new DefaultMap<string, Set<number>>(() => new Set())
        const nfaNumberSet = converter.dfa2nfa(from)

        for (const nfaNumber of nfaNumberSet) {
          const nfaState = nfa.states.get(nfaNumber)!
          for (const [char, toSet] of nfaState.transitions) {
            if (typeof char !== 'symbol') { // not epsilon
              const entry = transitions.get(char)
              for (const to of toSet) {
                entry.add(to)
              }
            }
          }
        }

        for (const [char, nextDFANumberSet] of transitions.entries()) {
          const to = converter.nfa2dfa(nfa.getEpsilonClosure(nextDFANumberSet))
          if (!this.states.has(to)) {
            this.addState(to)
            nextDfaNumberArray.push(to)
          }
          this.addTransition(from, char, to)
        }

        dfaNumberArray = nextDfaNumberArray
      }
    }

    for (const state of this.states.values()) {
      const nfaNumberArray = this.converter.dfa2nfa(state.number)
      if (nfaNumberArray.some(includedIn(nfa.acceptNumberSet))) {
        this.addAcceptState(state.number)
      }
    }

    return new DFA(this.states, this.startNumber, this.acceptNumberSet)
  }

  private setStartState(startNumber: number) {
    this.startNumber = startNumber
    this.states.get(startNumber)!.start = true
  }

  private addAcceptState(stateNumber: number /* todo acceptAction */) {
    this.acceptNumberSet.add(stateNumber)
    this.states.get(stateNumber)!.accept = true
  }

  private addTransition(from: number, char: string, to: number) {
    this.states.get(from)!.transitionMap.set(char, to)
  }

  private addState(number: number) {
    this.states.set(number, {
      number,
      accept: false,
      start: false,
      transitionMap: new Map(),
    })
  }
}
