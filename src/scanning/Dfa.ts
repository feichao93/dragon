import { Dict, ReadonlyDict, DefaultDict } from '../basic'
import Nfa from './Nfa'

/** Stat的transient版本. 用于创建DFA */
interface TransientState {
  name: string
  start: boolean
  accept: boolean
  transitionMap: Dict<string>
}

/**
 * DFA状态. 该类型是不可变(且为deep immutable)的, 对象创建之后无法修改其属性.
 * 对应与DFA的实际性质: DFA创建完成之后, 起每个状态都不应发生变化.
 * transitionMap表示在该状态下, 输入字符到目标状态的映射
 */
interface State {
  readonly name: string
  readonly start: boolean
  readonly accept: boolean
  readonly transitionMap: ReadonlyDict<string>
}

export default class Dfa {
  readonly states: ReadonlyDict<State>
  readonly startState: string
  readonly acceptStateSet: Set<string>

  constructor(states: Dict<TransientState>, startState: string, acceptStateSet: Set<string>) {
    this.states = states
    this.startState = startState
    this.acceptStateSet = acceptStateSet
  }

  static fromNfa(nfa: Nfa) {
    const builder = new DfaBuilder(nfa)
    return builder.dfa()
  }

  /** 判断input是否符合该DFA对应的正则表达式 */
  test(input: string) {
    let state = this.startState
    for (const char of input) {
      const map = this.states[state].transitionMap
      if (!(char in map)) {
        return false
      } else {
        state = map[char]
      }
    }
    return this.acceptStateSet.has(state)
  }
}

function getDfaStateName(nfaStateArray: string[]) {
  return nfaStateArray.join(':')
}

function getClosureFromDfaStateName(name:string) {
  return name.split(':')
}

/** DFA构造器. 用于从NFA从构造DFA */
class DfaBuilder {
  private states: Dict<TransientState> = {}
  private nfa: Nfa
  private startState = ''
  private acceptStateSet = new Set<string>()

  dfa() {
    return new Dfa(this.states, this.startState, this.acceptStateSet)
  }

  setStartState(startState: string) {
    this.startState = startState
    this.states[startState].start = true
  }

  setAcceptState(acceptState: string) {
    this.acceptStateSet.add(acceptState)
    this.states[acceptState].accept = true
  }

  constructor(nfa: Nfa) {
    this.nfa = nfa
    const startStateName = getDfaStateName(nfa.getEpsilonClosure([nfa.startState]))
    this.addState(startStateName)
    this.setStartState(startStateName)

    let dfaStateNameArray: string[] = [startStateName]
    while (dfaStateNameArray.length > 0) {
      const nextStateNameArray: string[] = []

      for (const from of dfaStateNameArray) {
        const transitions = new DefaultDict<string[]>(() => [])
        const closure = getClosureFromDfaStateName(from)

        for (const nfaState of closure) {
          for (const { char, to } of nfa.states[nfaState].transitions) {
            if (typeof char === 'string') { // not epsilon
              const toArray = transitions.get(char)
              if (!toArray.includes(to)) {
                toArray.push(to)
              }
            }
          }
        }

        for (const [char, nextDfaStateNameArray] of transitions.entries()) {
          const nextClosure = nfa.getEpsilonClosure(nextDfaStateNameArray)
          const to = getDfaStateName(nextClosure)
          if (!(to in this.states)) {
            this.addState(to)
            nextStateNameArray.push(to)
          }
          this.addTransition(from, char, to)
        }

        dfaStateNameArray = nextStateNameArray
      }
    }

    for (const state of Object.values(this.states)) {
      if (state.name.split(':').includes(nfa.acceptState)) {
        this.setAcceptState(state.name)
      }
    }
  }

  addTransition(from: string, char: string, to: string) {
    this.states[from].transitionMap[char] = to
  }

  addState(name: string) {
    this.states[name] = {
      name,
      accept: false,
      start: false,
      transitionMap: {},
    }
  }
}
