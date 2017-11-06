import { DefaultMap, minBy, } from 'basic'
import NFA from 'scanning/NFA'
import { AcceptAction, NumberConverter } from 'scanning/common'

/** State的transient版本. 用于创建DFA */
export interface DFATransientState<T> {
  number: number
  start: boolean
  accept: boolean
  acceptAction?: AcceptAction<T>
  transitionMap: Map<string, number>
}

/**
 * DFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应与DFA的实际性质: DFA创建完成之后, 起每个状态都不应发生变化.
 * transitionMap表示在该状态下, 输入字符到目标状态的映射
 */
export interface DFAState<T> {
  readonly number: number
  readonly start: boolean
  readonly accept: boolean
  readonly acceptAction?: AcceptAction<T>
  readonly transitionMap: ReadonlyMap<string, number>
}

export default class DFA<T> {
  readonly states: ReadonlyMap<number, DFAState<T>>
  readonly startNumber: number
  readonly acceptNumberSet: Set<number>

  constructor(states: Map<number, DFAState<T>>, startState: number, acceptStateSet: Set<number>) {
    this.states = states
    this.startNumber = startState
    this.acceptNumberSet = acceptStateSet
  }

  static fromNFA<T>(nfa: NFA<T>) {
    return nfa2dfa(nfa)
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

/** 使用subset construction从NFA构造DFA */
function nfa2dfa<T>(nfa: NFA<T>): DFA<T> {
  const converter = new NumberConverter()
  const dfaStates = new Map<number, DFATransientState<T>>()
  const dfaAcceptNumberSet = new Set<number>()

  const addState = (number: number) => dfaStates.set(number, {
    number,
    accept: false,
    start: false,
    transitionMap: new Map(),
  })

  const startNumber = converter.nfa2dfa(nfa.getStartEpsilonClosure())
  addState(startNumber)
  dfaStates.get(startNumber)!.start = true


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
        if (!dfaStates.has(to)) {
          addState(to)
          nextDfaNumberArray.push(to)
        }
        dfaStates.get(from)!.transitionMap.set(char, to)
      }

      dfaNumberArray = nextDfaNumberArray
    }
  }

  for (const dfaState of dfaStates.values()) {
    const nfaNumberArray = converter.dfa2nfa(dfaState.number)
    const primaryNfaAcceptNumber = minBy(nfaNumberArray, n => {
      const nfaState = nfa.states.get(n)!
      return nfaState.accept ? dfaState.number : Infinity
    })!
    const primaryNfaAcceptState = nfa.states.get(primaryNfaAcceptNumber)!
    if (primaryNfaAcceptState.accept) {
      dfaAcceptNumberSet.add(dfaState.number)
      dfaState.accept = true
      dfaState.acceptAction = primaryNfaAcceptState.acceptAction
    }
  }

  return new DFA(dfaStates, startNumber, dfaAcceptNumberSet)
}
