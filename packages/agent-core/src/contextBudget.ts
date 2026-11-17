import type { ChatMsg } from "./llmStreamParse.ts";

function msgChars(m: ChatMsg) {
  return (m.content?.length ?? 0) + (m.name?.length ?? 0) + 80;
}

/** Drop oldest turns after the system + first user message so a single run stays bounded. */
export function trimChatMessages(messages: ChatMsg[], maxChars: number): ChatMsg[] {
  if (messages.length <= 2) return messages;
  const head = messages.slice(0, 2);
  let rest = messages.slice(2);
  const total = () => [...head, ...rest].reduce((n, m) => n + msgChars(m), 0);
  while (rest.length > 0 && total() > maxChars) {
    rest = rest.slice(1);
  }
  return [...head, ...rest];
}
