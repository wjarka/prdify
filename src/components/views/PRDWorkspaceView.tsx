import type { FC } from "react";
import { usePRDWorkspace } from "../hooks/usePRDWorkspace";
import { PRDHeader } from "../prd/PRDHeader";
import { PlanningStep } from "../prd/PlanningStep";
import { SummaryStep } from "../prd/SummaryStep";
import { DocumentStep } from "../prd/DocumentStep";
import { CompleteStep } from "../prd/CompleteStep";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";

interface PRDWorkspaceViewProps {
  prdId: string;
}

export const PRDWorkspaceView: FC<PRDWorkspaceViewProps> = ({ prdId }) => {
  const {
    prd,
    questions,
    currentStep,
    isLoading,
    isSubmitting,
    error,
    submitAnswers,
    generateNextQuestions,
    generateSummary,
    updateSummary,
    revertToPlanning,
    generateDocument,
    updateDocument,
    completePrd,
    exportPrd,
  } = usePRDWorkspace(prdId);

  // Error state
  if (currentStep === "error" && error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertTitle>Wystąpił błąd</AlertTitle>
          <AlertDescription>
            <p className="mb-4">{error.message}</p>
            {error.onRetry && (
              <Button onClick={error.onRetry} variant="outline" size="sm">
                Ponów próbę
              </Button>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (currentStep === "loading" || !prd) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <PRDHeader prd={prd} currentStep={currentStep} />

      {/* Error Alert */}
      {error && currentStep !== "error" && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Wystąpił błąd</AlertTitle>
          <AlertDescription>
            <p className="mb-2">{error.message}</p>
            {error.onRetry && (
              <Button onClick={error.onRetry} variant="outline" size="sm">
                Ponów próbę
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading overlay during operations */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Step container */}
      {!isLoading && (
        <div className="mt-8">
          {currentStep === "planning" && questions && (
            <PlanningStep
              prd={prd}
              questions={questions}
              isSubmitting={isSubmitting}
              onSubmitAnswers={submitAnswers}
              onContinuePlanning={generateNextQuestions}
              onGenerateSummary={generateSummary}
            />
          )}

          {currentStep === "summary" && (
            <SummaryStep
              prd={prd}
              isSubmitting={isSubmitting}
              onUpdateSummary={updateSummary}
              onGoBackToPlanning={revertToPlanning}
              onGenerateDocument={generateDocument}
            />
          )}

          {currentStep === "document" && (
            <DocumentStep
              prd={prd}
              isSubmitting={isSubmitting}
              onUpdateDocument={updateDocument}
              onComplete={completePrd}
            />
          )}

          {currentStep === "complete" && <CompleteStep prd={prd} onExport={exportPrd} />}
        </div>
      )}
    </div>
  );
};

export default PRDWorkspaceView;
