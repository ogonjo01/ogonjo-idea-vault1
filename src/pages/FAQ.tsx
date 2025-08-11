import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ = () => {
  const faqs = [
    {
      question: "How do I get started?",
      answer: "Create a free account to explore our platform and start discovering business ideas. Simply sign up with your email, and you’ll gain access to browse, search, and interact with content right away."
    },
    {
      question: "Can I download presentations?",
      answer: "Currently, downloads are not available, but you can view and interact with ideas directly on the platform. Stay tuned for future updates as we expand our features!"
    },
    {
      question: "How often is new content added?",
      answer: "We add fresh business ideas daily. Every weekday, new ideas are uploaded, so you’ll always find the latest strategies and concepts. Check the 'New This Week' section or use the search/filter tools to discover recent content."
    },
    {
      question: "Can I share or save ideas?",
      answer: "Yes! You can like, save, and share ideas with others using the built-in tools. Saved ideas are stored in your account for easy access, and sharing options are available on each idea page."
    },
    {
      question: "What if I have more questions?",
      answer: "We’re here to help! Visit the Contact Us page to send us a message, or email our support team at support@ogonjo.com. We aim to respond to all inquiries within one business day."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header placeholder */}
      {/* <Header /> */}

      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="font-roboto text-xl text-gray-600 max-w-2xl mx-auto">
            Get answers to common questions about exploring and using the OGONJO Business Ideas Platform.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto rounded-3xl shadow-lg border border-gray-200">
          <CardContent className="p-8">
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-4">
                  <AccordionTrigger className="font-montserrat font-semibold text-left text-gray-900 hover:text-primary">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-roboto text-gray-600 leading-relaxed pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <div className="text-center mt-16">
          <p className="font-roboto text-gray-600 mb-4">
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

      {/* Footer placeholder */}
      {/* <Footer /> */}
    </div>
  );
};

export default FAQ;