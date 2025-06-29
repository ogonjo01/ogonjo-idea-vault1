import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const faqs = [
    {
      question: "How do I subscribe?",
      answer: "Simply create an account and choose a subscription plan that fits your needs. Enter your payment information securely (we use Stripe) and start exploring ideas immediately. Your subscription renews automatically until you cancel."
    },
    {
      question: "Can I download presentations?",
      answer: "Yes! Subscribers have full download access. When you find an idea you like, click the download button to save the PPT file to your device. This makes it easy to review and customize the content offline."
    },
    {
      question: "How often is new content added?",
      answer: "We add fresh business ideas daily. Every weekday, new presentations are uploaded, so you'll always find the latest strategies and concepts. Check the \"New This Week\" section or use the search/filter tools to discover recent uploads."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. You can cancel your subscription at any time from your account dashboard. Once canceled, you'll continue to have access until the end of your billing cycle. After that, you can still log in as a free member to browse limited content (if applicable), or you can choose to resubscribe whenever you like."
    },
    {
      question: "Is there a refund policy?",
      answer: "We want you to be satisfied with our service. If you encounter any issues, please contact us. Generally, subscriptions are non-refundable after payment, but we'll review each case individually. We do not offer partial refunds for unused days after cancellation; you can continue using the Service until your subscription period ends."
    },
    {
      question: "What if I have more questions?",
      answer: "We're here to help! Visit the Contact Us page to send us a message, or email our support team at support@ogonjo.com. We strive to answer all inquiries within one business day."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-6">
            Frequently Asked Questions
          </h1>
          <p className="font-roboto text-xl text-muted-foreground max-w-2xl mx-auto">
            Find answers to common questions about our platform, subscriptions, and features.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="font-montserrat font-semibold text-left text-foreground hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-roboto text-muted-foreground leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="text-center mt-16">
          <p className="font-roboto text-muted-foreground mb-4">
            Still have questions?
          </p>
          <a 
            href="/contact" 
            className="font-roboto text-primary hover:text-primary/80 transition-colors underline"
          >
            Contact our support team
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;