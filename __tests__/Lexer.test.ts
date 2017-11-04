import { LexerBuilder } from '../src'
import * as c from '../src/examples/c.lex'

describe('Lexical analyzer using examples/c.lex', () => {
  const builder = new LexerBuilder<c.Token>()
    .addDeclaration('delim', '[ \\t\\n]')
    .addDeclaration('ws', '{delim}+')
    .addDeclaration('letter', '[a-zA-Z]')
    .addDeclaration('digit', '[0-9]')
    .addDeclaration('id', '{letter}({letter}|{digit})*')
    // Note that current the dot sign does not need to be escaped
    .addDeclaration('number', '{digit}+(.{digit}+)?(E[+-]?{digit}+)?')

    .addRule('{ws}' /* no action and no return */)
    .addReservedWords('if,then,else'.split(','), c.reserved)
    .addRule('{id}', c.identifier)
    .addRule('{number}', c.number)
    .addRule('<', () => c.operator('<'))
    .addRule('<=', () => c.operator('<='))
    .addRule('=', () => c.operator('='))
    .addRule('!=', () => c.operator('!='))
    .addRule('>', () => c.operator('>'))
    .addRule('>=', () => c.operator('>='))

  const nfaLexer = builder.build('nfa')
  const dfaLexer = builder.build('dfa')

  const input1 = 'if then else ident1 < <= = != > >='
  const expectedOutput1 = [
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
  ]

  const input2 = 'if x >= 1.234E-3 then print hello world else y = 1000'
  const expectedOutput2 = [
    c.reserved('if'),
    c.identifier('x'),
    c.operator('>='),
    c.number('1.234E-3'),
    c.reserved('then'),
    c.identifier('print'),
    c.identifier('hello'),
    c.identifier('world'),
    c.reserved('else'),
    c.identifier('y'),
    c.operator('='),
    c.number('1000'),
  ]

  test('nfa input1', () => expect(Array.from(nfaLexer.lex(input1))).toEqual(expectedOutput1))
  test('nfa input2', () => expect(Array.from(nfaLexer.lex(input2))).toEqual(expectedOutput2))
  test('dfa input1', () => expect(Array.from(dfaLexer.lex(input1))).toEqual(expectedOutput1))
  test('dfa input2', () => expect(Array.from(dfaLexer.lex(input2))).toEqual(expectedOutput2))
})
