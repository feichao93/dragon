interface Literal {
  type: 'literal'
  string: string
}

interface Concat {
  type: 'concat'
  regs: SimpleReg[]
}

interface Alter {
  type: 'alter'
  regs: SimpleReg[]
}

interface Asterisk {
  type: 'asterisk'
  reg: SimpleReg
}

interface Plus {
  type: 'plus'
  reg: SimpleReg
}

export type SimpleReg = Literal | Concat | Alter | Asterisk | Plus

export function literal(string: string): Literal {
  return { type: 'literal', string }
}

export function concat(...regs: SimpleReg[]): Concat {
  return { type: 'concat', regs }
}

export function alter(...regs: SimpleReg[]): Alter {
  return { type: 'alter', regs }
}

export function asterisk(reg: SimpleReg): Asterisk {
  return { type: 'asterisk', reg }
}

export function plus(reg: SimpleReg): Plus {
  return { type: 'plus', reg }
}

/**
 * 将SimpleReg转换为字符串的形式
 * todo 该函数输出的正则字符串的优先级不对
 */
export function toString(reg: SimpleReg): string {
  if (reg.type === 'literal') {
    return reg.string
  } else if (reg.type === 'concat') {
    return reg.regs.map(toString).join('')
  } else if (reg.type === 'alter') {
    return reg.regs.map(toString).join('|')
  } else if (reg.type === 'asterisk') {
    return `(${toString(reg.reg)})*`
  } else if (reg.type === 'plus') {
    return `(${toString(reg.reg)})+`
  } else {
    throw new Error('Invalid reg')
  }
}
