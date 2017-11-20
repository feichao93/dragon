import { grammar as g } from 'examples/simple-arithmetic.grammar'
import Parser from 'parsing/Parser'
import Grammar from 'parsing/Grammar'
import { resolve, stringify } from 'parsing/GrammarSymbol'

test('Parser#resolve', () => {
  expect(resolve(g, ':endmarker')).toEqual({ type: 'endmarker' })
  expect(resolve(g, ':epsilon')).toEqual({ type: 'epsilon' })
  expect(resolve(g, '::T')).toEqual({
    type: 'nonterminal',
    alias: Grammar.defaultAlias,
    name: 'T',
  })
  expect(resolve(g, 'factor:F')).toEqual({
    type: 'nonterminal',
    alias: 'factor',
    name: 'F',
  })
  expect(resolve(g, ':id')).toEqual({
    type: 'terminal',
    alias: '',
    name: 'id',
  })
  expect(resolve(g, 'a:id')).toEqual({
    type: 'terminal',
    alias: 'a',
    name: 'id',
  })
  expect(resolve(g, 'hello')).toEqual({
    type: 'literal',
    chars: 'hello',
  })
})

test('Parser.stringify', () => {
  expect(stringify({ type: 'endmarker' })).toEqual(':endmarker')
  expect(stringify({ type: 'epsilon' })).toEqual(':epsilon')
  expect(stringify({
    type: 'nonterminal',
    alias: Grammar.defaultAlias,
    name: 'T',
  })).toEqual('::T',)
  expect(stringify({
    type: 'nonterminal',
    alias: 'factor',
    name: 'F',
  })).toEqual('factor:F',)
  expect(stringify({
    type: 'terminal',
    alias: '',
    name: 'id',
  })).toEqual(':id',)
  expect(stringify({
    type: 'terminal',
    alias: 'a',
    name: 'id',
  })).toEqual('a:id',)
  expect(stringify({
    type: 'literal',
    chars: 'hello',
  })).toEqual('hello',)
})

test('error handling', () => {
  expect(() => resolve(g, ':N')).toThrow('Cannot resolve :N')
})
