const MENTION_PATTERN = /<@.*?>/g;

export function stripMentions(text: string): string {
  return text.replace(MENTION_PATTERN, "").trim();
}

export function splitItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
