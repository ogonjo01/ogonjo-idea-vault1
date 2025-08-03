import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';

// API call to Gemini via Netlify Function
const enhanceInvestmentContent = async (description: string, strategySteps: string) => {
  try {
    const response = await fetch('/.netlify/functions/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, steps: strategySteps }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Enhancement API error:', response.status, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    let data;
    try {
      data = await response.json(); // Attempt to parse JSON
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      throw new Error('Invalid server response: Data is not valid JSON');
    }

    // Ensure enhanced_steps is always an array
    const enhancedStepsArray = Array.isArray(data.enhanced_steps) ? data.enhanced_steps : [];
    return {
      enhancedDescription: typeof data.enhanced_description === 'string' ? data.enhanced_description : `Enhanced Overview: ${description}. This strategy provides a structured approach to maximize returns while managing risks.`,
      enhancedSteps: JSON.stringify({
        steps: enhancedStepsArray.length > 0 ? enhancedStepsArray : strategySteps.split('\n').filter(line => line.trim().length > 0).map((step, index) => ({
          step_number: index + 1,
          description: step.trim(),
        })),
      }),
    };
  } catch (err) {
    console.error('Enhancement failed:', err);
    throw err instanceof Error ? err : new Error('Unknown enhancement error');
  }
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
      console.log('Auth check:', user ? 'Authenticated' : 'Not authenticated');
      if (!user) navigate('/auth');
    };
    checkAuth().catch(err => console.error('Auth check failed:', err));
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      console.log('Form data:', formData);
      const { enhancedDescription, enhancedSteps } = await enhanceInvestmentContent(formData.description, formData.strategy_steps);

      const data = {
        id: crypto.randomUUID(),
        title: formData.title,
        category: formData.category,
        description: enhancedDescription,
        affiliate_link: formData.affiliate_link || null,
        views: 0,
        likes: 0,
        risk_level: formData.risk_level || null,
        expected_returns: formData.expected_returns || null,
        strategy_steps: JSON.stringify({ steps: enhancedSteps }),
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id,
      };

      console.log('Data to insert:', data);
      const { error: insertError } = await supabase
        .from('inv_investment_strategies')
        .insert(data);

      if (insertError) {
        console.error('Supabase insert error:', insertError.message);
        setError(`Failed to upload: ${insertError.message}`);
      } else {
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
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Submission error:', err);
      setError(`AI enhancement or upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-foreground">Upload Investment Strategy</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {error && <p className="text-destructive mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-roboto text-muted-foreground mb-1">Title</label>
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
              <div>
                <label htmlFor="category" className="block text-sm font-roboto text-muted-foreground mb-1">Category</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                >
                  <option value="📈 Stocks & ETFs">📈 Stocks & ETFs</option>
                  <option value="🏘 Real Estate">🏘 Real Estate</option>
                  <option value="💰 Crypto & Blockchain">💰 Crypto & Blockchain</option>
                  <option value="🧾 Bonds & Fixed Income">🧾 Bonds & Fixed Income</option>
                  <option value="🏦 Cash & Safe Instruments">🏦 Cash & Safe Instruments</option>
                  <option value="⚖️ Commodities & Metals">⚖️ Commodities & Metals</option>
                  <option value="🧪 Alternatives (VC, Art, etc.)">🧪 Alternatives (VC, Art, etc.)</option>
                  <option value="👵 Retirement & Long-Term">👵 Retirement & Long-Term</option>
                  <option value="🐣 Beginner’s Corner">🐣 Beginner’s Corner</option>
                  <option value="📰 Market News & Trends">📰 Market News & Trends</option>
                </select>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-roboto text-muted-foreground mb-1">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md h-32"
                  required
                />
              </div>
              <div>
                <label htmlFor="affiliate_link" className="block text-sm font-roboto text-muted-foreground mb-1">Affiliate Link (optional)</label>
                <input
                  type="text"
                  id="affiliate_link"
                  name="affiliate_link"
                  value={formData.affiliate_link}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="risk_level" className="block text-sm font-roboto text-muted-foreground mb-1">Risk Level (optional)</label>
                <input
                  type="text"
                  id="risk_level"
                  name="risk_level"
                  value={formData.risk_level}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="expected_returns" className="block text-sm font-roboto text-muted-foreground mb-1">Expected Returns (optional)</label>
                <input
                  type="text"
                  id="expected_returns"
                  name="expected_returns"
                  value={formData.expected_returns}
                  onChange={handleChange}
                  className="w-full p-2 border border-input bg-background rounded-md"
                />
              </div>
              <div>
                <label htmlFor="strategy_steps" className="block text-sm font-roboto text-muted-foreground mb-1">Strategy Steps (one per line)</label>
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
                ) : 'Upload'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default UploadInvestments;