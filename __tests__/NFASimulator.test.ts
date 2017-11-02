import { NFA, NFASimulator } from '../src'

test('Simple lexical analyzer', () => {
  type Token = WhitespacesToken | ReservedWordToken | IdentifierToken | OperatorToken

  interface WhitespacesToken {
    type: 'whitespaces'
  }

  interface ReservedWordToken {
    type: 'reserved',
    word: ReservedWord
  }

  interface IdentifierToken {
    type: 'identifier',
    name: string
  }

  interface OperatorToken {
    type: 'operator',
    op: Operator
  }

  type ReservedWord = 'if' | 'else' | 'then'
  type Operator = '<' | '<=' | '=' | '>' | '>=' | '!='

  function whitespaces(): Token {
    return { type: 'whitespaces' }
  }

  function reserved(word: ReservedWord): Token {
    return { type: 'reserved', word }
  }

  function identifier(name: string): Token {
    return { type: 'identifier', name }
  }

  function operator(op: Operator): Token {
    return { type: 'operator', op }
  }

  const letter = '(' + Array.from('abcdefghijklmnopqrstuvwxyz').join('|') + ')'
  const digit = '(' + Array.from('0123456789').join('|') + ')'

  const simulator = new NFASimulator(NFA.mergeNFAs(
    NFA.fromReg(' +', whitespaces),
    NFA.fromReg('if', () => reserved('if')),
    NFA.fromReg('then', () => reserved('then')),
    NFA.fromReg('else', () => reserved('else')),
    NFA.fromReg(`${letter}(${letter}|${digit})*`, identifier),
    NFA.fromReg('<', () => operator('<')),
    NFA.fromReg('<=', () => operator('<=')),
    NFA.fromReg('=', () => operator('=')),
    NFA.fromReg('!=', () => operator('!=')),
    NFA.fromReg('>', () => operator('>')),
    NFA.fromReg('>=', () => operator('>=')),
  ))

  const input = 'foo >>=    then ifi if else'
  const actual = Array.from(simulator.tokens(input))
  const expected = [
    identifier('foo'),
    whitespaces(),
    operator('>'),
    operator('>='),
    whitespaces(),
    reserved('then'),
    whitespaces(),
    identifier('ifi'),
    whitespaces(),
    reserved('if'),
    whitespaces(),
    reserved('else'),
  ]

  expect(actual).toEqual(expected)
})
