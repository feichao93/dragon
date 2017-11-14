import * as invariant from 'invariant'
import { unescapeWhitespaces } from 'common/basic'

export interface LeftParenItem {
  type: 'left-paren'
}

export type Atom = SimpleAtom | RegRefAtom | CharAtom | CharsetAtom

export interface SimpleAtom {
  type: 'atom'
  atomType: 'parenthesis' | 'asterisk' | 'plus' | 'optional'
  subItem: Item
}

export interface RegRefAtom {
  type: 'atom'
  atomType: 'reg-ref'
  name: string
}

export type CharsetRange = string | { from: string, to: string }

export interface CharsetAtom {
  type: 'atom'
  atomType: 'charset'
  ranges: CharsetRange[]
}

export interface CharAtom {
  type: 'atom'
  atomType: 'char'
  char: string
}

export type ConcatItem = { type: 'concat', subItems: Item[] }
export type AlterItem = { type: 'alter', subItems: Item[] }
export type Item = LeftParenItem | AlterItem | ConcatItem | Atom

export class Stack {
  readonly s: Item[] = []

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
    // After call `ensureConcatLevel`, topItem must be ConcatItem | AlterItem | LeftParenItem
    const topItem = this.top() as ConcatItem | AlterItem | LeftParenItem
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
    } else if (topItem.type === 'atom') {
      this.pop()
      item.subItems.push(topItem)
    } else { // left-parent | alter | concat
      // Already at level concat or higher
      return
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

const codes = {
  digit0: 48,
  digit9: 57,
  A: 65,
  Z: 90,
  a: 97,
  z: 122,
}

function isValidCharsetRange(range: { from: string, to: string }) {
  const fromCode = range.from.charCodeAt(0)
  const toCode = range.to.charCodeAt(0)
  return codes.digit0 <= fromCode && fromCode < toCode && toCode <= codes.digit9
    || codes.A <= fromCode && fromCode < toCode && toCode <= codes.Z
    || codes.a <= fromCode && fromCode < toCode && toCode <= codes.z
}

/** 从字符串中解析Reg */
export function parse(input: string) {
  const stack = new Stack()
  // 标记是否正在进行字符转义
  let escape = false
  // 标记是否正在RegRef中(花括号)
  let inRegRef = false
  let regRefName: string[] = []
  // 标记是否正在charset中(方括号)
  let inCharset = false
  let charsetRanges: CharsetRange[] = []
  let rangeFrom: string | null = null
  let dashMet = false

  const flushRangeFrom = () => {
    if (rangeFrom) {
      charsetRanges.push(rangeFrom)
      rangeFrom = null
    }
  }

  const flushDashMet = () => {
    invariant(rangeFrom == null, 'flushDashMet() called when rangeFrom is not null')
    if (dashMet) {
      charsetRanges.push('-')
      dashMet = false
    }
  }

  for (let char of input) {
    let processAsNormalChar = false
    if (inCharset && !(char === ']' && !escape)) {
      // escape is ALLOWED in RegRef. So take care
      if (!escape) {
        if (char === '\\') {
          flushRangeFrom()
          flushDashMet()
          escape = true
        } else if (char === '-') {
          invariant(!dashMet, 'Two or more adjacent dashes is invalid in charset')
          if (rangeFrom == null) {
            charsetRanges.push('-')
          } else {
            dashMet = true
          }
        } else {
          if (rangeFrom == null) {
            rangeFrom = char
          } else {
            if (dashMet) {
              const range: CharsetRange = { from: rangeFrom, to: char }
              invariant(isValidCharsetRange(range), `Invalid charset range ${range.from}-${range.to}`)
              charsetRanges.push(range)
              rangeFrom = null
              dashMet = false
            } else {
              charsetRanges.push(rangeFrom)
              rangeFrom = char
            }
          }
        }
      } else {
        invariant('-\\[]tn'.includes(char),
          'Escape in charset can only be applied to - \\ [ ] tab newline')
        char = unescapeWhitespaces(char)
        escape = false
        // We assume that escaped character won't have the form `from-to`.
        charsetRanges.push(char)
      }
      continue
    }

    if (inRegRef && char !== '}') {
      // escape is NOT allowed in RegRef
      invariant(/[a-zA-Z_]/.test(char), 'Must be a letter or underscore')
      regRefName.push(char)
      continue
    }

    if (!escape) {
      if (char === '(') {
        stack.ensureLevelOfTopItemToConcat()
        stack.push({ type: 'left-paren' })
      } else if (char === ')') {
        stack.ensureLevelOfTopItemToAlter()
        const subItem = stack.pop()!
        invariant(subItem.type !== 'left-paren', 'Empty item encountered')
        stack.pop() // pop left-paren
        stack.push({ type: 'atom', atomType: 'parenthesis', subItem })
      } else if (char === '[') {
        stack.ensureLevelOfTopItemToConcat()
        inCharset = true
      } else if (char === ']') {
        invariant(inCharset, 'Unmatched close square bracket')
        flushRangeFrom()
        flushDashMet()
        stack.push({ type: 'atom', atomType: 'charset', ranges: charsetRanges })
        charsetRanges = []
        inCharset = false
      } else if (char === '{') {
        stack.ensureLevelOfTopItemToConcat()
        inRegRef = true
      } else if (char === '}') {
        invariant(inRegRef, 'Unmatched close curly brace')
        stack.push({ type: 'atom', atomType: 'reg-ref', name: regRefName.join('') })
        regRefName = []
        inRegRef = false
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
      invariant('\\|()[]{}*+?tn'.includes(char),
        'Escape can only be applied to \\ | ( ) [ ] { } * + ? tab newline')
      char = unescapeWhitespaces(char)
      escape = false
      processAsNormalChar = true
    }

    if (processAsNormalChar) {
      stack.ensureLevelOfTopItemToConcat()
      stack.push({ type: 'atom', atomType: 'char', char })
    }
  }
  invariant(!escape, 'Unmatched escape')
  invariant(!inRegRef, 'Unmatched open curly brace')
  stack.ensureLevelOfTopItemToAlter()
  invariant(stack.s.length === 1, 'Invalid reg')
  return stack.top()
}
