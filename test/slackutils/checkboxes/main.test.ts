import { describe, expect, it } from "vitest";
import { parseCheckboxPayload } from "@/slackutils/checkboxes/main.js";

describe("parseCheckboxPayload", () => {
  it("returns an empty map for an empty payload", () => {
    expect(parseCheckboxPayload({})).toEqual({});
  });

  it("defaults every option from message.blocks to false when no state is provided", () => {
    const payload = {
      message: {
        blocks: [
          {
            type: "actions",
            elements: [
              {
                type: "checkboxes",
                action_id: "checkbox_action_1",
                options: [
                  { value: "1", text: { type: "plain_text", text: "apple" } },
                  { value: "2", text: { type: "plain_text", text: "banana" } },
                ],
              },
            ],
          },
        ],
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ "1": false, "2": false });
  });

  it("marks options selected in state.values as true", () => {
    const payload = {
      message: {
        blocks: [
          {
            type: "actions",
            elements: [
              {
                type: "checkboxes",
                action_id: "checkbox_action_1",
                options: [{ value: "1" }, { value: "2" }, { value: "3" }],
              },
            ],
          },
        ],
      },
      state: {
        values: {
          block_x: {
            checkbox_action_1: {
              type: "checkboxes",
              selected_options: [{ value: "1" }, { value: "3" }],
            },
          },
        },
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ "1": true, "2": false, "3": true });
  });

  it("merges options across multiple actions blocks", () => {
    const payload = {
      message: {
        blocks: [
          {
            type: "actions",
            elements: [
              { type: "checkboxes", action_id: "checkbox_action_1", options: [{ value: "1" }, { value: "2" }] },
            ],
          },
          {
            type: "actions",
            elements: [
              { type: "checkboxes", action_id: "checkbox_action_2", options: [{ value: "3" }, { value: "4" }] },
            ],
          },
        ],
      },
      state: {
        values: {
          block_a: { checkbox_action_1: { type: "checkboxes", selected_options: [{ value: "2" }] } },
          block_b: { checkbox_action_2: { type: "checkboxes", selected_options: [{ value: "3" }] } },
        },
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ "1": false, "2": true, "3": true, "4": false });
  });

  it("ignores non-actions blocks and non-checkboxes elements", () => {
    const payload = {
      message: {
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: "hello" } },
          {
            type: "actions",
            elements: [
              { type: "button", action_id: "btn", text: { type: "plain_text", text: "click" } },
              { type: "checkboxes", action_id: "checkbox_action_1", options: [{ value: "1" }] },
            ],
          },
        ],
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ "1": false });
  });

  it("ignores state entries that are not checkboxes actions", () => {
    const payload = {
      message: {
        blocks: [{ type: "actions", elements: [{ type: "checkboxes", options: [{ value: "1" }, { value: "2" }] }] }],
      },
      state: {
        values: {
          block_x: {
            some_button: { type: "button", value: "clicked" },
            checkbox_action: { type: "checkboxes", selected_options: [{ value: "2" }] },
          },
        },
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ "1": false, "2": true });
  });

  it("includes selected values that have no matching message option", () => {
    // Edge case: state-only payload or options removed between send and response.
    const payload = {
      state: {
        values: {
          block_x: {
            checkbox_action: { type: "checkboxes", selected_options: [{ value: "orphan" }] },
          },
        },
      },
    };
    expect(parseCheckboxPayload(payload)).toEqual({ orphan: true });
  });

  it("treats null payload as empty", () => {
    expect(parseCheckboxPayload(null)).toEqual({});
  });

  it("tolerates malformed blocks without throwing", () => {
    const payload = {
      message: { blocks: "not-an-array" },
      state: { values: "not-an-object" },
    };
    expect(parseCheckboxPayload(payload)).toEqual({});
  });
});
