export class ImportError extends Error {
  constructor(message: string, row?: number, column?: string) {
    super(
      row === undefined
        ? message
        : `Row ${row}, column ${column ?? "?"}: ${message}`,
    );
    this.name = "ImportError";
  }
}
