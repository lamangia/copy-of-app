
import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex items-center justify-center space-x-2 p-4">
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;

        return (
          <div key={stepNumber} className="flex items-center">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-all duration-300
                ${isActive ? 'bg-slate-800 text-stone-100' : ''}
                ${isCompleted ? 'bg-slate-500' : ''}
                ${!isActive && !isCompleted ? 'border-2 border-stone-300 text-stone-400' : ''}
              `}
            >
             {!isCompleted && <span>{stepNumber}</span>}
            </div>
            {stepNumber < totalSteps && (
              <div className={`h-0.5 w-6 transition-colors duration-300 ${isCompleted ? 'bg-slate-500' : 'bg-stone-300'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;