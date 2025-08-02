// src/services/ai.ts

export interface EnhancementResult {
  enhanced_description: string;
  enhanced_steps: { step_number: number; description: string }[];
}

export async function callEnhancementAPI(
  description: string,
  steps: string
): Promise<EnhancementResult> {
  if (!description || !steps) {
    throw new Error('Description and steps must be provided.');
  }

  const resp = await fetch('/.netlify/functions/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, steps }),
  });

  const text = await resp.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('Enhance function returned invalid JSON:', text);
    throw new Error(`Enhancement API error: ${resp.status} – invalid JSON response`);
  }

  if (!resp.ok) {
    console.error('Enhancement API error details:', data);
    throw new Error(`Enhancement API error: ${resp.status} – ${data.error || JSON.stringify(data)}`);
  }

  // Validate shape
  if (
    typeof data.enhanced_description !== 'string' ||
    !Array.isArray(data.enhanced_steps)
  ) {
    console.error('Unexpected response shape:', data);
    throw new Error('Enhancement API returned unexpected data');
  }

  return {
    enhanced_description: data.enhanced_description,
    enhanced_steps: data.enhanced_steps,
  };
}
