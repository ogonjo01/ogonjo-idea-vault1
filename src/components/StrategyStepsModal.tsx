import { useState, useEffect } from 'react';

interface StrategyStep {
  step: string;
  description: string;
}

interface StrategyStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategySteps: StrategyStep[];
  strategyTitle: string;
}

const StrategyStepsModal = ({ isOpen, onClose, strategySteps, strategyTitle }: StrategyStepsModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md border border-gray-200">
        <h2 className="font-montserrat text-xl font-semibold text-gray-900 mb-4">{strategyTitle} Steps</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto p-2">
          {strategySteps.map((step, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-md border border-gray-100">
              <h3 className="font-roboto text-md font-medium text-gray-800">{step.step}</h3>
              <p className="font-roboto text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StrategyStepsModal;