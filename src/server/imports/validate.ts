import { ImportError } from "./error";
import type { ImportRow, ImportTable } from "./read";

export type TeacherImport = {
  row: number;
  username: string;
  name: string;
  password: string;
  classes: string[];
};
export type StudentImport = {
  row: number;
  username: string;
  name: string;
  password: string;
  className: string;
};
export type QuizImport = {
  row: number;
  code: string;
  title: string;
  teacherUsername: string;
  classes: string[];
  durationMinutes: number;
  penaltyBps: number;
  questions: {
    row: number;
    position: number;
    text: string;
    pointsHundredths: number;
    options: [string, string, string, string];
    correctPosition: number;
  }[];
};

function required(row: ImportRow, column: string, maxLength: number): string {
  const value = row.values[column]?.trim() ?? "";
  if (!value) throw new ImportError("Value is required.", row.row, column);
  if (value.length > maxLength)
    throw new ImportError(
      `Use at most ${maxLength} characters.`,
      row.row,
      column,
    );
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value)) {
    throw new ImportError(
      "Control characters are not supported.",
      row.row,
      column,
    );
  }
  return value;
}

function username(row: ImportRow, column: string): string {
  const value = required(row, column, 64);
  if (!/^[a-z][a-z0-9._-]{2,63}$/.test(value)) {
    throw new ImportError(
      "Use 3–64 lowercase ASCII letters, digits, dots, underscores, or hyphens; start with a letter.",
      row.row,
      column,
    );
  }
  return value;
}

function password(row: ImportRow): string {
  const value = row.values.password ?? "";
  if (
    value.length < 10 ||
    value.length > 128 ||
    value !== value.trim() ||
    /[\u0000-\u001F]/.test(value)
  ) {
    throw new ImportError(
      "Password must be 10–128 characters without surrounding spaces or control characters.",
      row.row,
      "password",
    );
  }
  return value;
}

function classes(row: ImportRow, column: string): string[] {
  const value = required(row, column, 200);
  const names = value.split(";").map((name) => name.trim());
  if (
    names.some((name) => !name || name.length > 32) ||
    new Set(names).size !== names.length
  ) {
    throw new ImportError(
      "Use distinct, nonempty class names separated by semicolons.",
      row.row,
      column,
    );
  }
  return names;
}

function integer(
  row: ImportRow,
  column: string,
  min: number,
  max: number,
): number {
  const value = required(row, column, 6);
  if (
    !/^(0|[1-9]\d*)$/.test(value) ||
    Number(value) < min ||
    Number(value) > max
  ) {
    throw new ImportError(
      `Use a whole number from ${min} to ${max}.`,
      row.row,
      column,
    );
  }
  return Number(value);
}

function decimalHundredths(
  row: ImportRow,
  column: string,
  min: number,
  max: number,
): number {
  const value = required(row, column, 8);
  if (!/^(0|[1-9]\d{0,3})(?:\.\d{1,2})?$/.test(value)) {
    throw new ImportError(
      "Use a number with at most two decimal places.",
      row.row,
      column,
    );
  }
  const hundredths = Math.round(Number(value) * 100);
  if (hundredths < min || hundredths > max) {
    throw new ImportError(
      `Value must be between ${(min / 100).toFixed(2)} and ${(max / 100).toFixed(2)}.`,
      row.row,
      column,
    );
  }
  return hundredths;
}

function uniqueUsernames(rows: { row: number; username: string }[]) {
  const seen = new Set<string>();
  for (const item of rows) {
    if (seen.has(item.username))
      throw new ImportError(
        "Duplicate username in this file.",
        item.row,
        "username",
      );
    seen.add(item.username);
  }
}

export function validateTeachers(table: ImportTable): TeacherImport[] {
  const rows = table.rows.map((row) => ({
    row: row.row,
    username: username(row, "username"),
    name: required(row, "name", 100),
    password: password(row),
    classes: classes(row, "classes"),
  }));
  uniqueUsernames(rows);
  return rows;
}

export function validateStudents(table: ImportTable): StudentImport[] {
  const rows = table.rows.map((row) => ({
    row: row.row,
    username: username(row, "username"),
    name: required(row, "name", 100),
    password: password(row),
    className: required(row, "class", 32),
  }));
  uniqueUsernames(rows);
  return rows;
}

export function validateQuiz(table: ImportTable): QuizImport {
  const first = table.rows[0];
  const code = required(first, "quiz_code", 64);
  if (!/^[a-z][a-z0-9-]{2,63}$/.test(code)) {
    throw new ImportError(
      "Use a lowercase quiz code starting with a letter.",
      first.row,
      "quiz_code",
    );
  }
  const metadata = {
    quiz_code: code,
    quiz_title: required(first, "quiz_title", 120),
    teacher_username: username(first, "teacher_username"),
    classes: classes(first, "classes").join(";"),
    duration_minutes: integer(first, "duration_minutes", 1, 180),
    penalty_percent: decimalHundredths(first, "penalty_percent", 0, 10_000),
  };
  const questions: QuizImport["questions"] = [];
  const seen = new Set<number>();
  for (const row of table.rows) {
    for (const [column, expected] of Object.entries(metadata)) {
      const actual =
        column === "classes"
          ? classes(row, column).join(";")
          : column === "duration_minutes"
            ? integer(row, column, 1, 180)
            : column === "penalty_percent"
              ? decimalHundredths(row, column, 0, 10_000)
              : required(row, column, column === "quiz_title" ? 120 : 64);
      if (actual !== expected)
        throw new ImportError(
          "Quiz settings must match the first data row.",
          row.row,
          column,
        );
    }
    const position = integer(row, "question_position", 1, 200);
    if (seen.has(position))
      throw new ImportError(
        "Duplicate question position.",
        row.row,
        "question_position",
      );
    seen.add(position);
    const options = [1, 2, 3, 4].map((number) =>
      required(row, `option_${number}`, 200),
    ) as QuizImport["questions"][number]["options"];
    if (new Set(options.map((value) => value.toLocaleLowerCase())).size !== 4) {
      throw new ImportError(
        "Four distinct options are required.",
        row.row,
        "option_1",
      );
    }
    questions.push({
      row: row.row,
      position,
      text: required(row, "question_text", 500),
      pointsHundredths: decimalHundredths(row, "points", 1, 100_000),
      options,
      correctPosition: integer(row, "correct_option", 1, 4),
    });
  }
  questions.sort((a, b) => a.position - b.position);
  for (const [index, question] of questions.entries()) {
    if (question.position !== index + 1) {
      throw new ImportError(
        "Question positions must start at 1 and be consecutive.",
        question.row,
        "question_position",
      );
    }
  }
  return {
    row: first.row,
    code,
    title: metadata.quiz_title,
    teacherUsername: metadata.teacher_username,
    classes: metadata.classes.split(";"),
    durationMinutes: metadata.duration_minutes,
    penaltyBps: metadata.penalty_percent,
    questions,
  };
}
