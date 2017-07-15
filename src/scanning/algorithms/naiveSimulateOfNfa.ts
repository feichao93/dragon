import Nfa from '../Nfa'

function eq<T>(x: T) {
  return (y: T) => x === y
}

export default function naiveSimulateOfNfa(nfa: Nfa, input: string) {
  function step(set: string[], inputChar: string) {
    const result: string[] = []
    for (const stateName of nfa.getEpsilonClosure(set)) {
      for (const { char, to } of nfa.states[stateName].transitions) {
        if (char === inputChar && !result.includes(to)) {
          result.push(to)
        }
      }
    }
    return result
  }

  const finalSet = Array.from(input).reduce(step, [nfa.startState])

  return nfa.getEpsilonClosure(finalSet).some(eq(nfa.acceptState))
}
