export const epsilon = Symbol('epsilon')

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
