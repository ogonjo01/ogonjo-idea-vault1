// src/services/ai.ts
export interface EnhancementResult {
  enhanced_description: string;
  enhanced_steps: Array<{ step_number: number; description: string }>;
}

export async function callEnhancementAPI(
  description: string,
  steps: string
): Promise<EnhancementResult> {
  const resp = await fetch('/.netlify/functions/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, steps }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Enhancement API error: ${resp.status} – ${errText}`);
  }
  return resp.json();
}
