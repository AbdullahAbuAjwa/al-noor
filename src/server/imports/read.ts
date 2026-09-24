import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";
import readExcelFile from "read-excel-file/node";
import { importHeaders, type ImportKind } from "./contract";
import { ImportError } from "./error";

export type ImportRow = { row: number; values: Record<string, string> };
export type ImportTable = { rows: ImportRow[] };

const maxFileBytes = 2 * 1024 * 1024;
const maxArchiveBytes = 16 * 1024 * 1024;
const maxArchiveEntries = 256;
const maxRows = 500;

function cellText(value: unknown, row: number, column: string): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  throw new ImportError(
    "Only plain text and numeric cells are supported.",
    row,
    column,
  );
}

function checkXlsxPackage(bytes: Buffer) {
  let count = 0;
  let total = 0;
  let worksheets: Record<string, Uint8Array>;
  try {
    worksheets = unzipSync(bytes, {
      filter(entry) {
        count += 1;
        total += entry.originalSize;
        if (count > maxArchiveEntries || total > maxArchiveBytes) {
          throw new ImportError(
            "XLSX archive exceeds the supported size or part limit.",
          );
        }
        if (/vbaProject\.bin$/i.test(entry.name)) {
          throw new ImportError("Macro-enabled workbooks are not supported.");
        }
        return /^xl\/worksheets\/[^/]+\.xml$/i.test(entry.name);
      },
    });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    throw new ImportError("Invalid XLSX archive.");
  }
  if (Object.keys(worksheets).length === 0)
    throw new ImportError("XLSX contains no worksheet.");
  for (const bytes of Object.values(worksheets)) {
    let xml: string;
    try {
      xml = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (xml.includes("\u0000")) throw new Error("non-UTF-8 XML");
    } catch {
      throw new ImportError("Only UTF-8 XLSX worksheet XML is supported.");
    }
    if (/<(?:[\w-]+:)?f(?:\s|\/?>)/i.test(xml)) {
      throw new ImportError(
        "Formula cells are not supported; paste values instead.",
      );
    }
    if (/<(?:[\w-]+:)?mergeCell(?:\s|\/?>)/i.test(xml)) {
      throw new ImportError("Merged cells are not supported.");
    }
  }
}

export async function readImportFile(
  path: string,
  kind: ImportKind,
): Promise<ImportTable> {
  const extension = extname(path).toLowerCase();
  if (extension !== ".csv" && extension !== ".xlsx") {
    throw new ImportError("Use a .csv or .xlsx file.");
  }
  const file = await stat(path);
  if (!file.isFile() || file.size === 0 || file.size > maxFileBytes) {
    throw new ImportError("File must be nonempty and no larger than 2 MiB.");
  }
  const bytes = await readFile(path);
  let rawRows: { row: number; cells: unknown[] }[];

  if (extension === ".csv") {
    let content: string;
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const parsed = parse(content, {
        bom: true,
        relax_column_count: true,
        info: true,
      }) as unknown as {
        record: string[];
        info: { lines: number };
      }[];
      rawRows = parsed.map(({ record, info }) => ({
        row: info.lines,
        cells: record,
      }));
    } catch {
      throw new ImportError("Malformed CSV or invalid UTF-8.");
    }
  } else {
    checkXlsxPackage(bytes);
    try {
      const sheets = await readExcelFile(bytes, { trim: false });
      if (sheets.length !== 1 || sheets[0].sheet !== "Import") {
        throw new ImportError(
          'XLSX must have exactly one worksheet named "Import".',
        );
      }
      rawRows = sheets[0].data.map((cells, index) => ({
        row: index + 1,
        cells,
      }));
    } catch (error) {
      if (error instanceof ImportError) throw error;
      throw new ImportError("Malformed XLSX workbook.");
    }
  }

  if (rawRows.length === 0) throw new ImportError("File has no header row.");
  const expected = importHeaders[kind];
  const header = rawRows[0].cells.map((value, index) =>
    cellText(value, rawRows[0].row, `column ${index + 1}`).trim(),
  );
  while (header.at(-1) === "") header.pop();
  if (
    header.length !== expected.length ||
    header.some((value, index) => value !== expected[index])
  ) {
    throw new ImportError(
      `Header must be exactly: ${expected.join(", ")}.`,
      rawRows[0].row,
      "header",
    );
  }

  const rows: ImportRow[] = [];
  for (const raw of rawRows.slice(1)) {
    const cells = raw.cells.map((value, index) =>
      cellText(value, raw.row, expected[index] ?? `column ${index + 1}`),
    );
    while (cells.at(-1)?.trim() === "") cells.pop();
    if (cells.every((value) => value.trim() === "")) continue;
    if (cells.length > expected.length) {
      throw new ImportError(
        "Unexpected extra cell.",
        raw.row,
        `column ${expected.length + 1}`,
      );
    }
    rows.push({
      row: raw.row,
      values: Object.fromEntries(
        expected.map((name, index) => [name, cells[index] ?? ""]),
      ),
    });
    if (rows.length > maxRows)
      throw new ImportError(`At most ${maxRows} data rows are supported.`);
  }
  if (rows.length === 0) throw new ImportError("File has no data rows.");
  return { rows };
}
