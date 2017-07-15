import naiveSimulateOfNfa from '../src/scanning/algorithms/naiveSimulateOfNfa'
import { Alter, Asterisk, Concat } from '../src/scanning/SimpleReg'
import Nfa from '../src/scanning/Nfa'
import Dfa from '../src/scanning/Dfa'

test('nfa: regular expression abc', () => {
  const nfa = Nfa.fromReg('abc')
  expect(naiveSimulateOfNfa(nfa, '')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'abc')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'ab')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'abcd')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'abcabc')).toBe(false)
})

test('dfa: regular expression abc', () => {
  const dfa = Dfa.fromNfa(Nfa.fromReg('abc'))
  expect(dfa.test('')).toBe(false)
  expect(dfa.test('abc')).toBe(true)
  expect(dfa.test('ab')).toBe(false)
  expect(dfa.test('abcd')).toBe(false)
  expect(dfa.test('abcabc')).toBe(false)
})

test('nfa: regular expression a*', () => {
  const nfa = Nfa.fromReg(new Asterisk('a'))

  expect(naiveSimulateOfNfa(nfa, '')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'a')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aa')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aaa')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aaaaaaaa')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'b')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'aab')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'baaa')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'aaaba')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'abaaaa')).toBe(false)

})

test('dfa: regular expression a*', () => {
  const dfa = Dfa.fromNfa(Nfa.fromReg(new Asterisk('a')))
  expect(dfa.test('')).toBe(true)
  expect(dfa.test('a')).toBe(true)
  expect(dfa.test('aa')).toBe(true)
  expect(dfa.test('aaa')).toBe(true)
  expect(dfa.test('aaaaaaaa')).toBe(true)
  expect(dfa.test('b')).toBe(false)
  expect(dfa.test('aab')).toBe(false)
  expect(dfa.test('baaa')).toBe(false)
  expect(dfa.test('aaaba')).toBe(false)
  expect(dfa.test('abaaaa')).toBe(false)
})

test('nfa: regular expression a*b', () => {
  const nfa = Nfa.fromReg(new Concat(new Asterisk('a'), 'b'))
  expect(naiveSimulateOfNfa(nfa, 'b')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'b')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'a*b')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'ab')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aab')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aaab')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aaaaaaaaab')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'aba')).toBe(false)
})

test('dfa: regular expression a*b', () => {
  const dfa = Dfa.fromNfa(Nfa.fromReg(new Concat(new Asterisk('a'), 'b')))
  expect(dfa.test('b')).toBe(true)
  expect(dfa.test('a*b')).toBe(false)
  expect(dfa.test('ab')).toBe(true)
  expect(dfa.test('aab')).toBe(true)
  expect(dfa.test('aaab')).toBe(true)
  expect(dfa.test('aaaaaaaaab')).toBe(true)
  expect(dfa.test('aba')).toBe(false)
})

test('nfa: regular expression Letter(Letter|Digit)*', () => {
  const letters = 'abcdefghijklmnopqrstuvwxzy'
  const digits = '0123456789'
  const nfa = Nfa.fromReg(new Concat(
    new Alter(...letters.split('')),
    new Asterisk(new Alter(...(letters + digits).split('')))
  ))
  expect(naiveSimulateOfNfa(nfa, '')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'a2')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, 'ab2bac')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, '3')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, '333')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, '33aa')).toBe(false)
  expect(naiveSimulateOfNfa(nfa, 'aa33')).toBe(true)
  expect(naiveSimulateOfNfa(nfa, '$ac2')).toBe(false)
})

test('dfa: regular expression Letter(Letter|Digit)*', () => {
  const letters = 'abcdefghijklmnopqrstuvwxzy'
  const digits = '0123456789'
  const dfa = Dfa.fromNfa(Nfa.fromReg(new Concat(
    new Alter(...letters.split('')),
    new Asterisk(new Alter(...(letters + digits).split('')))
  )))
  expect(dfa.test('')).toBe(false)
  expect(dfa.test('a2')).toBe(true)
  expect(dfa.test('ab2bac')).toBe(true)
  expect(dfa.test('3')).toBe(false)
  expect(dfa.test('333')).toBe(false)
  expect(dfa.test('33aa')).toBe(false)
  expect(dfa.test('aa33')).toBe(true)
  expect(dfa.test('$ac2')).toBe(false)
})
