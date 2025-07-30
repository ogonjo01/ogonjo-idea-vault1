// src/pages/Landing.tsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/pages/Auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  const [searchParams] = useSearchParams();
  const authFormRef = useRef<HTMLDivElement>(null); // Create a ref for the auth form

  // useEffect to handle 'auth' query parameter for scrolling to the form
  // This will now trigger when navigating to /auth?auth=true
  useEffect(() => {
    if (searchParams.get('auth') === 'true') {
      console.log("Landing: Auth query parameter detected on /auth path.");
      setIsLogin(true); // Ensure the form defaults to login mode

      if (authFormRef.current) {
        console.log("Landing: Found auth form element via ref. Attempting to scroll.");
        const headerHeight = 64; // Assuming your Header has a fixed height of 64px (h-16)
        const elementPosition = authFormRef.current.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerHeight - 20; // 20px extra padding

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        console.log("Landing: Scrolled to auth form.");
      } else {
        console.error("Landing: Error: Auth form element ref is null. Cannot scroll.");
      }
      // Optional: Clear the query parameter after scrolling to prevent re-triggering on refresh
      // navigate(location.pathname, { replace: true }); // Requires 'location' from useLocation()
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Landing: Form submitted. Attempting authentication...");

    if (!email || !password || (!isLogin && !name)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      console.log("Landing: Form validation failed: Missing fields.");
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (!error) {
        navigate('/'); // Navigate to Dashboard (new landing page) after successful login
        toast({
          title: "Logged In Successfully!",
          description: "Welcome back to OGONJO.",
        });
        console.log("Landing: Login successful, redirecting to dashboard.");
      } else {
        let errorMessage = "An unexpected error occurred during login.";
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("Email not confirmed")) {
          errorMessage = "Please confirm your email address to log in.";
        } else if (error.message.includes("User not found")) {
            errorMessage = "No account found with this email. Please sign up.";
        }

        toast({
          title: "Login Failed",
          description: errorMessage,
          variant: "destructive",
        });
        console.error('Landing: Login error:', error.message);
      }
    } else { // Sign Up
      const { error } = await signUp(email, password, name);
      if (!error) {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account. You can then log in.",
          variant: "default",
        });
        setIsLogin(true); // Switch to login mode after successful signup
        console.log("Landing: Sign up successful. Email verification required.");
      } else {
        let errorMessage = "An unexpected error occurred during signup.";
        if (error.message.includes("User already registered")) {
          errorMessage = "An account with this email already exists. Please log in.";
        } else if (error.message.includes("Password should be at least")) {
            errorMessage = "Password is too short or does not meet requirements.";
        }

        toast({
          title: "Signup Failed",
          description: errorMessage,
          variant: "destructive",
        });
        console.error('Landing: Signup error:', error.message);
      }
    }
  };

  const handleGetStarted = () => {
    // If user is logged in, navigate to Dashboard (which is now '/')
    if (user) {
      console.log("Landing: Get Started clicked (user logged in), navigating to dashboard.");
      navigate('/'); // Navigate to the new landing page
    } else {
      // If not logged in, scroll to the auth form on this page (/auth)
      console.log("Landing: Get Started clicked (user not logged in), attempting to scroll to auth form.");
      if (authFormRef.current) {
        const headerHeight = 64;
        const elementPosition = authFormRef.current.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerHeight - 20;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        console.log("Landing: Scrolled to auth form via Get Started.");
      } else {
        console.error("Landing: Error: Auth form element ref is null for Get Started button!");
      }
    }
  };

  const handleForgotPasswordClick = () => {
    console.log("Landing: Forgot password clicked, navigating to /forgot-password.");
    navigate('/forgot-password');
  };

  return (
    // Removed outer div styling (min-h-screen, flex-col, bg-background) as MainLayout provides it
    // Main content of Landing page
    <div>
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

          {/* Login/Signup Form - IMPORTANT: Attach the ref here */}
          <div className="lg:pl-8">
            <Card id="auth-form" ref={authFormRef} className="w-full max-w-md mx-auto shadow-lg">
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
                      onClick={() => { console.log("Landing: Switch to Signup/Login button clicked."); setIsLogin(!isLogin); }}
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
    </div>
  );
};

export default Landing;
