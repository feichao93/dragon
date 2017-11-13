import { grammar } from 'examples/simple-arithmetic.grammar'
import { endmarker, epsilon } from 'basic'
import Parser from 'parsing/Parser'
import SLR1Parser from 'parsing/SLR1Parser'
import Grammar from 'parsing/Grammar'

const parser: Parser = SLR1Parser.fromGrammar(grammar)

test('Parser#resolve', () => {
  expect(parser.resolve('Symbol($)')).toBe(endmarker)
  expect(parser.resolve('Symbol(ϵ)')).toBe(epsilon)
  expect(parser.resolve('::T')).toEqual({
    type: 'nonterminal',
    alias: Grammar.defaultAlias,
    name: 'T',
  })
  expect(parser.resolve('factor:F')).toEqual({
    type: 'nonterminal',
    alias: 'factor',
    name: 'F',
  })
  expect(parser.resolve(':id')).toEqual({
    type: 'terminal',
    alias: '',
    name: 'id',
  })
  expect(parser.resolve('a:id')).toEqual({
    type: 'terminal',
    alias: 'a',
    name: 'id',
  })
  expect(parser.resolve('hello')).toEqual({
    type: 'token',
    token: 'hello',
  })
})

test('Parser.stringify', () => {
  expect(Parser.stringify(endmarker)).toEqual('Symbol($)')
  expect(Parser.stringify(epsilon)).toEqual('Symbol(ϵ)')
  expect(Parser.stringify({
    type: 'nonterminal',
    alias: Grammar.defaultAlias,
    name: 'T',
  })).toEqual('::T',)
  expect(Parser.stringify({
    type: 'nonterminal',
    alias: 'factor',
    name: 'F',
  })).toEqual('factor:F',)
  expect(Parser.stringify({
    type: 'terminal',
    alias: '',
    name: 'id',
  })).toEqual(':id',)
  expect(Parser.stringify({
    type: 'terminal',
    alias: 'a',
    name: 'id',
  })).toEqual('a:id',)
  expect(Parser.stringify({
    type: 'token',
    token: 'hello',
  })).toEqual('hello',)
})

test('error handling', () => {
  expect(() => parser.resolve(':N')).toThrow('Cannot resolve :N')
})
