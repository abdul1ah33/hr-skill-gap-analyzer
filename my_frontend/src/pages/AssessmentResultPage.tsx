import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

export default function AssessmentResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>

            <CardTitle className="text-2xl">
              Assessment Submitted
            </CardTitle>

            <p className="mt-2 text-muted-foreground">
              Your assessment has been submitted successfully.
            </p>
          </CardHeader>

          <CardContent>
            <div className="rounded-xl border bg-muted/30 p-6">
              <div className="flex items-center gap-4">
                <ClipboardCheck className="h-8 w-8 text-primary" />

                <div>
                  <p className="font-semibold">
                    Assessment Completed
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Your answers have been recorded.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
              >
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}