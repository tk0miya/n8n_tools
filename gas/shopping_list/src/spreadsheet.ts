const SPREADSHEET_ID = '1XOKUW91PD_I57k4WRxRcv2dRTHMjTAKDCbzxmV4hZzA';
const SHEET_NAME = 'shopping_list';

function getSheet(): GoogleAppsScript.Spreadsheet.Sheet {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${SHEET_NAME}" not found`);
  return sheet;
}

function parseDisabled(value: unknown): boolean {
  return value === true || value === 'true' || value === 'TRUE';
}

function getItems(): ShoppingItem[] {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  return data
    .map((row, index) => ({
      id: index + 2,
      rowNumber: index + 2,
      items: String(row[0]),
      disabled: parseDisabled(row[1]),
    }))
    .filter(item => item.items.trim() !== '');
}

function addItems(items: string[]): void {
  const sheet = getSheet();
  for (const item of items.filter((i) => i.trim() !== "")) {
    sheet.appendRow([item.trim(), ""]);
  }
}

function updateCheckedState(updates: UpdateRequest[]): void {
  const sheet = getSheet();
  updates.forEach(({ rowNumber, checked }) => {
    sheet.getRange(rowNumber, 2).setValue(checked ? 'true' : '');
  });
}

function purgeCompletedItems(): number {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return 0;

  const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  const rowsToDelete = data
    .map((row, index) => ({ rowNumber: index + 2, disabled: parseDisabled(row[0]) }))
    .filter(item => item.disabled)
    .map(item => item.rowNumber)
    .sort((a, b) => b - a);

  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }
  return rowsToDelete.length;
}
