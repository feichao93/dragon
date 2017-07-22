interface Empty {
  type: 'empty'
}

interface Literal {
  type: 'literal'
  string: string
}

interface Concat {
  type: 'concat'
  regs: Reg[]
}

interface Alter {
  type: 'alter'
  regs: Reg[]
}

interface Asterisk {
  type: 'asterisk'
  reg: Reg
}

interface Plus {
  type: 'plus'
  reg: Reg
}

interface Optional {
  type: 'optional'
  reg: Reg
}

export type Reg = Literal | Concat | Alter | Asterisk | Plus | Optional | Empty

export function literal(string: string): Literal {
  return { type: 'literal', string }
}

export function concat(...subregs: Reg[]): Concat {
  return { type: 'concat', regs: subregs }
}

export function alter(...regs: Reg[]): Alter {
  return { type: 'alter', regs }
}

export function asterisk(reg: Reg): Asterisk {
  return { type: 'asterisk', reg }
}

export function plus(reg: Reg): Plus {
  return { type: 'plus', reg }
}

export function optional(reg: Reg): Optional {
  return { type: 'optional', reg }
}

function top<T>(stack: T[]) {
  return stack[stack.length - 1]
}

function empty<T>(stack: T[]) {
  return stack.length === 0
}

type LeftParen = { type: 'left-paren' }
type Atom = { type: 'atom', reg: Reg }
type Word = { type: 'word', chars: string[] }
type StackItem = { type: 'left-paren' } | Atom | Word | Reg

function nonemptyReg(reg: Reg) {
  return reg.type !== 'empty'
}

function isTerm(reg: StackItem): reg is Plus | Asterisk | Optional {
  return reg.type === 'plus' || reg.type === 'asterisk' || reg.type === 'optional'
}

/** 将Reg转换为字符串的形式 */
function stringify(reg: Reg): string {
  if (reg.type === 'literal') {
    return reg.string
  } else if (reg.type === 'alter') {
    return reg.regs.map(stringify).join('|')
  } else if (reg.type === 'concat') {
    return reg.regs.map(subreg => {
      if (subreg.type === 'alter') {
        return `(${stringify(subreg)})`
      } else {
        return stringify(subreg)
      }
    }).join('')
  } else if (reg.type === 'asterisk') {
    if (reg.reg.type === 'alter' || reg.reg.type === 'concat') {
      return `(${stringify(reg.reg)})*`
    } else {
      return `${stringify(reg.reg)}*`
    }
  } else if (reg.type === 'plus') {
    if (reg.reg.type === 'alter' || reg.reg.type === 'concat') {
      return `(${stringify(reg.reg)})+`
    } else {
      return `${stringify(reg.reg)}+`
    }
  } else if (reg.type === 'optional') {
    if (reg.reg.type === 'alter' || reg.reg.type === 'concat') {
      return `(${stringify(reg.reg)})?`
    } else {
      return `${stringify(reg.reg)}?`
    }
  } else {
    throw new Error('Invalid reg')
  }
}

function parse(input: string) {
  const leftParen: LeftParen = { type: 'left-paren' }
  const stack: StackItem[] = []

  function ensureAlterLevel() {
    ensureConcatLevel()
    const topItem = top(stack)
    let item: Alter
    if (topItem.type === 'concat') {
      stack.pop()
      item = alter(flatten(topItem))
    } else {
      item = alter()
    }

    // merge adjacent alter
    if (!empty(stack)) {
      const cntTopItem = top(stack)
      if (cntTopItem.type === 'alter') {
        cntTopItem.regs = cntTopItem.regs.concat(item.regs)
      } else {
        stack.push(item)
      }
    } else {
      stack.push(item)
    }
  }

  function ensureConcatLevel() {
    if (!empty(stack)) {
      const topItem = top(stack)
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
      } else if (isTerm(topItem)) {
        stack.pop()
        item = concat(topItem)
      } else {
        item = concat()
      }

      // merge adjancent concat
      if (!empty(stack)) {
        const cntTopItem = top(stack)
        if (cntTopItem.type === 'concat') {
          cntTopItem.regs = cntTopItem.regs.concat(item.regs)
        } else if (item) {
          stack.push(item)
        }
      } else {
        stack.push(item)
      }
    }
  }

  function popSubRegOfTerm(): Reg {
    const topItem = top(stack)
    if (topItem.type === 'atom') {
      stack.pop()
      return topItem.reg
    } else if (topItem.type === 'word') {
      stack.pop()
      return { type: 'literal', string: topItem.chars.join('') }
    } else if (isTerm(topItem)) {
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
      let topItem = top(stack)
      if (topItem == null) {
        stack.push({ type: 'word', chars: [char] })
      } else if (topItem.type === 'atom') {
        ensureConcatLevel()
        stack.push({ type: 'word', chars: [char] })
      } else if (topItem.type === 'word') {
        topItem.chars.push(char)
      } else if (isTerm(topItem)) {
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
    const r = reg.regs.map(flatten).filter(nonemptyReg)
    if (r.length === 0) {
      return { type: 'empty' }
    } else if (r.length === 1) {
      return r[0]
    } else {
      return { type: 'concat', regs: r }
    }
  } else if (reg.type === 'alter') {
    const r = reg.regs.map(flatten).filter(nonemptyReg)
    if (r.length === 0) {
      return { type: 'empty' }
    } else if (r.length === 1) {
      return r[0]
    } else {
      return { type: 'alter', regs: r }
    }
  } else if (reg.type === 'asterisk') {
    return { type: 'asterisk', reg: flatten(reg.reg) }
  } else if (reg.type === 'plus') {
    return { type: 'plus', reg: flatten(reg.reg) }
  } else if (reg.type === 'optional') {
    return { type: 'optional', reg: flatten(reg.reg) }
  } else {
    throw new Error('Invalid reg')
  }
}

// todo MAKE Reg a class!
export const Reg = {
  parse,
  stringify,
  flatten,
}
