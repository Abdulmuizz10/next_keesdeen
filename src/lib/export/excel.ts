import "server-only";
import ExcelJS from "exceljs";

export interface ExcelHeader {
  key: string;
  label: string;
  width?: number;
}

/**
 * Generic Excel workbook builder with light header styling.
 */
export async function buildWorkbook(
  sheetName: string,
  headers: ExcelHeader[],
  rows: Array<Record<string, string | number | boolean | null | undefined>>
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Keesdeen";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = headers.map((h) => ({
    header: h.label,
    key: h.key,
    width: h.width || 20,
  }));

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF03834D" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;

  rows.forEach((row) => sheet.addRow(row));

  // Body styling
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
    });
  });

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };

  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const data = await workbook.xlsx.writeBuffer();
  return Buffer.from(data);
}
