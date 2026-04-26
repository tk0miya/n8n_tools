const SPREADSHEET_ID = '1XOKUW91PD_I57k4WRxRcv2dRTHMjTAKDCbzxmV4hZzA';
const SHEET_NAME = 'shopping_list';
const COL_ID = 1;
const COL_ITEMS = 2;
const COL_DISABLED = 3;

interface ShoppingRow {
  id: string;
  rowNumber: number;
  items: string;
  disabled: boolean;
}

function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`);
  return sheet;
}

function parseDisabled(value: unknown): boolean {
  return value === true || value === 'true' || value === 'TRUE';
}

function loadShoppingList(sheet: GoogleAppsScript.Spreadsheet.Sheet): ShoppingRow[] {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  const data = sheet.getRange(2, COL_ID, lastRow - 1, 3).getValues();
  return data.map((row, index) => ({
    id: String(row[0]),
    rowNumber: index + 2,
    items: String(row[1]),
    disabled: parseDisabled(row[2]),
  }));
}

function getItems(): ShoppingItem[] {
  const sheet = getSheet();
  return loadShoppingList(sheet)
    .filter(row => row.items.trim() !== '' && !row.disabled)
    .map(({ id, items, disabled }) => ({ id, items, disabled }));
}

function addItems(items: string[]): void {
  const sheet = getSheet();
  for (const item of items.filter((i) => i.trim() !== "")) {
    sheet.appendRow([Utilities.getUuid(), item.trim(), ""]);
  }
}

function updateCheckedState(updates: UpdateRequest[]): UpdateResult {
  const sheet = getSheet();
  const rows = loadShoppingList(sheet);
  let matched = 0;
  const skipped: string[] = [];
  updates.forEach(({ id, checked }) => {
    const row = rows.find(r => r.id === id);
    if (!row) {
      skipped.push(id);
      return;
    }
    sheet.getRange(row.rowNumber, COL_DISABLED).setValue(checked ? 'true' : '');
    matched++;
  });
  return { matched, skipped };
}

function purgeCompletedItems(): number {
  const sheet = getSheet();
  const rowsToDelete = loadShoppingList(sheet)
    .filter(row => row.disabled)
    .map(row => row.rowNumber)
    .sort((a, b) => b - a);

  for (const rowNumber of rowsToDelete) {
    sheet.deleteRow(rowNumber);
  }
  return rowsToDelete.length;
}
