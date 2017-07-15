// 正则表达式
// 使用字符串来表示字符串匹配
// 使用Concat来表示 concatenation
// 使用Alter来表示 choice of alternatives
import Nfa from './scanning/Nfa'
import naiveSimulateOfNfa from './scanning/algorithms/naiveSimulateOfNfa'
import { Alter, Asterisk, Concat } from './scanning/SimpleReg'

// re: a
const nfa_of_a = Nfa.fromReg('a')

// re: ab|a
const nfa_of_abora = Nfa.fromReg(new Alter('ab', 'a'))

// re: a*b
const nfa_of_astarb = Nfa.fromReg(new Concat(new Asterisk('a'), 'b'))

console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'b') === true)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'a*b') === false)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'ab') === true)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'aab') === true)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'aaab') === true)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'aaaaaaaaab') === true)
console.assert(naiveSimulateOfNfa(nfa_of_astarb, 'aba') === false)
