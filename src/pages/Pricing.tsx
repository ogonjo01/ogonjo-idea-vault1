import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Check, Shield, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Pricing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'enterprise'>('pro');
  const [showPromoCode, setShowPromoCode] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$0',
      period: 'month',
      trial: null,
      popular: false,
      features: [
        "View Today's Idea",
        "Browse Archive (last 7 days)"
      ],
      buttonText: 'Sign Up',
      buttonVariant: 'outline' as const
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$5',
      period: 'month',
      trial: '3-day free trial',
      popular: true,
      features: [
        "View Today's Idea",
        "Full Archive",
        "Download PPTs",
        "Save Favorites"
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$15',
      period: 'month',
      trial: '7-day free trial',
      popular: false,
      features: [
        "Everything in Pro",
        "Priority Support",
        "Advanced Analytics",
        "Custom Categories",
        "API Access"
      ],
      buttonText: 'Start Free Trial',
      buttonVariant: 'default' as const
    }
  ];

  const handlePlanSelect = (planId: 'starter' | 'pro' | 'enterprise') => {
    setSelectedPlan(planId);
    setIsModalOpen(true);
  };

  const handleSubscriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Subscription Created!",
      description: `Welcome to the ${plans.find(p => p.id === selectedPlan)?.name} plan!`,
    });
    setIsModalOpen(false);
    navigate('/dashboard');
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="font-roboto text-xl text-muted-foreground max-w-2xl mx-auto">
            Affordable access to fresh business ideas, every single day.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative transition-all duration-300 hover:shadow-lg ${
                plan.popular ? 'border-accent shadow-lg scale-105' : 'border-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground font-roboto px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="font-montserrat text-2xl text-foreground mb-2">
                  {plan.name}
                </CardTitle>
                <div className="mb-4">
                  <span className="font-montserrat font-bold text-4xl text-primary">
                    {plan.price}
                  </span>
                  <span className="font-roboto text-muted-foreground">
                    / {plan.period}
                  </span>
                </div>
                {plan.trial && (
                  <p className="font-roboto text-sm text-accent font-medium">
                    {plan.trial}
                  </p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 font-roboto text-foreground">
                      <Check className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  variant={plan.buttonVariant}
                  size="lg"
                  className="w-full font-roboto"
                  onClick={() => handlePlanSelect(plan.id as 'starter' | 'pro' | 'enterprise')}
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Signals */}
        <div className="text-center space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm font-roboto text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Secure payments via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span>Your data is encrypted & safe</span>
            </div>
          </div>
          <p className="font-roboto text-accent font-medium">
            7-day money-back guarantee
          </p>
        </div>
      </main>

      {/* Subscription Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-montserrat text-2xl text-center">
              Create Your Account & Subscribe
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubscriptionSubmit} className="space-y-4">
            {/* Plan Details */}
            {selectedPlanData && (
              <div className="bg-secondary/30 p-4 rounded-lg">
                <h3 className="font-montserrat font-semibold text-lg text-foreground">
                  {selectedPlanData.name} Plan
                </h3>
                <p className="font-roboto text-muted-foreground">
                  {selectedPlanData.price}/{selectedPlanData.period}
                  {selectedPlanData.trial && ` • ${selectedPlanData.trial}`}
                </p>
              </div>
            )}

            {/* Account Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-roboto">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  className="font-roboto"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="font-roboto">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="font-roboto"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="font-roboto">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  className="font-roboto"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="font-roboto">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  className="font-roboto"
                  required
                />
              </div>
            </div>

            {/* Payment Section */}
            {selectedPlan !== 'starter' && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h4 className="font-montserrat font-semibold text-foreground">Payment Details</h4>
                
                <div className="space-y-2">
                  <Label htmlFor="cardNumber" className="font-roboto">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className="font-roboto"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry" className="font-roboto">Expiry</Label>
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      className="font-roboto"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvc" className="font-roboto">CVC</Label>
                    <Input
                      id="cvc"
                      type="text"
                      placeholder="123"
                      className="font-roboto"
                      required
                    />
                  </div>
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  {!showPromoCode ? (
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-roboto text-sm"
                      onClick={() => setShowPromoCode(true)}
                    >
                      Have a promo code?
                    </Button>
                  ) : (
                    <>
                      <Label htmlFor="promoCode" className="font-roboto">Promo Code</Label>
                      <Input
                        id="promoCode"
                        type="text"
                        placeholder="Enter promo code"
                        className="font-roboto"
                      />
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start space-x-2">
              <Checkbox id="terms" required />
              <Label 
                htmlFor="terms" 
                className="font-roboto text-sm text-muted-foreground leading-relaxed"
              >
                I agree to the{' '}
                <a href="/terms" className="text-primary hover:underline" target="_blank">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline" target="_blank">
                  Privacy Policy
                </a>
              </Label>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
              size="lg"
            >
              Complete Subscription
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Pricing;