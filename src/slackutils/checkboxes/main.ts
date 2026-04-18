export type CheckboxStateMap = Record<string, boolean>;

interface CheckboxOption {
  value?: unknown;
}

interface BlockElement {
  type?: unknown;
  options?: unknown;
}

interface Block {
  type?: unknown;
  elements?: unknown;
}

interface StateAction {
  type?: unknown;
  selected_options?: unknown;
}

interface BlockActionsPayload {
  message?: { blocks?: unknown };
  state?: { values?: unknown };
}

export function parseCheckboxPayload(payload: unknown): CheckboxStateMap {
  const result: CheckboxStateMap = {};
  const p = (payload ?? {}) as BlockActionsPayload;

  // Collect every checkbox option from the original message as the universe (default: false).
  const blocks = Array.isArray(p.message?.blocks) ? (p.message?.blocks as Block[]) : [];
  for (const block of blocks) {
    if (block?.type !== "actions" || !Array.isArray(block.elements)) continue;
    for (const element of block.elements as BlockElement[]) {
      if (element?.type !== "checkboxes" || !Array.isArray(element.options)) continue;
      for (const option of element.options as CheckboxOption[]) {
        if (typeof option?.value === "string") {
          result[option.value] = false;
        }
      }
    }
  }

  // Overlay selected options from state.values. Values not already registered are still
  // included as true so a caller can parse state-only payloads without data loss.
  const stateValues = p.state?.values;
  if (stateValues && typeof stateValues === "object") {
    for (const blockState of Object.values(stateValues as Record<string, unknown>)) {
      if (!blockState || typeof blockState !== "object") continue;
      for (const action of Object.values(blockState as Record<string, StateAction>)) {
        if (action?.type !== "checkboxes" || !Array.isArray(action.selected_options)) continue;
        for (const option of action.selected_options as CheckboxOption[]) {
          if (typeof option?.value === "string") {
            result[option.value] = true;
          }
        }
      }
    }
  }

  return result;
}
