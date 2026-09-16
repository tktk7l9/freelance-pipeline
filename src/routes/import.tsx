import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { ImportForm } from '../components/import/ImportForm'
import { PageShell } from '../components/PageShell'

export const Route = createFileRoute('/import')({ component: Page })

function Page() {
  const navigate = useNavigate()
  return (
    <PageShell
      title="取込"
      description="Claude Code が構造化した JSON を貼って登録する。通常は npm run add-case で入れる（スマホ用の逃げ道）"
    >
      <ImportForm onSaved={(id) => navigate({ to: '/cases/$id', params: { id } })} />
    </PageShell>
  )
}
