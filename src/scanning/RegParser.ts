import * as invariant from 'invariant'

function unescape(char: string) {
  if (char === 't') {
    return '\t'
  } else if (char === 'n') {
    return '\n'
  } else {
    return char
  }
}

export interface RegRef {
  type: 'reg-ref',
  name: string
}

export type AtomSubItem = Atom | Char | RegRef

export interface LeftParen {
  type: 'left-paren'
}

export type AtomType = 'parenthesis' | 'asterisk' | 'plus' | 'optional' | 'reg-ref'

// TODO Atom和Char的优先级其实是相同的, 可以在atom中新增atomType:char, 然后将Char归并到Atom
export interface Atom {
  type: 'atom',
  subItem: AtomSubItem,
  atomType: AtomType
}

export interface Char {
  type: 'char',
  char: string
}

export type ConcatItem = { type: 'concat', subItems: Item[] }
export type AlterItem = { type: 'alter', subItems: Item[] }
export type Item = LeftParen | AlterItem | ConcatItem | Atom | Char | RegRef

export class Stack {
  readonly s: Item[] = []

  pushLeftParen() {
    this.s.push({ type: 'left-paren' })
  }

  push(item: Item) {
    this.s.push(item)
  }

  pop() {
    return this.s.pop()
  }

  top() {
    return this.s[this.s.length - 1]
  }

  ensureLevelOfTopItemToAlter() {
    this.ensureLevelOfTopItemToConcat()
    // After call `ensureConcatLevel`, topItem must be ConcatItem | AlterItem | LeftParen
    const topItem = this.top() as ConcatItem | AlterItem | LeftParen
    if (topItem.type === 'alter' || topItem.type === 'left-paren') {
      return
    }
    // else topItem.type === 'concat'
    this.pop()
    const item: AlterItem = { type: 'alter', subItems: [topItem] }

    const lastItem = this.top()
    if (lastItem && lastItem.type === 'alter') {
      this.pop()
      // merge adjacent alter
      item.subItems.unshift(...lastItem.subItems)
    }
    this.push(item)
  }

  ensureLevelOfTopItemToConcat() {
    const item: ConcatItem = { type: 'concat', subItems: [] }
    const topItem = this.top()
    if (topItem == null) {
      this.push(item)
      return
    } else if (topItem.type === 'left-paren'
      || topItem.type === 'alter'
      || topItem.type === 'concat') {
      // Already at level concat or higher
      return
    } else { // atom / char
      this.pop()
      item.subItems.push(topItem)
    }

    // merge adjancent concat
    const lastItem = this.top()
    if (lastItem && lastItem.type === 'concat') {
      this.pop()
      item.subItems.unshift(...lastItem.subItems)
    }
    this.push(item)
  }
}

/** 从字符串中解析Reg */
export function parse(input: string) {
  const stack = new Stack()
  let escape = false
  let inRegRef = false
  let regRefName: string[] = []

  for (let char of input) {
    let processAsNormalChar = false
    if (inRegRef && char !== '}') {
      invariant(/[a-zA-Z_]/.test(char), 'Must be a letter or underscore')
      regRefName.push(char)
      continue
    }
    if (!escape) {
      if (char === '(') {
        stack.ensureLevelOfTopItemToConcat()
        stack.pushLeftParen()
      } else if (char === ')') {
        stack.ensureLevelOfTopItemToAlter()
        const subItem = stack.pop()!
        invariant(subItem.type !== 'left-paren', 'Empty item encountered')
        stack.pop() // pop left-paren
        stack.push({ type: 'atom', subItem: subItem as AtomSubItem, atomType: 'parenthesis' })
      } else if (char === '{') {
        stack.ensureLevelOfTopItemToConcat()
        inRegRef = true
      } else if (char === '}') {
        invariant(inRegRef, 'Unmatched close curly brace')
        stack.push({ type: 'atom', atomType: 'reg-ref', subItem: { type: 'reg-ref', name: regRefName.join('') } })
        regRefName.length = 0
        inRegRef = false
      } else if (char === '*') {
        stack.push({ type: 'atom', subItem: stack.pop() as AtomSubItem, atomType: 'asterisk' })
      } else if (char === '+') {
        stack.push({ type: 'atom', subItem: stack.pop() as AtomSubItem, atomType: 'plus' })
      } else if (char === '?') {
        stack.push({ type: 'atom', subItem: stack.pop() as AtomSubItem, atomType: 'optional' })
      } else if (char === '|') {
        stack.ensureLevelOfTopItemToAlter()
      } else if (char === '\\') {
        escape = true
      } else { // other characters
        processAsNormalChar = true
      }
    } else {
      invariant('\\|(){}*+?tn'.includes(char),
        'Escape can only be applied to \\ | ( ) { } * + ? tab newline')
      char = unescape(char)
      escape = false
      processAsNormalChar = true
    }

    if (processAsNormalChar) {
      stack.ensureLevelOfTopItemToConcat()
      stack.push({ type: 'char', char })
    }
  }
  invariant(!escape, 'Unmatched escape')
  invariant(!inRegRef, 'Unmatched open curly brace')
  stack.ensureLevelOfTopItemToAlter()
  invariant(stack.s.length === 1, 'Invalid reg')
  return stack.top()
}
