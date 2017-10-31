import { alter, asterisk, concat, literal, plus, Reg, NFA, DFA } from '../src'

test('nfa: regular expression abc', () => {
  const nfa = NFA.fromReg(literal('abc'))
  expect(nfa.test('')).toBe(false)
  expect(nfa.test('abc')).toBe(true)
  expect(nfa.test('ab')).toBe(false)
  expect(nfa.test('abcd')).toBe(false)
  expect(nfa.test('abcabc')).toBe(false)
})

test('dfa: regular expression abc', () => {
  const dfa = DFA.fromNFA(NFA.fromReg(literal('abc')))
  expect(dfa.test('')).toBe(false)
  expect(dfa.test('abc')).toBe(true)
  expect(dfa.test('ab')).toBe(false)
  expect(dfa.test('abcd')).toBe(false)
  expect(dfa.test('abcabc')).toBe(false)
})

test('nfa: regular expression a*', () => {
  const nfa = NFA.fromReg(asterisk(literal('a')))

  expect(nfa.test('')).toBe(true)
  expect(nfa.test('a')).toBe(true)
  expect(nfa.test('aa')).toBe(true)
  expect(nfa.test('aaa')).toBe(true)
  expect(nfa.test('aaaaaaaa')).toBe(true)
  expect(nfa.test('b')).toBe(false)
  expect(nfa.test('aab')).toBe(false)
  expect(nfa.test('baaa')).toBe(false)
  expect(nfa.test('aaaba')).toBe(false)
  expect(nfa.test('abaaaa')).toBe(false)

})

test('dfa: regular expression a*', () => {
  const dfa = DFA.fromNFA(NFA.fromReg(asterisk(literal('a'))))
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
  const nfa = NFA.fromReg(concat(asterisk(literal('a')), literal('b')))
  expect(nfa.test('b')).toBe(true)
  expect(nfa.test('b')).toBe(true)
  expect(nfa.test('a*b')).toBe(false)
  expect(nfa.test('ab')).toBe(true)
  expect(nfa.test('aab')).toBe(true)
  expect(nfa.test('aaab')).toBe(true)
  expect(nfa.test('aaaaaaaaab')).toBe(true)
  expect(nfa.test('aba')).toBe(false)
})

test('dfa: regular expression a*b', () => {
  const dfa = DFA.fromNFA(NFA.fromReg(concat(asterisk(literal('a')), literal('b'))))
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
  const nfa = NFA.fromReg(concat(
    alter(...letters.split('').map(literal)),
    asterisk(alter(...(letters + digits).split('').map(literal))),
  ))
  expect(nfa.test('')).toBe(false)
  expect(nfa.test('a2')).toBe(true)
  expect(nfa.test('ab2bac')).toBe(true)
  expect(nfa.test('3')).toBe(false)
  expect(nfa.test('333')).toBe(false)
  expect(nfa.test('33aa')).toBe(false)
  expect(nfa.test('aa33')).toBe(true)
  expect(nfa.test('$ac2')).toBe(false)
})

test('dfa: regular expression Letter(Letter|Digit)*', () => {
  const letters = 'abcdefghijklmnopqrstuvwxzy'
  const digits = '0123456789'
  const dfa = DFA.fromNFA(NFA.fromReg(concat(
    alter(...letters.split('').map(literal)),
    asterisk(alter(...(letters + digits).split('').map(literal))),
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

test('nfa: regular expression (ab)+', () => {
  const reg = plus(literal('ab'))
  const nfa = NFA.fromReg(reg)

  expect(nfa.test('')).toBe(false)
  expect(nfa.test('ab')).toBe(true)
  expect(nfa.test('abab')).toBe(true)
  expect(nfa.test('ababababab')).toBe(true)
  expect(nfa.test('abababababa')).toBe(false)
  expect(nfa.test('abbb')).toBe(false)
})

test('dfa: regular expression (ab)+', () => {
  const reg = plus(literal('ab'))
  const nfa = NFA.fromReg(reg)
  const dfa = DFA.fromNFA(nfa)

  expect(dfa.test('')).toBe(false)
  expect(dfa.test('ab')).toBe(true)
  expect(dfa.test('abab')).toBe(true)
  expect(dfa.test('ababababab')).toBe(true)
  expect(dfa.test('abababababa')).toBe(false)
  expect(dfa.test('abbb')).toBe(false)
})

test('nfa: regular expression of IPv4 digit+.digit+.digit+.digit+', () => {
  const digits = '0123456789'
  const reg = concat(
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
  )
  expect(Reg.stringify(reg)).toBe('(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+')

  const nfa = NFA.fromReg(reg)

  expect(nfa.test('10.214.224.29')).toBe(true)
  expect(nfa.test('0.0.0.0')).toBe(true)
  expect(nfa.test('12.34.56.78')).toBe(true)
  expect(nfa.test('1.2.3')).toBe(false)
  expect(nfa.test('')).toBe(false)
  expect(nfa.test('1.2.3.4.5')).toBe(false)
  expect(nfa.test('.214.224.29')).toBe(false)
  expect(nfa.test('10..224.29')).toBe(false)
})

test('dfa: regular expression of IPv4 digit+.digit+.digit+.digit+', () => {
  const digits = '0123456789'
  const reg = concat(
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
    literal('.'),
    plus(alter(...digits.split('').map(literal))),
  )
  expect(Reg.stringify(reg)).toBe('(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+.(0|1|2|3|4|5|6|7|8|9)+')

  const nfa = NFA.fromReg(reg)
  const dfa = DFA.fromNFA(nfa)

  expect(dfa.test('10.214.224.29')).toBe(true)
  expect(dfa.test('0.0.0.0')).toBe(true)
  expect(dfa.test('12.34.56.78')).toBe(true)
  expect(dfa.test('1.2.3')).toBe(false)
  expect(dfa.test('')).toBe(false)
  expect(dfa.test('1.2.3.4.5')).toBe(false)
  expect(dfa.test('.214.224.29')).toBe(false)
  expect(dfa.test('10..224.29')).toBe(false)
})
