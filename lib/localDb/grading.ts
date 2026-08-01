import { AnswerKey, PerQuestionResult, Result, StudentAnswer } from './schema';

export function computeResult(answerKey: AnswerKey, studentAnswer: StudentAnswer): Result {
  const perQuestion: PerQuestionResult[] = Object.entries(answerKey.answers).map(
    ([indexStr, expected]) => {
      const index = Number(indexStr);
      const given = studentAnswer.answers[index];
      return { index, expected, given, correct: given === expected };
    },
  );

  const correctCount = perQuestion.filter((q) => q.correct).length;
  const wrongCount = perQuestion.length - correctCount;
  const scorePercent = perQuestion.length > 0 ? (correctCount / perQuestion.length) * 100 : 0;

  const timeSpentSeconds = studentAnswer.finishedAt
    ? Math.max(
        0,
        Math.round(
          (new Date(studentAnswer.finishedAt).getTime() - new Date(studentAnswer.startedAt).getTime()) / 1000,
        ),
      )
    : undefined;

  return {
    studentAnswerId: studentAnswer.id,
    examId: studentAnswer.examId,
    studentId: studentAnswer.studentId,
    scorePercent,
    correctCount,
    wrongCount,
    perQuestion: perQuestion.sort((a, b) => a.index - b.index),
    timeSpentSeconds,
    computedAt: new Date().toISOString(),
  };
}
