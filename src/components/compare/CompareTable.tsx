import { Table, Text } from '@mantine/core'
import { Link } from '@tanstack/react-router'

import { buildCompareRows, type CompareCase, type Thresholds } from '../../lib/compare'
import { RateLines } from '../cases/RateLines'

export function CompareTable({
  cases,
  thresholds,
  axes,
}: {
  cases: CompareCase[]
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
                  {c.company}
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
                  {cell.sub ? (
                    <RateLines main={cell.text} sub={cell.sub} />
                  ) : (
                    <Text size="sm" className="breakable">
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
