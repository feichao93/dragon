import * as invariant from 'invariant'
import { defaultAcceptAction, literal, NFA, NFAAcceptAction, NFASimulator, Reg } from '..'

export class Lexer<T> {
  readonly simulator: NFASimulator<T>
  readonly nfa: NFA<T>

  constructor(nfa: NFA<T>, simulator: NFASimulator<T>) {
    this.nfa = nfa
    this.simulator = simulator
  }

  lex(input: string) {
    return this.simulator.tokens(input)
  }
}

export class LexerBuilder<T> {
  private declarations = new Map<string, NFA<T>>()
  private nfas: NFA<T>[] = []

  addDeclaration(name: string, reg: Reg | string): this {
    this.declarations.set(name, NFA.fromReg(reg, undefined, this.declarations))
    return this
  }

  addRule(content: string, acceptAction: NFAAcceptAction<T> = defaultAcceptAction): this {
    if (content.startsWith('{')) {
      invariant(content.endsWith('}'), 'When using reg-ref as a rule, rule name must be wrapped in curly braces')
      const regRefName = content.substring(1, content.length - 1)
      invariant(this.declarations.has(regRefName), `${regRefName} is not declared`)
      const nfa = this.declarations.get(regRefName)!
      this.nfas.push(NFA.replaceAcceptAction(nfa, acceptAction))
    } else {
      this.nfas.push(NFA.fromReg(literal(content), acceptAction))
    }
    return this
  }

  // TODO use KMP or AC algorithms to boost!
  addReservedWords(words: string[], acceptFactory: NFAAcceptAction<T>): this {
    for (const word of words) {
      this.addRule(word, () => acceptFactory(word))
    }
    return this
  }

  // TODO support different kinds of simulator: NFASimulator / DFASimulator ...
  build(): Lexer<T> {
    const nfa = NFA.mergeNFAs(...this.nfas)
    const simulator = new NFASimulator(nfa)
    return new Lexer(nfa, simulator)
  }
}
