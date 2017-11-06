// Part of definitons for tokens of a C-like language
import * as invariant from 'invariant'

export type Token = WhitespacesToken | ReservedWordToken | IdentifierToken | NumberToken | OperatorToken

export interface WhitespacesToken {
  type: 'whitespaces'
}

export interface ReservedWordToken {
  type: 'reserved',
  word: ReservedWord
}

export interface IdentifierToken {
  type: 'identifier',
  name: string
}

export interface NumberToken {
  type: 'number'
  value: number
}

export interface OperatorToken {
  type: 'operator',
  op: Operator
}

export type ReservedWord = 'if' | 'else' | 'then'
export type Operator = '<' | '<=' | '=' | '>' | '>=' | '!='

export function whitespaces(): Token {
  return { type: 'whitespaces' }
}

export function reserved(word: string): Token {
  invariant('if/else/then'.split('/').includes(word), `Invalid reserved word ${word}`)
  return { type: 'reserved', word: word as ReservedWord }
}

export function identifier(name: string): Token {
  return { type: 'identifier', name }
}

export function number(s: string): Token {
  return { type: 'number', value: Number(s) }
}

export function operator(op: Operator): Token {
  return { type: 'operator', op }
}
