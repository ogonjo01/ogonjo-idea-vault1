// src/components/StrategyStepsModal.tsx
import { useState, useEffect } from 'react';

interface StrategyStep {
  step_number: number;
  description: string;
}

interface StrategyStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategySteps: StrategyStep[];
  strategyTitle: string;
}

const StrategyStepsModal = ({
  isOpen,
  onClose,
  strategySteps,
  strategyTitle,
}: StrategyStepsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/70 to-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg border border-teal-100 transform transition-all duration-300 ease-in-out hover:shadow-3xl">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-montserrat text-2xl font-bold text-teal-800 tracking-wide">
            {strategyTitle} Execution Framework
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-teal-600 transition-colors duration-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-gray-100 p-3">
          {strategySteps.map((step, index) => (
            <div
              key={index}
              className="p-4 bg-gradient-to-br from-teal-50 to-white rounded-lg border-l-4 border-teal-200 shadow-md hover:bg-teal-100 transition-all duration-200"
            >
              <h3 className="font-roboto text-lg font-semibold text-gray-900">
                Step {step.step_number}
              </h3>
              <p className="font-roboto text-base text-gray-700 mt-2 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default StrategyStepsModal;