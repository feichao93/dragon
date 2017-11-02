import * as invariant from 'invariant'
import { minBy, NFA } from '..'

const EOF = String.fromCharCode(0)

export class NFASimulator<T> {
  readonly nfa: NFA<T>
  private startSet: Set<number>

  constructor(nfa: NFA<T>) {
    this.nfa = nfa
    this.startSet = nfa.getStartEpsilonClosure()
  }

  * tokens(input: string): IterableIterator<T> {
    const nfa = this.nfa
    let cntSet = this.startSet
    let lexemeBegin = 0
    let forward = 0

    while (true) {
      const c = forward >= input.length ? EOF : input[forward]
      forward++
      const nextSet = new Set<number>()
      for (const cntNumber of cntSet) {
        const cntState = nfa.states.get(cntNumber)!
        for (const to of cntState.transitions.get(c)!) {
          nextSet.add(to)
        }
      }

      if (nextSet.size === 0) {
        const firstAcceptNumber = minBy(cntSet, s => {
          const state = nfa.states.get(s)!
          return state.accept ? state.number : Infinity
        })!
        const firstAcceptState = nfa.states.get(firstAcceptNumber)!
        invariant(firstAcceptState.accept, 'firstAcceptState.accept is false')
        const token = firstAcceptState.acceptAction!(input.substring(lexemeBegin, forward - 1))
        if (token) {
          yield token
        }

        forward--
        lexemeBegin = forward
        cntSet = this.startSet
      } else {
        cntSet = nfa.getEpsilonClosure(nextSet)
      }

      if (c === EOF) {
        break
      }
    }
  }
}
