import { escapeWhitespaces } from 'common/basic'
import { CharAtom, Item, parse } from 'scanning/RegParser'

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

export interface RegRef {
  type: 'reg-ref'
  name: string
}

export type CharsetRange = string | { from: string, to: string }

export interface Charset {
  type: 'charset'
  ranges: CharsetRange[]
}

export type Reg = Literal | Concat | Alter | Asterisk | Plus | Optional | RegRef | Charset

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

export function regRef(name: string): RegRef {
  return { type: 'reg-ref', name }
}

export function charset(ranges: CharsetRange[]): Charset {
  return { type: 'charset', ranges }
}

/** 将Reg转换为字符串的形式 */
function stringify(reg: Reg): string {
  if (reg.type === 'literal') {
    return Array.from(reg.string).map(escapeWhitespaces).join('')
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
  } else if (reg.type === 'reg-ref') {
    return `{${reg.name}}`
  } else if (reg.type === 'charset') {
    const parts = reg.ranges.map(r => typeof r === 'string' ? r : `${r.from}-${r.to}`)
    const escaped = Array.from(parts.join('')).map(escapeWhitespaces).join('')
    return `[${escaped}]`
  } else {
    throw new Error('Invalid reg')
  }
}

function convert(item: Item): Reg {
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
      const subRegs = item.subItems.map(convert)
      const resultRegs: Reg[] = []
      const chars: string[] = []
      const flush = () => {
        if (chars.length > 0) {
          resultRegs.push(literal(chars.join('')))
          chars.length = 0
        }
      }

      // Merge adjacent literal-regs to one big literal-reg
      for (const subReg of subRegs) {
        if (subReg.type === 'literal') {
          chars.push(subReg.string)
        } else {
          flush()
          resultRegs.push(subReg)
        }
      }
      flush()
      if (resultRegs.length === 1) {
        return resultRegs[0]
      } else {
        return concat(...resultRegs)
      }
    }
  } else if (item.type === 'atom') {
    if (item.atomType === 'asterisk') {
      return asterisk(convert(item.subItem))
    } else if (item.atomType === 'plus') {
      return plus(convert(item.subItem))
    } else if (item.atomType === 'optional') {
      return optional(convert(item.subItem))
    } else if (item.atomType === 'reg-ref') {
      return regRef(item.name)
    } else if (item.atomType === 'parenthesis') {
      return convert(item.subItem)
    } else if (item.atomType === 'charset') {
      return charset(item.ranges)
    } else {
      return literal((item as CharAtom).char)
    }
  } else { // item.type === 'left-paren'
    throw new Error('invalid RegParser.Item')
  }
}

export const Reg = {
  parse: (input: string) => convert(parse(input)),
  stringify,
}
