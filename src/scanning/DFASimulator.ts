import * as invariant from 'invariant'
import { FiniteAutomatonSimulator } from 'scanning/common'
import DFA from 'scanning/DFA'
import { EOF } from 'common/basic'

export default class DFASimulator<T> implements FiniteAutomatonSimulator<T> {
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

    while (true) {
      const c = forward >= input.length ? EOF : input[forward]
      forward++

      const state = dfa.states.get(cnt)!
      if (!state.transitionMap.has(c)) {
        invariant(stack.length > 0, `DFA cannot recognize the '${c}' as the first char of any token`)
        // Trace back and find the first token according to the stack
        while (stack.length > 0) {
          forward--
          const n = stack.pop()!
          const s = dfa.states.get(n)!
          if (s.accept) {
            const token = s.acceptAction!(input.substring(lexmeBegin, forward))
            if (token) {
              yield token
            }
            lexmeBegin = forward
            cnt = dfa.startNumber
            stack = []
            break // break trace back
          }
        }
      } else {
        cnt = state.transitionMap.get(c)!
        stack.push(cnt)
      }
      if (c === EOF) {
        break
      }
    }
  }
}
