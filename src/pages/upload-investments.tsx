// src/pages/upload-investments.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// API call to your Netlify Function proxy
const enhanceInvestmentContent = async (description: string, strategySteps: string) => {
  const response = await fetch('/.netlify/functions/enhance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, steps: strategySteps }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Enhancement API error:', response.status, errorText);
    throw new Error(`API error: ${response.statusText} – ${errorText}`);
  }

  const data = await response.json();

  // Ensure we always get an array of steps back
  const enhancedStepsArray: { step_number: number; description: string }[] =
    Array.isArray(data.enhanced_steps)
      ? data.enhanced_steps
      : strategySteps
          .split('\n')
          .filter(line => line.trim().length > 0)
          .map((step, index) => ({
            step_number: index + 1,
            description: step.trim(),
          }));

  return {
    enhancedDescription:
      data.enhanced_description ||
      `Enhanced Overview: ${description}. This strategy provides a structured approach to maximize returns while managing risks.`,
    enhancedSteps: enhancedStepsArray,  // ← return real array here
  };
};

const UploadInvestments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '📈 Stocks & ETFs',
    description: '',
    affiliate_link: '',
    risk_level: '',
    expected_returns: '',
    strategy_steps: '',
    is_active: true,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) navigate('/auth');
    };
    checkAuth().catch(console.error);
  }, [navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please log in to upload.');
      setLoading(false);
      return;
    }

    try {
      const { enhancedDescription, enhancedSteps } =
        await enhanceInvestmentContent(
          formData.description,
          formData.strategy_steps
        );

      const record = {
        id: crypto.randomUUID(),
        title: formData.title,
        category: formData.category,
        description: enhancedDescription,
        affiliate_link: formData.affiliate_link || null,
        views: 0,
        likes: 0,
        risk_level: formData.risk_level || null,
        expected_returns: formData.expected_returns || null,
        // Serialize the array here, right before inserting
        strategy_steps: JSON.stringify({ steps: enhancedSteps }),
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id,
      };

      const { error: insertError } = await supabase
        .from('inv_investment_strategies')
        .insert(record);

      if (insertError) {
        throw new Error(insertError.message);
      }

      // Reset form and navigate
      setFormData({
        title: '',
        category: '📈 Stocks & ETFs',
        description: '',
        affiliate_link: '',
        risk_level: '',
        expected_returns: '',
        strategy_steps: '',
        is_active: true,
      });
      alert('Investment strategy uploaded successfully!');
      navigate('/profile');
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(`AI enhancement or upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">
              Upload Investment Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && <p className="text-destructive mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* --- all your existing inputs remain exactly the same --- */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-roboto text-muted-foreground mb-1"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                  required
                />
              </div>
              {/* … other fields unchanged … */}
              <div>
                <label
                  htmlFor="strategy_steps"
                  className="block text-sm font-roboto text-muted-foreground mb-1"
                >
                  Strategy Steps (one per line)
                </label>
                <textarea
                  id="strategy_steps"
                  name="strategy_steps"
                  value={formData.strategy_steps}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                  required
                />
              </div>
              <Button
                type="submit"
                className="font-roboto bg-foreground hover:bg-foreground/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadInvestments;
