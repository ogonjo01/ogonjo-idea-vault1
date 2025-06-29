// src/pages/UpdatePassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // No need for useSearchParams if reading hash directly
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false); // New state to track if there's an error in the URL hash
  const [errorMessageFromUrl, setErrorMessageFromUrl] = useState<string | null>(null); // To store URL-based error
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // This useEffect will parse the URL hash for error parameters
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1)); // Remove '#'
      const error = params.get('error');
      const errorCode = params.get('error_code');
      const errorDescription = params.get('error_description');

      if (error || errorCode || errorDescription) {
        setHasError(true);
        const description = errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : 'An unknown error occurred.';
        setErrorMessageFromUrl(description);
        setMessage(`Error: ${description}. Please request a new link.`);
        toast({
          title: "Link Expired or Invalid",
          description: description + ". Please request a new password reset link.",
          variant: "destructive",
          duration: 7000,
        });

        // Optionally clear the hash from the URL to prevent re-triggering the error state
        // Be careful with this, as it can interfere if Supabase is still trying to process it.
        // For password resets, it's generally safe after you've read the error.
        // navigate('/forgot-password', { replace: true }); // Redirect to forgot password to get new link
        // Or navigate to a dedicated error page: navigate('/reset-password-error', { state: { error: description }});
      }
    }

    // This part is for actively listening to Supabase auth state changes
    // It's good to keep for general session management, even if the primary error detection
    // is from the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
            console.log('Auth event in UpdatePassword:', event);
            if (event === 'SIGNED_IN' && session) {
                console.log('User signed in via recovery link:', session.user?.email);
                // If a session is successfully established, clear any URL errors
                setHasError(false);
                setErrorMessageFromUrl(null);
            } else if (event === 'SIGNED_OUT' && !session) {
                console.log('Session signed out in UpdatePassword, potentially due to invalid token.');
                // Handle cases where a session might be cleared or not established
            }
        }
    );

    return () => {
        subscription.unsubscribe();
    };
  }, [navigate, toast]); // Include navigate and toast in dependencies if used inside useEffect

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setHasError(false); // Clear previous error state on new attempt

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First, ensure Supabase has a valid session from the hash.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No active user session detected during password update attempt.");
        setMessage("Session expired or invalid. Please request a new password reset link.");
        toast({
          title: "Session Expired",
          description: "Your session is no longer valid. Please request a new password reset link.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      console.log("Attempting to update password for:", user.email);

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }

      setMessage('Your password has been updated successfully!');
      toast({
        title: "Success",
        description: "Your password has been updated successfully! You can now log in with your new password.",
        variant: "default",
      });
      navigate('/dashboard'); // Or navigate to login page
    } catch (err: any) {
      console.error('Password update error:', err.message);
      setMessage(`Error updating password: ${err.message}`);
      toast({
        title: "Password Update Failed",
        description: err.message || "An unexpected error occurred while updating your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="font-montserrat text-2xl text-center text-red-600">Link Invalid or Expired</CardTitle>
            <CardDescription className="font-roboto text-center">
              {errorMessageFromUrl || "The password reset link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="font-roboto text-muted-foreground mb-4">
              Please request a new password reset link to regain access to your account.
            </p>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-roboto"
            >
              Request New Link
            </Button>
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="w-full mt-2"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-montserrat text-2xl text-center">Set New Password</CardTitle>
          <CardDescription className="font-roboto text-center">
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="font-roboto">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your new password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-roboto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="font-roboto">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your new password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="font-roboto"
              />
            </div>
            {message && (
              <p className={`text-center text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-green-500'}`}>
                {message}
              </p>
            )}
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
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

export default UpdatePassword;