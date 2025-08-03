import React from 'react';

export interface StrategyStep {
  step_number: number;
  description: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  strategySteps: StrategyStep[];
  strategyTitle: string;
}

export default function StrategyStepsModal({
  isOpen, onClose, strategySteps, strategyTitle,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 transform transition-all duration-300 ease-in-out">
        <div className="modal-header flex justify-between items-center border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-extrabold text-teal-800 tracking-tight">
            {strategyTitle} — Strategic Execution Plan
          </h2>
          <button
            onClick={onClose}
            className="close-btn text-gray-500 hover:text-gray-700 transition-colors rounded-full p-2 hover:bg-gray-100"
            aria-label="Close Modal"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
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
        <div className="modal-content mt-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {strategySteps.length > 0 ? (
            strategySteps.map(({ step_number, description }) => (
              <div
                key={step_number}
                className="step-item bg-gray-50 p-4 rounded-lg shadow-md hover:bg-gray-100 transition-colors"
              >
                <h3 className="text-lg font-semibold text-teal-700">
                  Step {step_number}
                </h3>
                <p className="text-gray-600 mt-2 leading-relaxed">{description}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 italic">No strategic steps available.</p>
          )}
        </div>
        <div className="modal-footer mt-6 text-right">
          <button
            onClick={onClose}
            className="close-btn px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}