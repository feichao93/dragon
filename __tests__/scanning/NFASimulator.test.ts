import NFA from 'scanning/NFA'
import * as c from 'examples/c.lex'
import NFASimulator from 'scanning/NFASimulator'

describe('NFASimulator using examples/c.lex', () => {
  const letter = '(' + Array.from('abcdefghijklmnopqrstuvwxyz').join('|') + ')'
  const digit = '(' + Array.from('0123456789').join('|') + ')'

  const base = NFA.mergeNFAs(
    NFA.fromReg('if', () => c.reserved('if')),
    NFA.fromReg('then', () => c.reserved('then')),
    NFA.fromReg('else', () => c.reserved('else')),
    NFA.fromReg(`${letter}(${letter}|${digit})*`, c.identifier),
    NFA.fromReg('<', () => c.operator('<')),
    NFA.fromReg('<=', () => c.operator('<=')),
    NFA.fromReg('=', () => c.operator('=')),
    NFA.fromReg('!=', () => c.operator('!=')),
    NFA.fromReg('>', () => c.operator('>')),
    NFA.fromReg('>=', () => c.operator('>=')),
  )

  const simulatorWithWS = new NFASimulator(NFA.mergeNFAs(
    NFA.fromReg(' +', c.whitespaces),
    base,
  ))

  const simulator = new NFASimulator(NFA.mergeNFAs(
    NFA.fromReg(' +' /* no action and no return */),
    base,
  ))

  test('recognize different tokens', () => {
    const input = 'if then else ident1 < <= = != > >='
    expect(Array.from(simulator.tokens(input)))
      .toEqual([
        c.reserved('if'),
        c.reserved('then'),
        c.reserved('else'),
        c.identifier('ident1'),
        c.operator('<'),
        c.operator('<='),
        c.operator('='),
        c.operator('!='),
        c.operator('>'),
        c.operator('>='),
      ])
  })

  test('tell between identifiers and reserved words', () => {
    const input = 'then ifi if else elsethen'
    const actual = Array.from(simulator.tokens(input))
    const expected = [
      c.reserved('then'),
      c.identifier('ifi'),
      c.reserved('if'),
      c.reserved('else'),
      c.identifier('elsethen'),
    ]

    expect(actual).toEqual(expected)
  })

  test('prefer longer prefix than shorter prefix', () => {
    const input = '>>=<==!=='
    const actual = Array.from(simulator.tokens(input))
    const expected = [
      c.operator('>'),
      c.operator('>='),
      c.operator('<='),
      c.operator('='),
      c.operator('!='),
      c.operator('='),
    ]
    expect(actual).toEqual(expected)
  })

  test('recognize whitespaces', () => {
    const input = '> =   >= hello else'
    const actual = Array.from(simulatorWithWS.tokens(input))
    const expected = [
      c.operator('>'),
      c.whitespaces(),
      c.operator('='),
      c.whitespaces(),
      c.operator('>='),
      c.whitespaces(),
      c.identifier('hello'),
      c.whitespaces(),
      c.reserved('else'),
    ]
    expect(actual).toEqual(expected)
  })
})
