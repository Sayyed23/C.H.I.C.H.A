import { Check } from "lucide-react";
import { Card } from "./ui/card";

interface ProcessingStep {
  text: string;
  completed: boolean;
}

interface ProcessingStateProps {
  steps: ProcessingStep[];
}

export const ProcessingState = ({ steps }: ProcessingStateProps) => {
  return (
    <Card className="w-full p-4 mb-4">
      <h3 className="text-lg font-semibold mb-3 text-primary">CHICHA at work...</h3>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            {step.completed ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-t-transparent border-blue-500 animate-spin" />
            )}
            <span className="text-sm">{step.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};