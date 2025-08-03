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
  isOpen, onClose, strategySteps, strategyTitle
}: Props) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{strategyTitle} — Detailed Steps</h2>
        <div className="steps-list">
          {strategySteps.map(({ step_number, description }) => (
            <div key={step_number} className="step-item">
              <h3>Step {step_number}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="close-btn">Close</button>
      </div>
    </div>
  );
}
