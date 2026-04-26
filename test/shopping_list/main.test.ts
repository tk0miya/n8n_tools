import { describe, expect, it, vi } from "vitest";
import type { GasClientApi, ShoppingItem, UpdateRequest } from "@/shopping_list/gas.js";
import {
  extractTextFromSlackEvents,
  parseArgs,
  runDispatch,
  runPurge,
  runUpdate,
  toUpdateRequests,
} from "@/shopping_list/main.js";

function fakeClient(overrides: Partial<GasClientApi> = {}): GasClientApi {
  return {
    list: vi.fn(async () => [] as ShoppingItem[]),
    add: vi.fn(async (_items: string[]) => {}),
    update: vi.fn(async (_updates: UpdateRequest[]) => {}),
    purge: vi.fn(async () => 0),
    ...overrides,
  };
}

describe("parseArgs", () => {
  it("parses each subcommand without taking positional text", () => {
    expect(parseArgs(["node", "cli", "dispatch"])).toEqual({ subcommand: "dispatch" });
    expect(parseArgs(["node", "cli", "update"])).toEqual({ subcommand: "update" });
    expect(parseArgs(["node", "cli", "purge"])).toEqual({ subcommand: "purge" });
  });

  it("ignores extra positional args after the subcommand", () => {
    expect(parseArgs(["node", "cli", "dispatch", "ignored"])).toEqual({ subcommand: "dispatch" });
  });

  it("throws on unknown subcommand", () => {
    expect(() => parseArgs(["node", "cli", "wat"])).toThrow(/Unknown subcommand/);
  });

  it("throws when no subcommand is given", () => {
    expect(() => parseArgs(["node", "cli"])).toThrow(/Unknown subcommand/);
  });
});

describe("extractTextFromSlackEvents", () => {
  it("extracts text from an array of Slack events", () => {
    const payload = [
      { type: "app_mention", text: "<@U0AMQMUH2L9> テスト" },
      { type: "app_mention", text: "<@U0AMQMUH2L9> 牛乳" },
    ];
    expect(extractTextFromSlackEvents(payload)).toBe("<@U0AMQMUH2L9> テスト\n<@U0AMQMUH2L9> 牛乳");
  });

  it("accepts a single event object", () => {
    expect(extractTextFromSlackEvents({ text: "hello" })).toBe("hello");
  });

  it("skips events without a string text field", () => {
    const payload = [{ text: "kept" }, { text: 123 }, {}, null, "string"];
    expect(extractTextFromSlackEvents(payload)).toBe("kept");
  });

  it("returns an empty string for an empty array", () => {
    expect(extractTextFromSlackEvents([])).toBe("");
  });
});

describe("runDispatch", () => {
  it("returns a list payload with BlockKit blocks when text is empty after stripping mentions", async () => {
    const items: ShoppingItem[] = [{ id: "uuid-1", items: "牛乳", disabled: false }];
    const client = fakeClient({ list: vi.fn(async () => items) });

    const out = await runDispatch([{ text: "<@U123>" }], client);

    expect(client.list).toHaveBeenCalledOnce();
    expect(client.add).not.toHaveBeenCalled();
    expect(out.kind).toBe("list");
    if (out.kind === "list") {
      expect(out.blocks[0]).toMatchObject({ type: "section" });
    }
  });

  it("adds newline-split items when text remains after stripping mentions", async () => {
    const client = fakeClient();

    const out = await runDispatch([{ text: "<@U123> 牛乳\nパン\n\n  卵 " }], client);

    expect(client.add).toHaveBeenCalledWith(["牛乳", "パン", "卵"]);
    expect(client.list).not.toHaveBeenCalled();
    expect(out).toEqual({ success: true, kind: "added", count: 3 });
  });

  it("joins text from multiple Slack events", async () => {
    const client = fakeClient();

    const out = await runDispatch([{ text: "<@U123> 牛乳" }, { text: "パン" }], client);

    expect(client.add).toHaveBeenCalledWith(["牛乳", "パン"]);
    expect(out).toEqual({ success: true, kind: "added", count: 2 });
  });
});

describe("toUpdateRequests", () => {
  it("converts a {id: boolean} map to update requests", () => {
    expect(toUpdateRequests({ "uuid-a": true, "uuid-b": false, "uuid-c": true })).toEqual([
      { id: "uuid-a", checked: true },
      { id: "uuid-b", checked: false },
      { id: "uuid-c", checked: true },
    ]);
  });

  it("returns an empty array for an empty map", () => {
    expect(toUpdateRequests({})).toEqual([]);
  });
});

describe("runUpdate", () => {
  it("forwards converted updates to the GAS client and reports the count", async () => {
    const client = fakeClient();

    const out = await runUpdate({ "uuid-a": true, "uuid-b": false }, client);

    expect(client.update).toHaveBeenCalledWith([
      { id: "uuid-a", checked: true },
      { id: "uuid-b", checked: false },
    ]);
    expect(out).toEqual({ success: true, updated: 2 });
  });
});

describe("runPurge", () => {
  it("returns the deleted count from the GAS client", async () => {
    const client = fakeClient({ purge: vi.fn(async () => 4) });

    const out = await runPurge(client);

    expect(client.purge).toHaveBeenCalledOnce();
    expect(out).toEqual({ success: true, deleted: 4 });
  });
});
