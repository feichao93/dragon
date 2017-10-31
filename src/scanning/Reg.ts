export interface Empty {
  type: 'empty'
}

export interface Literal {
  type: 'literal'
  string: string
}

export interface Concat {
  type: 'concat'
  subregs: Reg[]
}

export interface Alter {
  type: 'alter'
  subregs: Reg[]
}

export interface Asterisk {
  type: 'asterisk'
  subreg: Reg
}

export interface Plus {
  type: 'plus'
  subreg: Reg
}

export interface Optional {
  type: 'optional'
  subreg: Reg
}

export type Reg = Literal | Concat | Alter | Asterisk | Plus | Optional | Empty

export function literal(string: string): Literal {
  return { type: 'literal', string }
}

export function concat(...subregs: Reg[]): Concat {
  return { type: 'concat', subregs: subregs }
}

export function alter(...regs: Reg[]): Alter {
  return { type: 'alter', subregs: regs }
}

export function asterisk(reg: Reg): Asterisk {
  return { type: 'asterisk', subreg: reg }
}

export function plus(reg: Reg): Plus {
  return { type: 'plus', subreg: reg }
}

export function optional(subreg: Reg): Optional {
  return { type: 'optional', subreg }
}

function topOfStack<T>(stack: T[]) {
  return stack[stack.length - 1]
}

function empty<T>(stack: T[]) {
  return stack.length === 0
}

type LeftParen = { type: 'left-paren' }
type Atom = { type: 'atom', reg: Reg }
type Word = { type: 'word', chars: string[] }
type StackItem = LeftParen | Atom | Word | Reg

function nonemptyReg(reg: Reg) {
  return reg.type !== 'empty'
}

function termReg(reg: StackItem): reg is Plus | Asterisk | Optional {
  return reg.type === 'plus' || reg.type === 'asterisk' || reg.type === 'optional'
}

/** 将Reg转换为字符串的形式 */
function stringify(reg: Reg): string {
  if (reg.type === 'literal') {
    return reg.string
  } else if (reg.type === 'alter') {
    return reg.subregs.map(stringify).join('|')
  } else if (reg.type === 'concat') {
    return reg.subregs.map(subreg => {
      if (subreg.type === 'alter') {
        return `(${stringify(subreg)})`
      } else {
        return stringify(subreg)
      }
    }).join('')
  } else if (reg.type === 'asterisk') {
    if (reg.subreg.type === 'alter' || reg.subreg.type === 'concat') {
      return `(${stringify(reg.subreg)})*`
    } else {
      return `${stringify(reg.subreg)}*`
    }
  } else if (reg.type === 'plus') {
    if (reg.subreg.type === 'alter' || reg.subreg.type === 'concat') {
      return `(${stringify(reg.subreg)})+`
    } else {
      return `${stringify(reg.subreg)}+`
    }
  } else if (reg.type === 'optional') {
    if (reg.subreg.type === 'alter' || reg.subreg.type === 'concat') {
      return `(${stringify(reg.subreg)})?`
    } else {
      return `${stringify(reg.subreg)}?`
    }
  } else {
    throw new Error('Invalid reg')
  }
}

/** 从字符串中解析Reg */
function parse(input: string) {
  const leftParen: LeftParen = { type: 'left-paren' }
  const stack: StackItem[] = []

  function ensureAlterLevel() {
    ensureConcatLevel()
    // after call `ensureConcatLevel`, topItem must be Concat
    const topItem = stack.pop() as Concat
    const item = alter(flatten(topItem))

    // merge adjacent alter
    if (!empty(stack)) {
      const cntTopItem = topOfStack(stack)
      if (cntTopItem.type === 'alter') {
        cntTopItem.subregs = cntTopItem.subregs.concat(item.subregs)
      } else {
        stack.push(item)
      }
    } else {
      stack.push(item)
    }
  }

  function ensureConcatLevel() {
    if (!empty(stack)) {
      const topItem = topOfStack(stack)
      let item: Concat
      if (topItem.type === 'word') {
        stack.pop()
        item = concat({
          type: 'literal',
          string: topItem.chars.join(''),
        })
      } else if (topItem.type === 'atom') {
        stack.pop()
        item = concat(topItem.reg)
      } else if (termReg(topItem)) {
        stack.pop()
        item = concat(topItem)
      } else {
        item = concat()
      }

      // merge adjancent concat
      if (!empty(stack)) {
        const cntTopItem = topOfStack(stack)
        if (cntTopItem.type === 'concat') {
          cntTopItem.subregs = cntTopItem.subregs.concat(item.subregs)
        } else {
          stack.push(item)
        }
      } else {
        stack.push(item)
      }
    }
  }

  function popSubRegOfTerm(): Reg {
    const topItem = topOfStack(stack)
    if (topItem.type === 'atom') {
      stack.pop()
      return topItem.reg
    } else if (topItem.type === 'word') {
      stack.pop()
      return { type: 'literal', string: topItem.chars.join('') }
    } else if (termReg(topItem)) {
      stack.pop()
      return topItem
    } else {
      throw new Error('* + ? can only be used with term/literal/atom')
    }
  }

  for (const char of input) {
    if (char === '(') {
      ensureConcatLevel()
      stack.push(leftParen)
    } else if (char === ')') {
      ensureAlterLevel()
      const topItem = stack.pop() as Alter
      stack.pop() // pop left-paren
      stack.push({ type: 'atom', reg: flatten(topItem) })
    } else if (char === '*') {
      stack.push(asterisk(popSubRegOfTerm()))
    } else if (char === '+') {
      stack.push(plus(popSubRegOfTerm()))
    } else if (char === '?') {
      stack.push(optional(popSubRegOfTerm()))
    } else if (char === '|') {
      ensureAlterLevel()
    } else { // other characters
      let topItem = topOfStack(stack)
      if (topItem == null) {
        stack.push({ type: 'word', chars: [char] })
      } else if (topItem.type === 'atom') {
        ensureConcatLevel()
        stack.push({ type: 'word', chars: [char] })
      } else if (topItem.type === 'word') {
        topItem.chars.push(char)
      } else if (termReg(topItem)) {
        ensureConcatLevel()
        stack.push({ type: 'word', chars: [char] })
      } else {
        stack.push({ type: 'word', chars: [char] })
      }
    }
  }
  ensureAlterLevel()
  console.assert(stack.length === 1)
  return flatten(stack[0] as Reg)
}

function flatten(reg: Reg): Reg {
  if (reg.type === 'literal' || reg.type === 'empty') {
    return reg
  } else if (reg.type === 'concat') {
    const r = reg.subregs.map(flatten).filter(nonemptyReg)
    if (r.length === 0) {
      return { type: 'empty' }
    } else if (r.length === 1) {
      return r[0]
    } else {
      return { type: 'concat', subregs: r }
    }
  } else if (reg.type === 'alter') {
    const r = reg.subregs.map(flatten).filter(nonemptyReg)
    if (r.length === 0) {
      return { type: 'empty' }
    } else if (r.length === 1) {
      return r[0]
    } else {
      return { type: 'alter', subregs: r }
    }
  } else if (reg.type === 'asterisk') {
    const flat = flatten(reg.subreg)
    if (flat.type === 'empty') {
      return flat
    } else {
      return { type: 'asterisk', subreg: flat }
    }
  } else if (reg.type === 'plus') {
    const flat = flatten(reg.subreg)
    if (flat.type === 'empty') {
      return flat
    } else {
      return { type: 'plus', subreg: flat }
    }
  } else if (reg.type === 'optional') {
    const flat = flatten(reg.subreg)
    if (flat.type === 'empty') {
      return flat
    } else {
      return { type: 'optional', subreg: flat }
    }
  } else {
    throw new Error('Invalid reg')
  }
}

export const Reg = {
  parse,
  stringify,
  flatten,
}
