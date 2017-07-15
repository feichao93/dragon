type SimpleReg = string | symbol | Concat | Alter | Asterisk

export class Asterisk {
  reg: SimpleReg

  constructor(reg: SimpleReg) {
    this.reg = reg
  }
}

export class Concat {
  array: SimpleReg[]

  constructor(...regs: SimpleReg[]) {
    this.array = regs
  }
}

export class Alter {
  array: SimpleReg[]

  constructor(...regs: SimpleReg[]) {
    this.array = regs
  }
}

export default SimpleReg
