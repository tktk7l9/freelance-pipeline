import { createServerFn } from '@tanstack/react-start'

import { getDb } from '../db/client'
import { contractInput } from './contracts.schema'
import { deleteContract as deleteContractRow, upsertContract } from './repository'
import { idInput } from './zod'

export { contractInput }
export type { ContractInput } from './contracts.schema'

export const saveContract = createServerFn({ method: 'POST' })
  .validator(contractInput)
  .handler(async ({ data }) => ({ id: await upsertContract(getDb(), data) }))

export const deleteContract = createServerFn({ method: 'POST' })
  .validator(idInput)
  .handler(async ({ data }) => {
    await deleteContractRow(getDb(), data.id)
    return { ok: true as const }
  })
