import type { QuestionField } from "./questions";

// Encoded Arabic text takes about six bytes per character in a form body, so a
// full question (500 + 4 x 200 characters) needs more than the default limit.
export const questionFormBytes = 16_384;

const codes = {
  text: "questionText",
  points: "questionPoints",
  options: "questionOptions",
  correct: "questionCorrect",
  limit: "questionLimit",
  locked: "locked",
} as const;

// Maps a validation or service outcome to the message code shown on the page.
export function questionError(
  reason: QuestionField | "limit" | "locked",
): (typeof codes)[keyof typeof codes] {
  return codes[reason];
}
