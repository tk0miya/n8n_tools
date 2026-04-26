import { describe, expect, it } from "vitest";
import { buildBlocks } from "@/shopping_list/blockkit.js";
import type { ShoppingItem } from "@/shopping_list/gas.js";

function item(id: string, name: string): ShoppingItem {
  return { id, items: name, disabled: false };
}

describe("buildBlocks", () => {
  it("returns an empty-list section when there are no items", () => {
    expect(buildBlocks([])).toEqual([{ type: "section", text: { type: "mrkdwn", text: "買い物リストは空です" } }]);
  });

  it("builds a header section and a single actions block for up to 10 items", () => {
    const items = [item("uuid-milk", "牛乳"), item("uuid-bread", "パン")];
    const blocks = buildBlocks(items);

    expect(blocks[0]).toEqual({ type: "section", text: { type: "mrkdwn", text: "買い物リスト：" } });
    expect(blocks).toHaveLength(2);
    expect(blocks[1]).toEqual({
      type: "actions",
      elements: [
        {
          type: "checkboxes",
          action_id: "checkbox_action_1",
          options: [
            { text: { type: "plain_text", text: "牛乳" }, value: "uuid-milk" },
            { text: { type: "plain_text", text: "パン" }, value: "uuid-bread" },
          ],
        },
      ],
    });
  });

  it("chunks more than 10 items into multiple actions blocks with sequential action_ids", () => {
    const items = Array.from({ length: 23 }, (_, i) => item(`uuid-${i + 1}`, `item-${i + 1}`));
    const blocks = buildBlocks(items);

    // 1 section + ceil(23/10) = 1 + 3 actions blocks
    expect(blocks).toHaveLength(4);
    const actions = blocks.slice(1) as Extract<(typeof blocks)[number], { type: "actions" }>[];
    expect(actions.map((b) => b.elements[0].action_id)).toEqual([
      "checkbox_action_1",
      "checkbox_action_2",
      "checkbox_action_3",
    ]);
    expect(actions[0].elements[0].options).toHaveLength(10);
    expect(actions[1].elements[0].options).toHaveLength(10);
    expect(actions[2].elements[0].options).toHaveLength(3);
  });

  it("uses the id verbatim for the option value", () => {
    const blocks = buildBlocks([item("uuid-egg", "卵")]);
    const actions = blocks[1] as Extract<(typeof blocks)[number], { type: "actions" }>;
    expect(actions.elements[0].options[0].value).toBe("uuid-egg");
  });
});
