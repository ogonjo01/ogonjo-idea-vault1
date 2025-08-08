// src/components/StrategyStepsModal.tsx
import React from 'react';

interface StrategyStep {
  step_number: number;
  description: string;
}
interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategySteps: StrategyStep[];
  strategyTitle: string;
}

const StrategyStepsModal: React.FC<Props> = ({ isOpen, onClose, strategySteps, strategyTitle }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-white w-full max-w-3xl p-8 rounded-2xl shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-blue-700">{strategyTitle} Execution</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-500 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-4 prose prose-blue">
          {strategySteps.map((step, idx) => (
            <div key={idx} className="p-6 bg-gradient-to-br from-blue-50 to-white rounded-xl border-l-4 border-teal-400 shadow-inner">
              <h3 className="text-2xl font-semibold text-gray-800 mb-2">Step {step.step_number}</h3>
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: step.description }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-8 w-full bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-lg font-semibold hover:shadow-lg transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StrategyStepsModal;
