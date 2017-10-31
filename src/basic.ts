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
