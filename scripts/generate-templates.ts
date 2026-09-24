import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import writeExcelFile from "write-excel-file/node";
import {
  importHeaders,
  importKinds,
  templateExamples,
} from "../src/server/imports/contract";

function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

async function main() {
  const directory = resolve("templates");
  await mkdir(directory, { recursive: true });
  for (const kind of importKinds) {
    const rows = [importHeaders[kind], ...templateExamples[kind]];
    await writeFile(
      resolve(directory, `${kind}.csv`),
      `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
      "utf8",
    );
    await writeExcelFile(
      rows.map((row) => [...row]),
      {
        sheet: "Import",
        rightToLeft: true,
        stickyRowsCount: 1,
      },
    ).toFile(resolve(directory, `${kind}.xlsx`));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
