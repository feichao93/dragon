export const epsilon = Symbol('ϵ')
export type epsilon = typeof epsilon
export const endmarker = Symbol('$')
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
