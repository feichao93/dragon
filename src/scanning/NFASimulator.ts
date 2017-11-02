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
  private startSet: string[]

  private lexemeBegin = 0
  private forward = 0
  private cntSet: string[]

  constructor(nfa: NFA<T>) {
    this.nfa = nfa
    this.startSet = nfa.getEpsilonClosure([nfa.startStateName])
  }

  * tokens(input: string): IterableIterator<T> {
    const nfa = this.nfa
    this.cntSet = this.startSet

    while (true) {
      const c = this.forward >= input.length ? EOF : input[this.forward]
      this.forward++
      const nextSet = []
      for (const cnt of this.cntSet) {
        for (const { char, to } of nfa.states.get(cnt)!.transitions) {
          if (char === c) {
            nextSet.push(to)
          }
        }
      }

      if (nextSet.length === 0) {
        const firstAcceptStateName = minBy(this.cntSet, s => {
          const state = nfa.states.get(s)!
          return state.accept ? state.order : Infinity
        })!
        const firstAcceptState = nfa.states.get(firstAcceptStateName)!
        invariant(firstAcceptState.accept, 'firstAcceptState.accept is false')
        const returnValue = firstAcceptState.acceptAction!(input.substring(this.lexemeBegin, this.forward - 1))
        if (returnValue) {
          yield returnValue
        }

        this.forward--
        this.lexemeBegin = this.forward
        this.cntSet = this.startSet
      } else {
        this.cntSet = nfa.getEpsilonClosure(nextSet)
      }

      if (c === EOF) {
        break
      }
    }
  }
}
