export const importKinds = ["teachers", "students", "quiz"] as const;
export type ImportKind = (typeof importKinds)[number];

export const importHeaders: Record<ImportKind, readonly string[]> = {
  teachers: ["username", "name", "password", "classes"],
  students: ["username", "name", "password", "class"],
  quiz: [
    "quiz_code",
    "quiz_title",
    "teacher_username",
    "classes",
    "duration_minutes",
    "penalty_percent",
    "question_position",
    "question_text",
    "points",
    "option_1",
    "option_2",
    "option_3",
    "option_4",
    "correct_option",
  ],
};

// New, non-seeded identifiers let a reviewer load one format of each template in order.
export const templateExamples: Record<
  ImportKind,
  readonly (readonly string[])[]
> = {
  teachers: [
    ["teacher.geography", "هالة سمير", "TeacherExample2026!", "10A;10B"],
  ],
  students: [["student.10a.21", "فادي سمير", "StudentExample2026!", "10A"]],
  quiz: [
    [
      "geography-10a-import",
      "جغرافيا الصف العاشر: مسودة",
      "teacher.geography",
      "10A",
      "20",
      "25",
      "1",
      "ما القارة التي تقع فيها فلسطين؟",
      "1.50",
      "آسيا",
      "أوروبا",
      "أفريقيا",
      "أمريكا الجنوبية",
      "1",
    ],
    [
      "geography-10a-import",
      "جغرافيا الصف العاشر: مسودة",
      "teacher.geography",
      "10A",
      "20",
      "25",
      "2",
      "ما أكبر محيط على الأرض؟",
      "2.00",
      "الأطلسي",
      "الهادئ",
      "الهندي",
      "المتجمد الشمالي",
      "2",
    ],
    [
      "geography-10a-import",
      "جغرافيا الصف العاشر: مسودة",
      "teacher.geography",
      "10A",
      "20",
      "25",
      "3",
      "كم جهة أصلية على البوصلة؟",
      "1.00",
      "اثنتان",
      "ثلاث",
      "خمس",
      "أربع",
      "4",
    ],
  ],
};
