import { alter, asterisk, charset, concat, literal, optional, plus, Reg, regRef } from '../src'

test('parse abc*', () => {
  expect(Reg.parse('abc*'))
    .toEqual(concat(
      literal('ab'),
      asterisk(literal('c'))),
    )
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

test('parse a+|b*|c?', () => {
  expect(Reg.parse('a+|b*|c?'))
    .toEqual(alter(
      plus(literal('a')),
      asterisk(literal('b')),
      optional(literal('c')),
    ))
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
      literal('cc'),
      plus(literal('c')),
    ),
    asterisk(literal('d')),
  )
  expect(Reg.parse(stringFormat)).toEqual(objFormat)
  expect(Reg.stringify(objFormat)).toBe(stringFormat)
})

test('par a?|(bc)+', () => {
  const stringFormat = 'a?|(bc)+'
  const objectFormat = alter(
    optional(literal('a')),
    plus(literal('bc')),
  )
  expect(Reg.parse(stringFormat)).toEqual(objectFormat)
  expect(Reg.stringify(objectFormat)).toEqual(stringFormat)
})

test('parse (a?|b*cc)?d+|(e*f+g?h|i)j', () => {
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

test('test invalid reg', () => {
  expect(() => Reg.stringify({ type: 'invalid-type' } as any))
    .toThrow('Invalid reg')
  expect(() => Reg.parse('()+'))
    .toThrow('Empty item encountered')

  // TODO
  // expect(() => Reg.parse('a|*'))
  //   .toThrow('* + ? can only be used with term/literal/atom')
})

test('escape in Reg.parse(...)', () => {
  expect(Reg.parse('\\(')).toEqual(literal('('))
  expect(Reg.parse('\\\\')).toEqual(literal('\\'))
  expect(Reg.parse('(\\(\\)|\\\\)+')).toEqual(plus(alter(literal('\(\)'), literal('\\'))))
  expect(Reg.parse('\\t\\n')).toEqual(literal('\t\n'))
  expect(Reg.parse('\\||\\[\\]')).toEqual(alter(literal('|'), literal('[]')))
})

test('parse reg-ref', () => {
  expect(Reg.parse('{A}')).toEqual(regRef('A'))
  expect(Reg.parse('{A}|{B}|{C}+')).toEqual(alter(
    regRef('A'),
    regRef('B'),
    plus(regRef('C')),
  ))
  expect(Reg.parse('{letter}({letter}|{digit})*')).toEqual(concat(
    regRef('letter'),
    asterisk(alter(regRef('letter'), regRef('digit'))),
  ))
})

test('parse character set', () => {
  expect(Reg.parse('[abc]')).toEqual(charset(['a', 'b', 'c']))
  expect(Reg.parse('[a-zA-Z]')).toEqual(charset([
    { from: 'a', to: 'z' },
    { from: 'A', to: 'Z' },
  ]))
  expect(Reg.parse('[*()|{}+\\[\\]]')).toEqual(charset(Array.from('*()|{}+[]')))
  expect(Reg.parse('[ab+]+')).toEqual(plus(charset(['a', 'b', '+'])))
  // TODO add more test for charset
})
