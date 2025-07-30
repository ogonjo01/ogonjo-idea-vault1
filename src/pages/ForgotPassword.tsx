// src/pages/ForgotPassword.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase'; // Your Supabase client
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast'; // Shadcn toast

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      // Supabase password reset
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // URL user will be redirected to after clicking email link
      });

      if (error) {
        throw error;
      }

      setMessage('Password reset email sent! Check your inbox.');
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions.",
        variant: "default",
      });
    } catch (err: any) {
      console.error('Password reset error:', err.message);
      setMessage(`Error: ${err.message}`);
      toast({
        title: "Password Reset Failed",
        description: err.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-montserrat text-2xl text-center">Forgot Password?</CardTitle>
          <CardDescription className="font-roboto text-center">
            Enter your email to receive a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-roboto">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-roboto"
              />
            </div>
            {message && (
              <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm font-roboto text-muted-foreground">
            Remembered your password?{' '}
            <Button variant="link" size="sm" onClick={() => navigate('/')} className="px-0">
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;