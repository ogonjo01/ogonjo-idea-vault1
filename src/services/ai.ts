// src/services/ai.ts  

export async function enhanceInvestmentContent(
  description: string,
  strategySteps: string
): Promise<{
  enhancedDescription: string;
  enhancedSteps: { step_number: number; description: string }[];
}> {
  const res = await fetch('/.netlify/functions/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, steps: strategySteps }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Enhancement API Error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  if (typeof data.enhanced_description !== 'string') {
    throw new Error('Invalid response: missing enhanced_description');
  }
  if (!Array.isArray(data.enhanced_steps)) {
    console.warn('enhanced_steps not an array, falling back to original steps');
    // fallback: split the original lines
    const lines = strategySteps
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    data.enhanced_steps = lines.map((l, i) => ({
      step_number: i + 1,
      description: l,
    }));
  }

  return {
    enhancedDescription: data.enhanced_description,
    enhancedSteps: data.enhanced_steps,
  };
}
