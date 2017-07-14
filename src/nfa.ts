import { Alter, Concat, epsilon, Reg, Star } from "./index";

interface State {
  name: string
  start: boolean
  accept: boolean
}

interface Transition {
  from: string
  char: string | symbol
  to: string
}

export class Nfa {
  private stateCount = 0
  private states: { [name: string]: State } = {}
  private transitions: Transition[] = []

  constructor(reg: Reg) {
    // const nfa_of_abora = new Nfa(new Alter('ab', 'a'))
    const startName = this.getNextStateName()
    this.addState({ name: startName, accept: false, start: true })

    const tailName = this.addReg(startName, reg)
    this.states[tailName].accept = true
  }

  simulate(string: string) {
    console.group(string)
    let set: string[] = [this.getStartStateName()]
    for (const char of string) {
      const next = this.simulateStep(set, char)
      console.log('char:', char, set.join(','), ' ===> ', next.join(','))
      set = next
    }
    console.groupEnd()
    return set.some(name => this.states[name].accept)
  }

  private simulateStep(set: string[], inputChar: string) {
    const closure = this.getEpsilonClosure(set)
    return this.transitions
      .filter(({ from, char }) => closure.includes(from) && char === inputChar)
      .map(s => s.to)
  }

  private getEpsilonClosure(startSet: string[]) {
    const result = new Set(startSet)
    this.transitions.filter(({ from, char }) => (startSet.includes(from) && char === epsilon))
      .map(s => this.getEpsilonClosure([s.to]))
      .map(subset => subset.forEach(x => result.add(x)))
    return Array.from(result)
  }

  private getStartStateName() {
    for (const state of Object.values(this.states)) {
      if (state.start) {
        return state.name
      }
    }
    throw new Error('No start state found')
  }

  private addReg(headName: string, reg: Reg) {
    if (typeof reg === 'string') {
      let prevStateName = headName
      let nextStateName = ''
      for (const char of reg) {
        nextStateName = this.getNextStateName()
        this.addState({ name: nextStateName, accept: false, start: false })
        this.addTransition(prevStateName, char, nextStateName)
        prevStateName = nextStateName
      }
      return nextStateName
    } else if (typeof reg === 'symbol') {
      return headName
    } else if (reg instanceof Concat) {
      let stateName = headName
      for (const subreg of reg.array) {
        stateName = this.addReg(stateName, subreg)
      }
      return stateName
    } else if (reg instanceof Alter) {
      const tailName = this.getNextStateName()
      this.addState({ name: tailName, start: false, accept: false })
      for (const subreg of reg.array) {
        const name = this.getNextStateName()
        this.addState({ name, start: false, accept: false })
        this.addEpsilonTransition(headName, name)
        const name2 = this.addReg(name, subreg)
        this.addEpsilonTransition(name2, tailName)
      }
      return tailName
    } else if (reg instanceof Star) {
      const A = this.getNextStateName()
      this.addState({ name: A, start: false, accept: false })
      const B = this.addReg(A, reg.reg)
      const C = this.getNextStateName()
      this.addState({ name: C, start: false, accept: false })

      this.addEpsilonTransition(headName, A)
      this.addEpsilonTransition(headName, C)
      this.addEpsilonTransition(B, A)
      this.addEpsilonTransition(B, C)
      return C
    } else {
      throw new Error('Invalid reg')
    }
  }

  private addTransition(from: string, char: string, to: string) {
    this.transitions.push({ from, char, to })
  }

  private addEpsilonTransition(from: string, to: string) {
    this.transitions.push({ from, char: epsilon, to })
  }

  private addState(state: State) {
    this.states[state.name] = state
    this.stateCount += 1
  }

  private getNextStateName() {
    return `s-${this.stateCount}`
  }
}

