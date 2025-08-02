export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { description, steps } = JSON.parse(event.body);

  console.log('Received payload:', { description, steps });
  console.log('GEMINI_API_KEY set:', !!process.env.GEMINI_API_KEY);

  try {
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: 'You are an investment strategy enhancer. Improve the description and steps for clarity and professionalism. Return the enhanced description as the first line, followed by enhanced steps, one per line.' },
              { text: `Description: ${description}\nSteps: ${steps}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await resp.json();
    console.log('Gemini Response:', resp.status, data);

    if (!resp.ok) {
      throw new Error(`Gemini API error: ${resp.status} - ${JSON.stringify(data)}`);
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const lines = textResponse.split('\n').filter(line => line.trim().length > 0);

    return {
      statusCode: resp.status,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({
        enhanced_description: lines[0] || description,
        enhanced_steps: lines.slice(1).map((step, index) => ({
          step_number: index + 1,
          description: step.trim(),
        })) || steps.split('\n').filter(line => line.trim().length > 0).map((step, index) => ({
          step_number: index + 1,
          description: step.trim(),
        })),
      }),
    };
  } catch (error) {
    console.error('Error in enhance function:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://ogonjo.com',
      },
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
}