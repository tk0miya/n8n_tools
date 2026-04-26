import { describe, expect, it, vi } from "vitest";
import type { GasClientApi, ShoppingItem, UpdateRequest } from "@/shopping_list/gas.js";
import { parseArgs, runDispatch, runPurge, runUpdate, toUpdateRequests } from "@/shopping_list/main.js";

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
  it("parses dispatch with text joined from positional args", () => {
    expect(parseArgs(["node", "cli", "dispatch", "<@U1>", "牛乳"])).toEqual({
      subcommand: "dispatch",
      text: "<@U1> 牛乳",
    });
  });

  it("parses dispatch with empty text when no positional follows", () => {
    expect(parseArgs(["node", "cli", "dispatch"])).toEqual({ subcommand: "dispatch", text: "" });
  });

  it("parses update and purge", () => {
    expect(parseArgs(["node", "cli", "update"])).toEqual({ subcommand: "update", text: "" });
    expect(parseArgs(["node", "cli", "purge"])).toEqual({ subcommand: "purge", text: "" });
  });

  it("throws on unknown subcommand", () => {
    expect(() => parseArgs(["node", "cli", "wat"])).toThrow(/Unknown subcommand/);
  });

  it("throws when no subcommand is given", () => {
    expect(() => parseArgs(["node", "cli"])).toThrow(/Unknown subcommand/);
  });
});

describe("runDispatch", () => {
  it("returns a list payload with BlockKit blocks when text is empty after stripping mentions", async () => {
    const items: ShoppingItem[] = [{ id: 2, items: "牛乳", disabled: false }];
    const client = fakeClient({ list: vi.fn(async () => items) });

    const out = await runDispatch("<@U123>", client);

    expect(client.list).toHaveBeenCalledOnce();
    expect(client.add).not.toHaveBeenCalled();
    expect(out.kind).toBe("list");
    if (out.kind === "list") {
      expect(out.blocks[0]).toMatchObject({ type: "section" });
    }
  });

  it("adds newline-split items when text remains after stripping mentions", async () => {
    const client = fakeClient();

    const out = await runDispatch("<@U123> 牛乳\nパン\n\n  卵 ", client);

    expect(client.add).toHaveBeenCalledWith(["牛乳", "パン", "卵"]);
    expect(client.list).not.toHaveBeenCalled();
    expect(out).toEqual({ success: true, kind: "added", count: 3 });
  });
});

describe("toUpdateRequests", () => {
  it("converts a {id: boolean} map to update requests", () => {
    expect(toUpdateRequests({ "2": true, "3": false, "5": true })).toEqual([
      { id: 2, checked: true },
      { id: 3, checked: false },
      { id: 5, checked: true },
    ]);
  });

  it("returns an empty array for an empty map", () => {
    expect(toUpdateRequests({})).toEqual([]);
  });
});

describe("runUpdate", () => {
  it("forwards converted updates to the GAS client and reports the count", async () => {
    const client = fakeClient();

    const out = await runUpdate({ "2": true, "3": false }, client);

    expect(client.update).toHaveBeenCalledWith([
      { id: 2, checked: true },
      { id: 3, checked: false },
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
