import { DefaultMap } from 'common/basic'

export default class CascadeSetMap<T> {
  private setMap: DefaultMap<string, Set<T>>
  private edges = new DefaultMap<string, Set<string>>(() => new Set())

  constructor() {
    this.setMap = new DefaultMap<string, Set<T>>(() => new Set())
  }

  addEdge(from: string, to: string) {
    this.edges.get(from).add(to)
    return this
  }

  add(setName: string, ...items: T[]) {
    const set = this.setMap.get(setName)
    for (const item of items) {
      set.add(item)
    }
    return this
  }

  cascade() {
    const resultSetMap = new DefaultMap<string, Set<T>>(() => new Set())
    // TODO 优化
    for (const [from, items] of this.setMap) {
      for (const name of this.getSuperSetNames(from)) {
        for (const item of items) {
          resultSetMap.get(name).add(item)
        }
      }
    }
    return resultSetMap
  }

  private getSuperSetNames(start: string) {
    const result = new Set<string>()
    let cntSet = new Set<string>()
    cntSet.add(start)

    while (cntSet.size > 0) {
      const nextSet = new Set<string>()
      for (const name of cntSet) {
        for (const next of this.edges.get(name)) {
          if (!result.has(next) && !cntSet.has(next)) {
            nextSet.add(next)
          }
        }
        result.add(name)
      }
      cntSet = nextSet
    }
    return result
  }
}
