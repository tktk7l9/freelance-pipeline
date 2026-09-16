// scripts/lib/smoke.test.ts（Task 6 で削除）
import assert from 'node:assert/strict'
import { it } from 'node:test'

it('strip-types で TS のテストが走る', () => {
  const n: number = 1
  assert.equal(n, 1)
})
