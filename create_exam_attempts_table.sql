-- شغّل هاد بمحرر SQL بلوحة تحكم Supabase (Supabase → SQL Editor → New query).
-- بيضيف جدول واحد بس (ExamAttempts) لحفظ نتيجة كل اختبار يخلصه طالب.
-- ما بيلمس أي جدول أو بيانات موجودة حالياً.

CREATE TABLE "ExamAttempts" (
    "Id" SERIAL PRIMARY KEY,
    "StudentId" TEXT NOT NULL,
    "ModelId" INTEGER NOT NULL,
    "Correct" INTEGER NOT NULL,
    "Total" INTEGER NOT NULL,
    "Answered" INTEGER NOT NULL,
    "WrongQuestionIds" TEXT NOT NULL,
    "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "FK_ExamAttempts_AspNetUsers_StudentId"
        FOREIGN KEY ("StudentId") REFERENCES "AspNetUsers" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_ExamAttempts_StudentId" ON "ExamAttempts" ("StudentId");
