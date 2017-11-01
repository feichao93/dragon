import * as RegParser from './RegParser'

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

export type Reg = Literal | Concat | Alter | Asterisk | Plus | Optional

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
  } else if (reg.type === 'asterisk'
    || reg.type === 'plus'
    || reg.type === 'optional') {
    const { subreg } = reg
    const postfix = reg.type === 'asterisk' ? '*' : reg.type === 'plus' ? '+' : '?'
    const needParenthesis = subreg.type === 'alter'
      || subreg.type === 'concat'
      || subreg.type === 'literal' && subreg.string.length > 1
    const subregStr = stringify(reg.subreg)
    if (needParenthesis) {
      return `(${subregStr})${postfix}`
    } else {
      return `${subregStr}${postfix}`
    }
  } else {
    throw new Error('Invalid reg')
  }
}

function convert(item: RegParser.Item): Reg {
  if (item.type === 'alter') {
    if (item.subItems.length === 1) {
      return convert(item.subItems[0])
    } else {
      return alter(...item.subItems.map(convert))
    }
  } else if (item.type === 'concat') {
    if (item.subItems.length === 1) {
      return convert(item.subItems[0])
    } else {
      const regs: Reg[] = []
      const chars: string[] = []
      for (const subItem of item.subItems) {
        if (subItem.type === 'char') {
          chars.push(subItem.char)
        } else {
          if (chars.length > 0) {
            regs.push(literal(chars.join('')))
            chars.length = 0
          }
          regs.push(convert(subItem))
        }
      }
      if (chars.length > 0) {
        regs.push(literal(chars.join('')))
        chars.length = 0
      }
      if (regs.length === 1) {
        return regs[0]
      } else {
        return concat(...regs)
      }
    }
  } else if (item.type === 'atom') {
    if (item.atomType === 'asterisk') {
      return asterisk(convert(item.subItem))
    } else if (item.atomType === 'plus') {
      return plus(convert(item.subItem))
    } else if (item.atomType === 'optional') {
      return optional(convert(item.subItem))
    } else {
      return convert(item.subItem)
    }
  } else if (item.type === 'char') {
    return literal(item.char)
  } else { // item.type === 'left-paren'
    throw new Error('invalid RegParser.Item')
  }
}

export const Reg = {
  parse: (input: string) => convert(RegParser.parse(input)),
  stringify,
}
