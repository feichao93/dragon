import { LexerBuilder } from '../src'
import * as c from '../src/examples/c.lex'

describe('Lexical analyzer using examples/c.lex', () => {
  const builder = new LexerBuilder<c.Token>()
  const letters = 'abcdefghijklmnopqrstuvwxyz'

  builder.addDeclaration('delim', ' |\\t|\\n')
  builder.addDeclaration('ws', '{delim}+')
  builder.addDeclaration('letter', Array.from(letters + letters.toUpperCase()).join('|'))
  builder.addDeclaration('digit', Array.from('0123456789').join('|'))
  builder.addDeclaration('id', '{letter}({letter}|{digit})*')
  // builder.addDeclaration('number', '...') // TODO number

  builder.addRule('{ws}' /* no action and no return */)
  builder.addReservedWords(['if', 'then', 'else'], c.reserved)
  builder.addRule('{id}', c.identifier)
  // builder.addRule('{number}', c.number())
  builder.addRule('<', () => c.operator('<'))
  builder.addRule('<=', () => c.operator('<='))
  builder.addRule('=', () => c.operator('='))
  builder.addRule('!=', () => c.operator('!='))
  builder.addRule('>', () => c.operator('>'))
  builder.addRule('>=', () => c.operator('>='))

  const lexer = builder.build()

  test('test-1', () => {
    const input = 'if then else ident1 < <= = != > >='
    expect(Array.from(lexer.lex(input)))
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
})
