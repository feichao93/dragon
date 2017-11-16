import { DefaultMap } from 'common/basic'

/** 从一个DAG(有向无环图)中获取一个拓扑排序序列 */
export function topologicalOrder(dag: ReadonlyMap<string, ReadonlySet<string>>) {
  const inorderMap = new DefaultMap<string, number>(() => 0)
  for (const vs of dag.values()) {
    for (const v of vs) {
      inorderMap.set(v, inorderMap.get(v) + 1)
    }
  }
  const queue = Array.from(dag.keys()).filter(x => inorderMap.get(x) === 0)
  const result: string[] = []
  while (queue.length > 0) {
    const u = queue.shift()!
    result.push(u)
    for (const v of dag.get(u)!) {
      const inorder = inorderMap.get(v) - 1
      inorderMap.set(v, inorder)
      if (inorder === 0) {
        queue.push(v)
      }
    }
  }
  return result
}

/** 使用tarjan算法计算图中的强连通分量
 * 返回结果中包含两个字段:
 *  component2nodeSet记录了 "强连通分量"到"结点集合"的映射
 *  node2Component记录了 "结点"到"强连通分量"的映射
 * */
export function tarjan(edges: ReadonlyMap<string, ReadonlySet<string>>) {
  const stack: string[] = []
  const dfn = new Map<string, number>()
  const low = new Map<string, number>()
  const stackSet = new Set<string>()
  let nextIndex = 1

  const component2nodeSet = new DefaultMap<string, Set<string>>(() => new Set())
  const node2Component = new Map<string, string>()

  const nonVisited = new Set<string>()
  for (const [u, vs] of edges) {
    nonVisited.add(u)
    for (const v of vs) {
      nonVisited.add(v)
    }
  }

  function dfs(u: string) {
    nonVisited.delete(u)
    dfn.set(u, nextIndex)
    low.set(u, nextIndex)
    nextIndex++
    stack.push(u)
    stackSet.add(u)
    for (const v of edges.get(u)!) {
      if (nonVisited.has(v)) {
        dfs(v)
        low.set(u, Math.min(low.get(u)!, low.get(v)!))
      } else if (stackSet.has(v)) {
        low.set(u, Math.min(low.get(u)!, dfn.get(v)!))
      }
    }
    if (dfn.get(u) === low.get(u)) {
      const realSet = component2nodeSet.get(u)
      while (true) {
        const x = stack.pop()!
        stackSet.delete(x)
        realSet.add(x)
        node2Component.set(x, u)
        if (u === x) {
          break
        }
      }
    }
  }

  while (nonVisited.size > 0) {
    const startNode = nonVisited.values().next().value
    dfs(startNode)
  }

  return { component2nodeSet, node2Component }
}

/** 利用结点信息和"结点到强连通分量"的映射关系, 构建对应的强连通分量的DAG(有向无环图) */
export function makeDAG(edges: ReadonlyMap<string, ReadonlySet<string>>, node2Component: ReadonlyMap<string, string>) {
  const dag = new DefaultMap<string, Set<string>>(() => new Set())
  for (const [u, vs] of edges) {
    const uu = node2Component.get(u)!
    const vvs = dag.get(uu)
    for (const v of vs) {
      const vv = node2Component.get(v)!
      if (uu !== vv) {
        vvs.add(vv)
      }
    }
  }
  return dag
}

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
    if (!this.edges.has(setName)) {
      this.edges.set(setName, new Set())
    }
    const set = this.setMap.get(setName)
    for (const item of items) {
      set.add(item)
    }
    return this
  }

  cascade() {
    const { component2nodeSet, node2Component } = tarjan(this.edges)
    const dag = makeDAG(this.edges, node2Component)
    const result = new DefaultMap<string, Set<T>>(() => new Set())

    // 下面uu/vv 指的是DAG(强连通分量的有向无环图)中的结点名称
    // u/v/us 指的是原始的有向图中的结点名称/结点集合
    // u指一条有向边的起点, 而v指一条有向边的终点
    for (const uu of topologicalOrder(dag)) {
      const us = component2nodeSet.get(uu)
      const setU = result.get(uu)
      for (const u of us) {
        for (const item of this.setMap.get(u)) {
          setU.add(item)
        }
        result.set(u, setU)
      }
      for (const vv of dag.get(uu)) {
        const setV = result.get(vv)
        // uu有指向vv的边, 那么将setU中的元素全部加到setV中
        for (const item of setU) {
          setV.add(item)
        }
      }
    }

    return result
  }
}
