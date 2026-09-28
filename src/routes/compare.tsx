import { Checkbox, Group, SegmentedControl, Stack, Text } from '@mantine/core'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { CompareTable } from '../components/compare/CompareTable'
import { EmptyState } from '../components/EmptyState'
import { MarketView } from '../components/market/MarketView'
import { PageShell } from '../components/PageShell'
import { listCasesFn } from '../server/cases'
import { marketData } from '../server/market'
import { getSettingsData } from '../server/settings'

/**
 * Compare: "Cases" = in-progress cases side by side, "Market" = Levtech market data and my position.
 * Both are about "comparing", so they share one tab, and the switch lives in the URL (reproducible via back and sharing).
 */
const search = z.object({
  view: z.enum(['cases', 'market']).optional(),
  ids: z.string().optional(),
  skill: z.string().max(60).optional(),
})

export const Route = createFileRoute('/compare')({
  component: Page,
  validateSearch: (s) => search.parse(s),
  loader: async () => {
    const [{ cases, sites }, settings, market] = await Promise.all([
      listCasesFn(),
      getSettingsData(),
      marketData(),
    ])
    return { cases, sites, ...settings, market }
  },
})

function Page() {
  const { cases, sites, thresholds, axes, market } = Route.useLoaderData()
  const { view = 'cases', ids, skill } = Route.useSearch()
  const navigate = useNavigate({ from: '/compare' })
  const candidates = cases.filter((c) => c.group === 'active' || c.group === 'onhold')
  // Fall back to the default only when ids is undefined (no query at all). '' means "all removed" and stays empty.
  const selected =
    ids !== undefined
      ? ids.split(',').filter(Boolean)
      : candidates.filter((c) => c.group === 'active').map((c) => c.id)
  const shown = candidates.filter((c) => selected.includes(c.id))
  const hasThreshold = Object.values(thresholds).some((v) => v !== null)
  const defaultSkill =
    market.skills.find((s) => s.skill.includes('TypeScript(フロント)'))?.skill ?? null

  return (
    <PageShell title="比較" wide>
      <Stack gap="md">
        <SegmentedControl
          value={view}
          onChange={(v) =>
            navigate({ search: (s) => ({ ...s, view: v as 'cases' | 'market' }), replace: true })
          }
          data={[
            { value: 'cases', label: '案件どうし' },
            { value: 'market', label: '市場と自分' },
          ]}
        />
        {view === 'market' ? (
          <MarketView
            skills={market.skills}
            skill={skill ?? defaultSkill}
            onSkillChange={(v) => navigate({ search: (s) => ({ ...s, skill: v }), replace: true })}
            birthDate={market.birthDate}
            myRate={market.myRate}
            ratePoints={market.ratePoints}
            today={market.today}
          />
        ) : (
          <>
            <Checkbox.Group
              value={selected}
              onChange={(v) =>
                navigate({ search: (s) => ({ ...s, ids: v.join(',') }), replace: true })
              }
              label="比較する案件"
            >
              <Group gap="sm" mt="xs">
                {candidates.map((c) => (
                  <Checkbox key={c.id} value={c.id} label={`${c.title}（${c.company}）`} />
                ))}
              </Group>
            </Checkbox.Group>
            {shown.length === 0 ? (
              <EmptyState emoji="⚖️" title="比較する案件を選んでください" />
            ) : (
              <CompareTable cases={shown} sites={sites} thresholds={thresholds} axes={axes} />
            )}
            <Text size="xs" c="dimmed">
              参画・終了・辞退・見送りは対象外。時給は税抜 ÷ 基準時間。
              {hasThreshold
                ? '赤いセルは設定の閾値を下回る条件。'
                : '設定で閾値を入れると条件を下回るセルが赤くなる。'}
            </Text>
          </>
        )}
      </Stack>
    </PageShell>
  )
}
