//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, TrendingUp, Search, Download, Users, Briefcase, DollarSign, HeadphonesIcon } from 'lucide-react';

const LearnMore = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-6">
            Turn Business Ideas into Action — One Slide at a Time
          </h1>
          <p className="font-roboto text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Every great business starts with a single idea. Our platform helps you discover new business opportunities, 
            market trends, and startup concepts — all neatly packaged in clear, professional PowerPoint presentations 
            you can download and use immediately.
          </p>
          <p className="font-roboto text-lg text-muted-foreground max-w-3xl mx-auto mt-4">
            Whether you're an aspiring entrepreneur, business consultant, or just exploring the startup world, 
            we give you the inspiration and insight to move from "what if" to "let's go."
          </p>
        </div>

        {/* What Makes Us Different */}
        <section className="mb-16">
          <h2 className="font-montserrat font-bold text-3xl text-foreground mb-8 text-center">
            🚀 What Makes Us Different?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Daily Business Ideas
                </h3>
                <p className="font-roboto text-muted-foreground">
                  We upload fresh business ideas every day — researched, structured, and ready to review. 
                  You'll never run out of inspiration.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Visual & Actionable
                </h3>
                <p className="font-roboto text-muted-foreground">
                  No long blog posts or scattered notes. Each idea is presented in a simple, scannable PPT format — 
                  perfect for saving, editing, or sharing.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Search, Filter & Discover
                </h3>
                <p className="font-roboto text-muted-foreground">
                  Looking for startup ideas in tech? Or maybe the food industry? Use our powerful filters 
                  and search to find exactly what you're looking for, fast.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="text-4xl mb-4">📁</div>
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-3">
                  Download Only When You're In
                </h3>
                <p className="font-roboto text-muted-foreground">
                  Only logged-in subscribers can download the presentations — making your subscription 
                  really valuable and exclusive.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Who Is This For */}
        <section className="mb-16">
          <h2 className="font-montserrat font-bold text-3xl text-foreground mb-8 text-center">
            🧠 Who Is This Platform For?
          </h2>
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="text-primary mt-1">•</div>
                  <p className="font-roboto text-muted-foreground">
                    <strong>Entrepreneurs</strong> looking for daily inspiration or new markets to tap into
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-primary mt-1">•</div>
                  <p className="font-roboto text-muted-foreground">
                    <strong>Small business owners</strong> wanting to expand into new ideas
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-primary mt-1">•</div>
                  <p className="font-roboto text-muted-foreground">
                    <strong>Students or researchers</strong> exploring real-world startup cases
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-primary mt-1">•</div>
                  <p className="font-roboto text-muted-foreground">
                    <strong>Consultants</strong> building business strategies for clients
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="text-primary mt-1">•</div>
                  <p className="font-roboto text-muted-foreground">
                    <strong>Investors</strong> looking for signals and trends
                  </p>
                </div>
              </div>
              <p className="font-roboto text-foreground text-center mt-6 font-medium">
                Whether you're launching your first business or helping others build theirs — we're your daily edge.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* What's Inside */}
        <section className="mb-16">
          <h2 className="font-montserrat font-bold text-3xl text-foreground mb-8 text-center">
            💼 What's Inside a Business Idea?
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="font-roboto text-muted-foreground mb-4">Each PowerPoint includes:</p>
                <div className="space-y-3">
                  {[
                    'A clear business concept',
                    'Market opportunity breakdown',
                    'Target customer profile',
                    'Startup cost estimates (if applicable)',
                    'Revenue model ideas',
                    'Challenges & opportunities',
                    'Bonus tips or unique angles'
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="font-roboto text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-montserrat font-semibold text-xl text-foreground mb-4">
                  🔐 Why Subscription-Only?
                </h3>
                <p className="font-roboto text-muted-foreground mb-4">
                  We believe that focus and quality matter. Keeping our platform behind a subscription helps us:
                </p>
                <div className="space-y-2">
                  {[
                    'Maintain exclusive content for serious users',
                    'Provide ad-free experience',
                    'Fund research and idea generation',
                    'Continuously improve our tools and dashboards'
                  ].map((item, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="text-primary mt-1">•</div>
                      <span className="font-roboto text-muted-foreground text-sm">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="font-roboto text-muted-foreground text-sm mt-4">
                  It also means you're part of a community that values real business growth — not just random ideas.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Removed Pricing Section */}
        {/*
        <section className="mb-16">
          <h2 className="font-montserrat font-bold text-3xl text-foreground mb-8 text-center">
            💸 How Much Does It Cost?
          </h2>
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8 text-center">
              <p className="font-roboto text-muted-foreground mb-6">
                We've made it affordable for anyone to start:
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-roboto text-foreground">Monthly Plan:</span>
                  <span className="font-montserrat font-semibold text-primary">$5 / month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-roboto text-foreground">Annual Plan:</span>
                  <span className="font-montserrat font-semibold text-primary">Save 20%</span>
                </div>
              </div>
              <p className="font-roboto text-muted-foreground text-sm mb-6">
                You can cancel anytime. No hidden fees. And you'll always get full access as long as you're subscribed.
              </p>
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
                onClick={() => navigate('/pricing')}
              >
                View Pricing Plans
              </Button>
            </CardContent>
          </Card>
        </section>
        */}

        {/* CTA Section */}
        <section className="text-center">
          <h2 className="font-montserrat font-bold text-3xl text-foreground mb-6">
            🔧 Still Have Questions?
          </h2>
          <p className="font-roboto text-muted-foreground mb-8">
            Check out our FAQ or reach out to our team at support@ogonjo.com.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="outline" 
              size="lg" 
              className="font-roboto"
              onClick={() => navigate('/faq')}
            >
              Visit FAQ
            </Button>
            {/* Removed Subscribe Now button */}
            {/*
            <Button 
              size="lg" 
              className="bg-accent hover:bg-accent/90 text-accent-foreground font-roboto"
              onClick={() => navigate('/pricing')}
            >
              👉 Subscribe Now & Unlock Today's Business Idea
            </Button>
            */}
          </div>
        </section>
      </main>

      
    </div>
  );
};

export default LearnMore;