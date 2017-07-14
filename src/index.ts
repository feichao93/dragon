import { Nfa } from "./nfa";

console.log('hello world')

export const epsilon = Symbol('epsilon')

// 正则表达式
// 使用字符串来表示字符串匹配
// 使用Concat来表示 concatenation
// 使用Alter来表示 choice of alternatives

export type Reg = string | symbol | Concat | Alter | Star

export class Star {
  reg: Reg

  constructor(reg: Reg) {
    this.reg = reg
  }
}

export class Concat {
  array: Reg[]

  constructor(...regs: Reg[]) {
    this.array = regs
  }
}

export class Alter {
  array: Reg[]

  constructor(...regs: Reg[]) {
    this.array = regs
  }
}

// re: a
const nfa_of_a = new Nfa('a')

// re: ab|a
const nfa_of_abora = new Nfa(new Alter('ab', 'a'))

// re: a*b
const nfa_of_astarb = new Nfa(new Concat(new Star('a'), 'b'))

console.assert(nfa_of_astarb.simulate('b') === true)
console.assert(nfa_of_astarb.simulate('a*b') === false)
console.assert(nfa_of_astarb.simulate('ab') === true)
console.assert(nfa_of_astarb.simulate('aab') === true)
console.assert(nfa_of_astarb.simulate('aaab') === true)
console.assert(nfa_of_astarb.simulate('aaaaaaaaab') === true)
console.assert(nfa_of_astarb.simulate('aba') === false)
