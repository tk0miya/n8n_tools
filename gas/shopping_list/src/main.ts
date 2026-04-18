type PostBody =
  | { action: "add"; items: string[] }
  | { action: "update"; updates: UpdateRequest[] }
  | { action: "purge" };

function doGet(e: GoogleAppsScript.Events.DoGet): GoogleAppsScript.Content.TextOutput {
  const action = e.parameter.action;
  try {
    switch (action) {
      case "list": {
        const items = getItems();
        return jsonOutput<ShoppingItem[]>({ success: true, data: items });
      }
      default:
        return jsonOutput({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

function doPost(e: GoogleAppsScript.Events.DoPost): GoogleAppsScript.Content.TextOutput {
  let body: PostBody;
  try {
    body = JSON.parse(e.postData.contents) as PostBody;
  } catch {
    return jsonOutput({ success: false, error: "Invalid JSON body" });
  }
  try {
    switch (body.action) {
      case "add":
        addItems(body.items);
        return jsonOutput({ success: true });
      case "update":
        updateCheckedState(body.updates);
        return jsonOutput({ success: true });
      case "purge": {
        const deleted = purgeCompletedItems();
        return jsonOutput<{ deleted: number }>({ success: true, data: { deleted } });
      }
      default:
        return jsonOutput({ success: false, error: `Unknown action: ${(body as { action: string }).action}` });
    }
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

function jsonOutput<T>(data: ApiResponse<T>): GoogleAppsScript.Content.TextOutput {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
