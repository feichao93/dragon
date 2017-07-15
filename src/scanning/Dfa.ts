import { Dict, ReadonlyDict, DefaultDict } from '../basic'
import Nfa from './Nfa'

interface TransientState {
  name: string
  start: boolean
  accept: boolean
  transitionMap: Dict<string>
}

interface State {
  readonly name: string
  readonly start: boolean
  readonly accept: boolean
  readonly transitionMap: ReadonlyDict<string>
}

export default class Dfa {
  readonly states: ReadonlyDict<State>
  readonly startState: string
  readonly acceptStates: string[]

  constructor(states: Dict<TransientState>, startState: string, acceptStates: string[]) {
    this.states = states
    this.startState = startState
    this.acceptStates = acceptStates
  }

  static fromNfa(nfa: Nfa) {
    const builder = new DfaBuilder(nfa)
    return builder.dfa()
  }

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
    return this.acceptStates.includes(state)
  }
}

function getDfaStateName(nfaStateArray: string[]) {
  return nfaStateArray.join(':')
}

class DfaBuilder {
  private states: Dict<TransientState> = {}
  private nfa: Nfa
  private startState = ''
  private acceptStates: string[] = []

  dfa() {
    return new Dfa(this.states, this.startState, this.acceptStates)
  }

  setStartState(startState: string) {
    this.startState = startState
    this.states[startState].start = true
  }

  setAcceptState(acceptState: string) {
    this.acceptStates.push(acceptState)
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
        // todo 应当避免split的使用
        const closure = from.split(':')

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
