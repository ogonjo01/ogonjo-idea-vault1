// src/pages/upload-investments.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/services/supabase';
import { callEnhancementAPI } from '@/services/ai';

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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) navigate('/auth');
    });
  }, [navigate]);

  const handleChange = (e: any) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

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
      // 1) Call your Netlify function proxy to get the enhancement
      const result = await callEnhancementAPI(
        formData.description,
        formData.strategy_steps
      );

      // 2) Build the record to insert
      const record = {
        id: crypto.randomUUID(),
        title: formData.title,
        category: formData.category,
        description: result.enhanced_description,
        affiliate_link: formData.affiliate_link || null,
        views: 0,
        likes: 0,
        risk_level: formData.risk_level || null,
        expected_returns: formData.expected_returns || null,
        strategy_steps: JSON.stringify({ steps: result.enhanced_steps }),
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id,
      };

      // 3) Insert into Supabase
      const { error: insertError } = await supabase
        .from('inv_investment_strategies')
        .insert(record);

      if (insertError) {
        throw new Error(insertError.message);
      }

      // 4) Success!
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
      console.error('Upload failed:', err);
      setError(err.message || 'An unexpected error occurred.');
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
              {/* … all your input fields here … */}
              <Button
                type="submit"
                className="font-roboto bg-foreground hover:bg-foreground/90 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading…
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
