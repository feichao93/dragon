import { NFASimulator, NFA, Reg } from '../src'
import { NFAAcceptAction } from '../src/scanning/NFA'

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

  function rule(regString: string, acceptAction: NFAAcceptAction<Token>) {
    return NFA.fromReg<Token>(Reg.parse(regString), acceptAction)
  }

  const simulator = new NFASimulator(NFA.mergeNFAs<Token>(
    rule(' +', whitespaces),
    rule('if', () => reserved('if')),
    rule('then', () => reserved('then')),
    rule('else', () => reserved('else')),
    rule(`${letter}(${letter}|${digit})*`, identifier),
    rule('<', () => operator('<')),
    rule('<=', () => operator('<=')),
    rule('=', () => operator('=')),
    rule('!=', () => operator('!=')),
    rule('>', () => operator('>')),
    rule('>=', () => operator('>=')),
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
