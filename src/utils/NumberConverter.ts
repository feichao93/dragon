import * as invariant from 'invariant'
import { subtract } from '..'

export default class NumberConverter {
  private dfa2nfaMap = new Map<number, string>()
  private nfa2dfaMap = new Map<string, number>()
  private nextDfaNumber = 1

  nfa2dfa(nfaNumbers: Set<number>) {
    const s = Array.from(nfaNumbers).sort(subtract).join(':')
    if (!this.nfa2dfaMap.has(s)) {
      this.nfa2dfaMap.set(s, this.nextDfaNumber)
      this.dfa2nfaMap.set(this.nextDfaNumber, s)
      this.nextDfaNumber++
    }
    return this.nfa2dfaMap.get(s)!
  }

  dfa2nfa(dfaNumber: number) {
    invariant(this.dfa2nfaMap.has(dfaNumber), `${dfaNumber} is not a valid DFA-number`)
    return this.dfa2nfaMap.get(dfaNumber)!.split(':').map(Number)
  }
}
