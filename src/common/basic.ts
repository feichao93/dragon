// 注意 String(epsilon) === 'Symbol(ϵ)'. 在其他地方我们会用到这个性质
/** @deprecated */
export const epsilon = Symbol('ϵ')
/** @deprecated */
export type epsilon = typeof epsilon
// 注意 String(endmarker) === 'Symbol($)'. 在其他地方我们会用到这个性质
/** @deprecated */
export const endmarker = Symbol('$')
/** @deprecated */
export type endmarker = typeof endmarker
export const EOF = String.fromCharCode(0)

export class DefaultMap<K, V> extends Map<K, V> {
  private defaulter: () => V

  constructor(defaulter: () => V) {
    super()
    this.defaulter = defaulter
  }

  get(key: K) {
    if (!super.has(key)) {
      this.set(key, this.defaulter())
    }
    return super.get(key)!
  }
}

export function includedIn<T>(set: Set<T>) {
  return (y: T) => set.has(y)
}

export function addAll<T>(source: ReadonlySet<T>, target: Set<T>) {
  for (const item of source) {
    target.add(item)
  }
}

export function minBy<T>(collection: Iterable<T>, iteratee: (t: T) => number) {
  let result: T | null = null
  for (const item of collection) {
    if (result == null || iteratee(item) < iteratee(result)) {
      result = item
    }
  }
  return result
}

export function unescapeWhitespaces(char: string) {
  if (char === 't') {
    return '\t'
  } else if (char === 'n') {
    return '\n'
  } else {
    return char
  }
}

export function escapeWhitespaces(char: string) {
  if (char === '\t') {
    return '\\t'
  } else if (char === '\n') {
    return '\\n'
  } else {
    return char
  }
}

export function subtract(a: number, b: number) {
  return a - b
}

export function set<T>(...items: T[]) {
  return new Set<T>(items)
}

export function* range(start: number, end?: number) {
  if (end === undefined) {
    end = start
    start = 0
  }
  for (let i = start; i < end; i++) {
    yield i
  }
}
