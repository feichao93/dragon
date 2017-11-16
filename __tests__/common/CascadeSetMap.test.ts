import CascadeSetMap from 'common/CascadeSetMap'
import { set } from 'common/basic'

test('simple case', () => {
  const graph = new CascadeSetMap<number>()
    .add('A', 1, 2)
    .add('B', 1, 3)
    .add('C', 1, 4)
    .addEdge('A', 'B')
    .addEdge('B', 'C')

  const result = graph.cascade()

  expect(result.size).toBe(3)
  expect(result.get('A')).toEqual(set(1, 2))
  expect(result.get('B')).toEqual(set(1, 2, 3))
  expect(result.get('C')).toEqual(set(1, 2, 3, 4))
})

test('simple case with a cycle', () => {
  const graph = new CascadeSetMap<number>()
    .add('A', 1, 2)
    .add('B', 1, 3)
    .add('C', 1, 4)
    .add('D', 5, 6)
    .add('E', 7, 8)
    .addEdge('A', 'B')
    .addEdge('B', 'C')
    .addEdge('C', 'A')
    .addEdge('D', 'B')
    .addEdge('C', 'E')

  const result = graph.cascade()
  expect(result.size).toBe(5)
  expect(result.get('A')).toEqual(set(1, 2, 3, 4, 5, 6))
  expect(result.get('B')).toEqual(set(1, 2, 3, 4, 5, 6))
  expect(result.get('C')).toEqual(set(1, 2, 3, 4, 5, 6))
  expect(result.get('D')).toEqual(set(5, 6))
  expect(result.get('E')).toEqual(set(1, 2, 3, 4, 5, 6, 7, 8))
})

test('another case', () => {
  const graph = new CascadeSetMap<number>()
    .add('A', 1, 2)
    .add('B', 3, 4)
    .add('C', 1, 3)
    .add('D', 5, 6)
    .add('E', 6, 7)
    .addEdge('A', 'B')
    .addEdge('B', 'C')
    .addEdge('C', 'A')
    .addEdge('B', 'D')
    .addEdge('D', 'E')
    .addEdge('E', 'C')

    .add('F', 8, 9)
    .add('G', 9, 10)
    .addEdge('F', 'G')

  const result = graph.cascade()

  expect(result.size).toBe(7)
  for (const setname of 'ABCDE') {
    expect(result.get(setname)).toEqual(set(1, 2, 3, 4, 5, 6, 7))
  }
  expect(result.get('F')).toEqual(set(8, 9))
  expect(result.get('G')).toEqual(set(8, 9, 10))
})
