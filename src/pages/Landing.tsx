// src/pages/Landing.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Header from '@/components/Header'; // Assuming Header.tsx takes an onLogin prop, but not directly using it for navigation here.
import Footer from '@/components/Footer';
import { featuredBenefits } from '@/data/mockData'; // Assuming mockData exists
import { useToast } from '@/components/ui/use-toast'; // Correct path for shadcn/ui toast hook

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn, signUp, user, loading } = useAuth();

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || (!isLogin && !name)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Removed the try...catch block here for authentication errors, as signIn/signUp return errors
    // rather than throwing them. A general catch for unexpected runtime errors could still be useful.
    if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate('/dashboard');
        toast({
          title: "Logged In Successfully!",
          description: "Welcome back to OGONJO.",
        });
      } else {
        // Handle specific login errors from Supabase
        let errorMessage = "An unexpected error occurred during login.";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please confirm your email address to log in.";
        } else if (error.message.includes("User not found")) {
          errorMessage = "No account found with this email. Please sign up.";
        }
        // Add more specific checks if other Supabase error messages are known

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        console.error('Login error:', error.message); // Keep console log for debugging
      }
    } else { // Sign Up
      const { error } = await signUp(email, password, name); // `name` parameter fixed in useAuth.tsx
      if (!error) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account. You can then log in.",
          variant: "default",
        });
        setIsLogin(true); // Switch to login mode after successful signup
      } else {
        // Handle specific signup errors from Supabase
        let errorMessage = "An unexpected error occurred during signup.";
        if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Please log in.";
        } else if (error.message.includes("Password should be at least")) {
            errorMessage = "Password is too short or does not meet requirements.";
        }
        // Add more specific checks for signup errors

        toast({
          title: "Signup Failed",
          description: errorMessage,
          variant: "destructive",
        });
        console.error('Signup error:', error.message); // Keep console log for debugging
      }
    }
  };

  // This is the function that the Header's login/signup buttons should call.
  // It will switch the form to login mode and scroll to it.
  const handleLoginClickFromHeader = () => {
    setIsLogin(true); // Ensure the form is in login mode
    const formElement = document.getElementById('auth-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      const formElement = document.getElementById('auth-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // New handler for "Forgot password?"
  const handleForgotPasswordClick = () => {
    navigate('/forgot-password'); // Navigate to your dedicated forgot password page
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* THIS IS THE ONLY LINE THAT WAS CHANGED FROM <Header /> */}
      <Header onLogin={handleLoginClickFromHeader} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="font-montserrat font-bold text-4xl lg:text-6xl text-foreground leading-tight">
                  Unlock Daily
                  <span className="text-primary"> Business Ideas</span>
                </h1>
                <p className="font-roboto text-xl text-muted-foreground leading-relaxed">
                  Join our community to access fresh, curated startup concepts every day.
                  Get expert-vetted business ideas that can transform your entrepreneurial journey.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto text-lg px-8 py-6"
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="font-roboto text-lg px-8 py-6"
                  onClick={() => navigate('/learn-more')}
                >
                  Learn More
                </Button>
              </div>
            </div>

            {/* Login/Signup Form */}
            <div className="lg:pl-8">
              <Card id="auth-form" className="w-full max-w-md mx-auto shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="font-montserrat text-2xl text-center">
                    {isLogin ? 'Welcome Back' : 'Join OGONJO'}
                  </CardTitle>
                  <CardDescription className="font-roboto text-center">
                    {isLogin
                      ? 'Sign in to access your business ideas'
                      : 'Create your account to get started'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                      <div className="space-y-2">
                        <Label htmlFor="name" className="font-roboto">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="font-roboto"
                          required={!isLogin}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-roboto">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="font-roboto"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="font-roboto">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="font-roboto"
                        required
                      />
                    </div>

                    {isLogin && (
                      <div className="text-right">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-roboto text-sm"
                          onClick={handleForgotPasswordClick}
                          type="button"
                        >
                          Forgot password?
                        </Button>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
                    >
                      {isLogin ? 'Log In' : 'Create Account'}
                    </Button>
                  </form>

                  <div className="mt-6">
                    <Separator />
                    <p className="text-center text-sm font-roboto text-muted-foreground mt-4">
                      {isLogin ? "New here?" : "Already have an account?"}{' '}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-roboto text-sm"
                        onClick={() => setIsLogin(!isLogin)}
                      >
                        {isLogin ? 'Create an account' : 'Sign in'}
                      </Button>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="bg-secondary/30 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-montserrat font-bold text-3xl lg:text-4xl text-foreground mb-4">
                Why Choose OGONJO?
              </h2>
              <p className="font-roboto text-lg text-muted-foreground max-w-2xl mx-auto">
                Get access to the most comprehensive collection of business ideas,
                vetted by experts and updated daily.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {featuredBenefits.map((benefit, index) => (
                <div key={index} className="text-center space-y-4">
                  <div className="text-4xl mb-4">{benefit.icon}</div>
                  <h3 className="font-montserrat font-semibold text-xl text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="font-roboto text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="max-w-3xl mx-auto space-y-8">
              <h2 className="font-montserrat font-bold text-3xl lg:text-4xl text-foreground">
                Ready to Transform Your Business Ideas?
              </h2>
              <p className="font-roboto text-lg text-muted-foreground">
                Join thousands of entrepreneurs who are already using OGONJO to
                discover and validate their next big business opportunity.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto text-lg px-12 py-6"
              onClick={handleGetStarted}
            >
              Start Exploring Ideas
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;