import * as invariant from 'invariant'

export type LeftParen = { type: 'left-paren' }
export type AtomType = 'parenthesis' | 'asterisk' | 'plus' | 'optional'
export type Atom = { type: 'atom', subItem: Item, atomType: AtomType }
export type Char = { type: 'char', char: string }
export type ConcatItem = { type: 'concat', subItems: Item[] }
export type AlterItem = { type: 'alter', subItems: Item[] }
export type Item = LeftParen | AlterItem | ConcatItem | Atom | Char

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
    } else { // alter / atom / char
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

  for (const char of input) {
    let processAsNormalChar = false
    if (!escape) {
      if (char === '(') {
        stack.ensureLevelOfTopItemToConcat()
        stack.pushLeftParen()
      } else if (char === ')') {
        stack.ensureLevelOfTopItemToAlter()
        const subItem = stack.pop()!
        invariant(subItem.type !== 'left-paren', 'Empty item encountered')
        stack.pop() // pop left-paren
        stack.push({ type: 'atom', subItem, atomType: 'parenthesis' })
      } else if (char === '*') {
        stack.push({ type: 'atom', subItem: stack.pop()!, atomType: 'asterisk' })
      } else if (char === '+') {
        stack.push({ type: 'atom', subItem: stack.pop()!, atomType: 'plus' })
      } else if (char === '?') {
        stack.push({ type: 'atom', subItem: stack.pop()!, atomType: 'optional' })
      } else if (char === '|') {
        stack.ensureLevelOfTopItemToAlter()
      } else if (char === '\\') {
        escape = true
      } else { // other characters
        processAsNormalChar = true
      }
    } else {
      invariant('\\|()*+?'.includes(char),
        'Escape can only be applied to \\ | ( ) * + ?')
      escape = false
      processAsNormalChar = true
    }

    if (processAsNormalChar) {
      const topItem = stack.top()
      if (topItem && (topItem.type === 'atom' || topItem.type === 'char')) {
        stack.ensureLevelOfTopItemToConcat()
      }
      stack.push({ type: 'char', char })
    }
  }
  stack.ensureLevelOfTopItemToAlter()
  invariant(!escape, 'Unmatched escape')
  invariant(stack.s.length === 1, 'Invalid reg')
  return stack.top()
}
