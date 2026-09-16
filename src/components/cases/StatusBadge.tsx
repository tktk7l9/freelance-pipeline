import { Badge } from '@mantine/core'

import { STATUS_COLOR, STATUS_LABEL, isTerminal, type CaseStatus } from '../../lib/status'

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <Badge color={STATUS_COLOR[status]} variant={isTerminal(status) ? 'outline' : 'light'}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
