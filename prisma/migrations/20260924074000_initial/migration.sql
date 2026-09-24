-- Generated from schema.prisma, then supplemented with named CHECK constraints.
-- Preserve these checks when writing future table-rebuild migrations (see D17).
-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "classId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_role_check" CHECK ("role" IN ('ADMIN', 'TEACHER', 'STUDENT')),
    CONSTRAINT "User_class_role_check" CHECK (("role" = 'STUDENT' AND "classId" IS NOT NULL) OR ("role" IN ('ADMIN', 'TEACHER') AND "classId" IS NULL)),
    CONSTRAINT "User_username_check" CHECK ("username" = lower("username") AND length(trim("username")) > 0),
    CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeacherClass" (
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    PRIMARY KEY ("teacherId", "classId"),
    CONSTRAINT "TeacherClass_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeacherClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "tokenHash" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "durationMinutes" INTEGER NOT NULL DEFAULT 20,
    "opensAt" DATETIME,
    "closesAt" DATETIME,
    "penaltyBps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Quiz_status_check" CHECK ("status" IN ('DRAFT', 'PUBLISHED')),
    CONSTRAINT "Quiz_duration_check" CHECK ("durationMinutes" BETWEEN 1 AND 180),
    CONSTRAINT "Quiz_penalty_check" CHECK ("penaltyBps" BETWEEN 0 AND 10000),
    CONSTRAINT "Quiz_window_check" CHECK ("opensAt" IS NULL OR "closesAt" IS NULL OR "closesAt" > "opensAt"),
    CONSTRAINT "Quiz_published_window_check" CHECK ("status" = 'DRAFT' OR ("opensAt" IS NOT NULL AND "closesAt" IS NOT NULL)),
    CONSTRAINT "Quiz_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizClass" (
    "quizId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    PRIMARY KEY ("quizId", "classId"),
    CONSTRAINT "QuizClass_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuizClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quizId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "pointsHundredths" INTEGER NOT NULL,
    "correctOptionPosition" INTEGER NOT NULL,
    CONSTRAINT "Question_position_check" CHECK ("position" BETWEEN 1 AND 200),
    CONSTRAINT "Question_points_check" CHECK ("pointsHundredths" BETWEEN 1 AND 100000),
    CONSTRAINT "Question_correct_option_check" CHECK ("correctOptionPosition" BETWEEN 1 AND 4),
    CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "Option_position_check" CHECK ("position" BETWEEN 1 AND 4),
    CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" DATETIME NOT NULL,
    "deadlineAt" DATETIME NOT NULL,
    "finalizedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0,
    "scoreHundredths" INTEGER,
    "maxScoreHundredths" INTEGER,
    "correctCount" INTEGER,
    "incorrectCount" INTEGER,
    "unansweredCount" INTEGER,
    CONSTRAINT "Attempt_status_check" CHECK ("status" IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')),
    CONSTRAINT "Attempt_deadline_check" CHECK ("deadlineAt" > "startedAt"),
    CONSTRAINT "Attempt_version_check" CHECK ("version" >= 0),
    CONSTRAINT "Attempt_result_check" CHECK (
        ("status" = 'IN_PROGRESS' AND "finalizedAt" IS NULL AND "scoreHundredths" IS NULL AND "maxScoreHundredths" IS NULL AND "correctCount" IS NULL AND "incorrectCount" IS NULL AND "unansweredCount" IS NULL)
        OR
        ("status" IN ('SUBMITTED', 'EXPIRED') AND "finalizedAt" IS NOT NULL AND "finalizedAt" >= "startedAt"
            AND "scoreHundredths" IS NOT NULL AND "maxScoreHundredths" IS NOT NULL
            AND "scoreHundredths" BETWEEN 0 AND "maxScoreHundredths" AND "maxScoreHundredths" BETWEEN 1 AND 20000000
            AND "correctCount" IS NOT NULL AND "incorrectCount" IS NOT NULL AND "unansweredCount" IS NOT NULL
            AND "correctCount" >= 0 AND "incorrectCount" >= 0 AND "unansweredCount" >= 0
            AND ("correctCount" + "incorrectCount" + "unansweredCount") BETWEEN 1 AND 200)
    ),
    CONSTRAINT "Attempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,

    PRIMARY KEY ("attemptId", "questionId"),
    CONSTRAINT "Answer_attemptId_quizId_fkey" FOREIGN KEY ("attemptId", "quizId") REFERENCES "Attempt" ("id", "quizId") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Answer_questionId_quizId_fkey" FOREIGN KEY ("questionId", "quizId") REFERENCES "Question" ("id", "quizId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Answer_optionId_questionId_fkey" FOREIGN KEY ("optionId", "questionId") REFERENCES "Option" ("id", "questionId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeedRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initializedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Class_name_key" ON "Class"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_classId_idx" ON "User"("classId");

-- CreateIndex
CREATE INDEX "TeacherClass_classId_idx" ON "TeacherClass"("classId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_code_key" ON "Quiz"("code");

-- CreateIndex
CREATE INDEX "Quiz_teacherId_status_idx" ON "Quiz"("teacherId", "status");

-- CreateIndex
CREATE INDEX "QuizClass_classId_idx" ON "QuizClass"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_quizId_position_key" ON "Question"("quizId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Question_id_quizId_key" ON "Question"("id", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "Option_questionId_position_key" ON "Option"("questionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Option_id_questionId_key" ON "Option"("id", "questionId");

-- CreateIndex
CREATE INDEX "Attempt_quizId_status_idx" ON "Attempt"("quizId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_studentId_quizId_key" ON "Attempt"("studentId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "Attempt_id_quizId_key" ON "Attempt"("id", "quizId");

-- CreateIndex
CREATE INDEX "Answer_questionId_quizId_idx" ON "Answer"("questionId", "quizId");

-- CreateIndex
CREATE INDEX "Answer_optionId_questionId_idx" ON "Answer"("optionId", "questionId");
