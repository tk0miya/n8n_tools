import type { ShoppingItem } from "./gas.js";

const CHUNK_SIZE = 10;

interface CheckboxOption {
  text: { type: "plain_text"; text: string };
  value: string;
}

interface CheckboxesElement {
  type: "checkboxes";
  action_id: string;
  options: CheckboxOption[];
}

interface SectionBlock {
  type: "section";
  text: { type: "mrkdwn"; text: string };
}

interface ActionsBlock {
  type: "actions";
  elements: CheckboxesElement[];
}

export type BlockKitBlock = SectionBlock | ActionsBlock;

export function buildBlocks(items: ShoppingItem[]): BlockKitBlock[] {
  if (items.length === 0) {
    return [{ type: "section", text: { type: "mrkdwn", text: "買い物リストは空です" } }];
  }

  const actionBlocks: ActionsBlock[] = [];
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    const index = Math.floor(i / CHUNK_SIZE) + 1;
    actionBlocks.push({
      type: "actions",
      elements: [
        {
          type: "checkboxes",
          action_id: `checkbox_action_${index}`,
          options: chunk.map((item) => ({
            text: { type: "plain_text", text: item.items },
            value: String(item.id),
          })),
        },
      ],
    });
  }

  return [{ type: "section", text: { type: "mrkdwn", text: "買い物リスト：" } }, ...actionBlocks];
}
