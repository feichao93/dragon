import * as invariant from 'invariant'
import { DFA, EOF } from '..'
import { FiniteAutomatonSimulator } from './common'

export class DFASimulator<T> implements FiniteAutomatonSimulator<T> {
  readonly dfa: DFA<T>

  constructor(dfa: DFA<T>) {
    this.dfa = dfa
  }

  * tokens(input: string) {
    let stack: number[] = []
    const dfa = this.dfa
    let cnt = dfa.startNumber
    let lexmeBegin = 0
    let forward = 0

    function traceBackAndFindFirstToken() {
      while (stack.length > 0) {
        forward--
        const n = stack.pop()!
        const s = dfa.states.get(n)!
        if (s.accept) {
          const token = s.acceptAction!(input.substring(lexmeBegin, forward))
          lexmeBegin = forward
          cnt = dfa.startNumber
          stack = []
          return token
        }
      }
    }

    while (true) {
      const c = forward >= input.length ? EOF : input[forward]
      forward++

      const state = dfa.states.get(cnt)!
      if (!state.transitionMap.has(c)) {
        invariant(stack.length > 0, `DFA cannot recognize the '${c}' as the first char of any token`)
        const token = traceBackAndFindFirstToken()
        if (token) {
          yield token
        }
      } else {
        cnt = state.transitionMap.get(c)!
        stack.push(cnt)
      }
      if (c === EOF) {
        break
      }
    }
    if (stack.length > 0) {
      const token = traceBackAndFindFirstToken()
      if (token) {
        yield token
      }
    }
  }
}
