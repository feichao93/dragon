import * as invariant from 'invariant'
import { NFA } from '..'

function minBy<T>(collection: Iterable<T>, iteratee: (t: T) => number) {
  let result: T | null = null
  for (const item of collection) {
    if (result == null || iteratee(item) < iteratee(result)) {
      result = item
    }
  }
  return result
}

const EOF = String.fromCharCode(0)

export class NFASimulator<T> {
  readonly nfa: NFA<T>
  private startSet: Set<string>

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
      const nextSet = new Set<string>()
      for (const cntName of cntSet) {
        const cntState = nfa.states.get(cntName)!
        for (const to of cntState.transitions.get(c)!) {
          nextSet.add(to)
        }
      }

      if (nextSet.size === 0) {
        const firstAcceptStateName = minBy(cntSet, s => {
          const state = nfa.states.get(s)!
          return state.accept ? state.order : Infinity
        })!
        const firstAcceptState = nfa.states.get(firstAcceptStateName)!
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
