import { Accordion, Text } from '@mantine/core'

export function RawTextPanel({ text }: { text: string }) {
  return (
    <Accordion variant="contained">
      <Accordion.Item value="raw">
        <Accordion.Control>原文（{text.length.toLocaleString('ja-JP')} 文字）</Accordion.Control>
        <Accordion.Panel>
          <Text className="rawtext">{text}</Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
