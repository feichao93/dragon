import { alter, asterisk, concat, literal, optional, plus, Reg } from '../src'

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

test('parse (a+|c?)?a+b++(ab|cd)*', () => {
  const stringFormat = '(a+|c?)?a+b++(ab|cd)*'
  const objFormat = concat(
    optional(alter(
      plus(literal('a')),
      optional(literal('c')),
    )),
    plus(literal('a')),
    plus(plus(literal('b'))),
    asterisk(alter(
      literal('ab'),
      literal('cd'),
    ))
  )
  expect(Reg.parse(stringFormat)).toEqual(objFormat)
  expect(Reg.stringify(objFormat)).toBe(stringFormat)
})

test('test empty alter/concat', () => {
  expect(Reg.parse('()?|()+|()*')).toEqual({ type: 'empty' })
})

test('test invalid reg', () => {
  expect(() => Reg.stringify({ type: 'invalid-type' } as any))
    .toThrow('Invalid reg')

  expect(() => Reg.flatten({ type: 'invalid-type' } as any))
    .toThrow('Invalid reg')

  expect(() => Reg.parse('a|*'))
    .toThrow('* + ? can only be used with term/literal/atom')
})

test('escape in Reg.parse(...)', () => {
  expect(Reg.parse('\\(')).toEqual(literal('('))
  expect(Reg.parse('\\\\')).toEqual(literal('\\'))
  expect(Reg.parse('(\\(\\)|\\\\)+')).toEqual(plus(alter(literal('\(\)'), literal('\\'))))
})
