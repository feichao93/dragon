import { alter, asterisk, concat, literal, optional, plus, Reg } from '../build/scanning/Reg'

test('parse abc*', () => {
  expect(Reg.parse('abc*'))
    .toEqual(asterisk(literal('abc')))
})

test('parse a(b+)', () => {
  expect(Reg.parse('a(b+)'))
    .toEqual(concat(
      literal('a'),
      plus(literal('b')),
    ))
})

test('parse ab|cd', () => {
  expect(Reg.parse('ab|cd'))
    .toEqual(alter(literal('ab'), literal('cd')))
})

test('parse a+b+c+', () => {
  expect(Reg.parse('a+b+c+'))
    .toEqual(concat(
      plus(literal('a')),
      plus(literal('b')),
      plus(literal('c')),
    ))
})

test('parse a?|b*ccc+|d*', () => {
  const stringFormat = 'a?|b*ccc+|d*'
  const objFormat = alter(
    optional(literal('a')),
    concat(
      asterisk(literal('b')),
      plus(literal('ccc')),
    ),
    asterisk(literal('d')),
  )
  expect(Reg.parse(stringFormat)).toEqual(objFormat)
  expect(Reg.stringify(objFormat)).toBe(stringFormat)
})

test('parse (a?|b*cc)?d+|((e*f+)g?h|i)j', () => {
  const stringFormat = '(a?|b*cc)?d+|(e*f+g?h|i)j'
  const objFormat = alter(
    concat(
      optional(
        alter(
          optional(literal('a')),
          concat(
            asterisk(literal('b')),
            literal('cc'),
          ),
        ),
      ),
      plus(literal('d')),
    ),
    concat(
      alter(
        concat(
          asterisk(literal('e')),
          plus(literal('f')),
          optional(literal('g')),
          literal('h'),
        ),
        literal('i'),
      ),
      literal('j'),
    )
  )
  expect(Reg.parse(stringFormat)).toEqual(objFormat)
  expect(Reg.stringify(objFormat)).toBe(stringFormat)
})
