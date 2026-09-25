import { Table, Text, VisuallyHidden } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { buildCompareRows, type CompareCase, type Thresholds } from '../../lib/compare'
import { RateLines } from '../cases/RateLines'
import type { CompanySites } from '../../server/repository'
import { CompanyName } from '../CompanyName'

export function CompareTable({
  cases,
  sites,
  thresholds,
  axes,
}: {
  cases: CompareCase[]
  sites: CompanySites
  thresholds: Thresholds
  axes: string[]
}) {
  const rows = buildCompareRows(cases, thresholds, axes)
  return (
    <Table.ScrollContainer minWidth={Math.max(600, 180 + cases.length * 200)}>
      <Table className="compare-table" withColumnBorders stickyHeader>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>項目</Table.Th>
            {cases.map((c) => (
              <Table.Th key={c.id} style={{ minWidth: 200 }}>
                <Link to="/cases/$id" params={{ id: c.id }}>
                  <Text fw={700} lineClamp={2}>
                    {c.title}
                  </Text>
                </Link>
                <Text size="xs" c="dimmed">
                  <CompanyName name={c.company} url={sites[c.company]} />
                </Text>
              </Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.key}>
              <Table.Th scope="row">{r.label}</Table.Th>
              {r.cells.map((cell) => (
                <Table.Td key={cell.caseId} className={cell.bad ? 'cell-bad' : undefined}>
                  {/* 色だけに頼らない: 下回るセルは記号と読み上げ用の文言も付ける */}
                  {cell.bad ? (
                    <Text size="xs" fw={700} component="span" mr={4}>
                      <span aria-hidden>▼</span>
                      <VisuallyHidden>閾値を下回る</VisuallyHidden>
                    </Text>
                  ) : null}
                  {cell.sub ? (
                    <RateLines main={cell.text} sub={cell.sub} />
                  ) : (
                    <Text size="sm" className="breakable" component="span">
                      {cell.text}
                    </Text>
                  )}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
