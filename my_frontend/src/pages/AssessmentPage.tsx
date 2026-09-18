import { useCallback, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { mockAssessment } from "../data/mockAssessment";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader } from "../components/ui/card";
import { Clock, AlertTriangle } from "lucide-react";
import { useAssessmentTimer } from "../hooks/assessment/useAssessmentTimer";
import type { AssessmentAnswer } from "../types/assessment";

export default function AssessmentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const assessment = mockAssessment;

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Store the selected answer for every question.
  const [answers, setAnswers] = useState<AssessmentAnswer[]>(
    assessment.questions.map((question) => ({
      questionId: question.id,
      selectedOptionId: null,
    }))
  );

  const currentQuestion =
    assessment.questions[currentQuestionIndex];

  const totalQuestions = assessment.questions.length;

  const isLastQuestion =
    currentQuestionIndex === totalQuestions - 1;

  // Get the answer currently selected for this question.
  const currentAnswer = currentQuestion
    ? answers.find(
        (answer) => answer.questionId === currentQuestion.id
      )
    : undefined;

  const selectedOption =
    currentAnswer?.selectedOptionId ?? null;

  // Automatically move to the next question when the timer expires.
  const handleTimerExpire = useCallback(() => {
    if (isLastQuestion) {
      navigate(`/assessments/${id}/result`);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
  }, [id, isLastQuestion, navigate]);

  // Start/reset the timer whenever the current question changes.
  const { timeRemaining } = useAssessmentTimer({
    duration: assessment.config.timePerQuestion,
    questionKey: currentQuestion?.id ?? 0,
    onExpire: handleTimerExpire,
  });

  // Select an answer for the current question.
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

    setAnswers((previousAnswers) =>
      previousAnswers.map((answer) =>
        answer.questionId === currentQuestion.id
          ? {
              ...answer,
              selectedOptionId: optionId,
            }
          : answer
      )
    );
  };

  // Move to the next question or submit the assessment.
  const handleNext = () => {
    if (!currentQuestion) {
      return;
    }

    if (isLastQuestion) {
      console.log("Assessment answers:", answers);

      navigate(`/assessments/${id}/result`);
      return;
    }

    setCurrentQuestionIndex((previous) => previous + 1);
  };

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">
          Assessment question not found.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Employee Assessment
            </p>

            <h1 className="text-2xl font-bold tracking-tight">
              {assessment.title}
            </h1>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              Question
            </p>

            <p className="text-lg font-semibold">
              {currentQuestionIndex + 1}{" "}
              <span className="text-muted-foreground">
                / {totalQuestions}
              </span>
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${
                ((currentQuestionIndex + 1) /
                  totalQuestions) *
                100
              }%`,
            }}
          />
        </div>

        {/* Timer */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-3 rounded-xl border bg-card px-6 py-4 shadow-sm">
            <Clock className="h-5 w-5 text-primary" />

            <div>
              <p className="text-xs text-muted-foreground">
                Time Remaining
              </p>

              <p
                className={`text-2xl font-bold tabular-nums ${
                  timeRemaining <= 10
                    ? "text-destructive"
                    : ""
                }`}
              >
                {String(
                  Math.floor(timeRemaining / 60)
                ).padStart(2, "0")}
                :
                {String(timeRemaining % 60).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>

        {/* Question */}
        <Card>
          <CardHeader>
            <p className="text-sm font-medium text-muted-foreground">
              Question {currentQuestionIndex + 1}
            </p>

            <h2 className="text-xl font-semibold leading-relaxed">
              {currentQuestion.question}
            </h2>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected =
                  selectedOption === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      handleSelectOption(option.id)
                    }
                    className={`
                      flex w-full items-center gap-4 rounded-xl
                      border p-4 text-left transition
                      hover:bg-muted/50
                      ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border"
                      }
                    `}
                  >
                    {/* Radio indicator */}
                    <div
                      className={`
                        flex h-5 w-5 shrink-0 items-center
                        justify-center rounded-full border
                        ${
                          isSelected
                            ? "border-primary"
                            : "border-muted-foreground/40"
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Option letter */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {option.id}
                    </span>

                    {/* Option text */}
                    <span className="text-sm leading-relaxed">
                      {option.text}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />

                <span>
                  Select an answer before continuing.
                </span>
              </div>

              <Button
                size="lg"
                disabled={!selectedOption}
                onClick={handleNext}
              >
                {isLastQuestion
                  ? "Submit Assessment"
                  : "Next Question"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}