import { useState } from "react";
import type {
  Assessment,
  AssessmentAnswer,
  AssessmentAttempt,
} from "../../types/assessment";

interface UseAssessmentAttemptProps {
  assessment: Assessment;
  employeeId: number;
}

export function useAssessmentAttempt({
  assessment,
  employeeId,
}: UseAssessmentAttemptProps) {
  const [attempt, setAttempt] = useState<AssessmentAttempt>(() => ({
    id: Date.now(),
    assessmentId: assessment.id,
    employeeId,
    status: "in_progress",
    currentQuestionIndex: 0,
    answers: assessment.questions.map(
      (question): AssessmentAnswer => ({
        questionId: question.id,
        selectedOptionId: null,
      })
    ),
    violations: 0,
    startedAt: new Date().toISOString(),
  }));

  const setCurrentQuestion = (index: number) => {
    setAttempt((previous) => ({
      ...previous,
      currentQuestionIndex: index,
    }));
  };

  const selectAnswer = (
    questionId: number,
    optionId: string
  ) => {
    setAttempt((previous) => ({
      ...previous,
      answers: previous.answers.map((answer) =>
        answer.questionId === questionId
          ? {
              ...answer,
              selectedOptionId: optionId,
            }
          : answer
      ),
    }));
  };

  const addViolation = () => {
    setAttempt((previous) => {
      const newViolationCount =
        previous.violations + 1;

      const isTerminated =
        newViolationCount >=
        assessment.config.maxViolations;

      return {
        ...previous,
        violations: newViolationCount,
        status: isTerminated
          ? "terminated"
          : previous.status,
        completedAt: isTerminated
          ? new Date().toISOString()
          : previous.completedAt,
      };
    });
  };

  const completeAttempt = () => {
    setAttempt((previous) => ({
      ...previous,
      status: "completed",
      completedAt: new Date().toISOString(),
    }));
  };

  const terminateAttempt = () => {
    setAttempt((previous) => ({
      ...previous,
      status: "terminated",
      completedAt: new Date().toISOString(),
    }));
  };

  return {
    attempt,
    setCurrentQuestion,
    selectAnswer,
    addViolation,
    completeAttempt,
    terminateAttempt,
  };
}