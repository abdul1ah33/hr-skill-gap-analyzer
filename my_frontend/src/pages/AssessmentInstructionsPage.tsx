import { useNavigate } from "react-router-dom";
import { mockAssessment } from "../data/mockAssessment";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Clock,
  FileQuestion,
  ShieldAlert,
  Maximize,
  ClipboardX,
} from "lucide-react";

export default function AssessmentInstructionsPage() {
  const navigate = useNavigate();
  const assessment = mockAssessment;

  const handleStart = () => {
    navigate(`/assessments/${assessment.id}`);
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Employee Assessment
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {assessment.title}
          </h1>

          {assessment.description && (
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {assessment.description}
            </p>
          )}
        </div>

        {/* Assessment information */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileQuestion className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Questions
                </p>

                <p className="text-xl font-semibold">
                  {assessment.questions.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Time per question
                </p>

                <p className="text-xl font-semibold">
                  {assessment.config.timePerQuestion} sec
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-primary/10 p-3">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Allowed violations
                </p>

                <p className="text-xl font-semibold">
                  {assessment.config.maxViolations}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Before you begin</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-6">
              {/* Timer */}
              <div className="flex gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <Clock className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-medium">
                    Time limit
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Each question has a{" "}
                    <span className="font-medium text-foreground">
                      {assessment.config.timePerQuestion}-second
                    </span>{" "}
                    time limit. When the timer reaches zero,
                    the assessment will automatically move to
                    the next question.
                  </p>
                </div>
              </div>

              {/* One question at a time */}
              <div className="flex gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <FileQuestion className="h-5 w-5" />
                </div>

                <div>
                  <h3 className="font-medium">
                    One question at a time
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Questions are presented individually. Once
                    you move to the next question, you should
                    carefully review your answer before continuing.
                  </p>
                </div>
              </div>

              {/* Fullscreen */}
              {assessment.config.requireFullscreen && (
                <div className="flex gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <Maximize className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Fullscreen mode
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The assessment will run in fullscreen mode.
                      Leaving fullscreen may be counted as an
                      assessment violation.
                    </p>
                  </div>
                </div>
              )}

              {/* Copy protection */}
              {assessment.config.preventCopy && (
                <div className="flex gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <ClipboardX className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Copy protection
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Copy, cut, paste, and the context menu are
                      disabled during the assessment.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab switching */}
              {assessment.config.detectTabSwitch && (
                <div className="flex gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <ShieldAlert className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-medium">
                      Assessment window
                    </h3>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Do not leave the assessment window. Leaving
                      the assessment may result in a violation.
                      The assessment will be terminated after{" "}
                      <span className="font-medium text-foreground">
                        {assessment.config.maxViolations}
                      </span>{" "}
                      violations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Warning */}
            <div className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
              <p className="text-sm">
                <span className="font-semibold">
                  Important:
                </span>{" "}
                Make sure you are ready before starting. Once the
                assessment begins, the timer cannot be paused.
              </p>
            </div>

            {/* Start */}
            <div className="mt-8 flex justify-end">
              <Button
                size="lg"
                onClick={handleStart}
              >
                Start Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}