import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Mock Header component to keep all code in a single file
const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">OGONJO</h1>
    </div>
  </header>
);

// Mock Footer component to keep all code in a single file
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} OGONJO. All rights reserved.</p>
    </div>
  </footer>
);

// Mock components to keep the app self-contained and runnable
const Card = ({ children }) => <div className="card">{children}</div>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;
const Accordion = ({ children }) => <div className="accordion-root">{children}</div>;

const AccordionItem = ({ children, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="accordion-item">
      {React.Children.map(children, child => {
        if (child.type.name === 'AccordionTrigger') {
          return React.cloneElement(child, { onClick: () => setIsOpen(!isOpen), isOpen });
        }
        if (child.type.name === 'AccordionContent' && isOpen) {
          return child;
        }
        return null;
      })}
    </div>
  );
};

const AccordionTrigger = ({ children, onClick, isOpen }) => (
  <button className="accordion-trigger" onClick={onClick}>
    {children}
    <ChevronDown className={`accordion-icon ${isOpen ? 'rotate' : ''}`} />
  </button>
);

const AccordionContent = ({ children }) => (
  <div className="accordion-content">
    {children}
  </div>
);

const FAQ = () => {
  const faqs = [
    {
      question: "What is OGONJO?",
      answer: "OGONJO is a platform offering free, high-quality, text-based summaries of popular books on business, entrepreneurship, and personal development. Our goal is to provide key insights and actionable knowledge without the need for subscriptions or downloads."
    },
    {
      question: "How is OGONJO free?",
      answer: "Our platform is completely free to use. We are able to maintain the service by featuring relevant, non-intrusive affiliate links and sponsored content within our site, which allows us to share knowledge with you at no cost."
    },
    {
      question: "Can I download the book summaries?",
      answer: "Our summaries are designed for quick, convenient reading directly on our website. To maintain the integrity of our content and our business model, we do not offer downloadable versions of our summaries. They are available for free viewing anytime on any device."
    },
    {
      question: "How often are new summaries added?",
      answer: "We are committed to continuously expanding our library. We strive to add new, high-demand book summaries to the platform on a regular basis. Check our homepage for the latest additions."
    },
    {
      question: "What if I have more questions?",
      answer: "We're here to help! If you have any further questions or feedback, please visit our Contact Us page to send us a message. We'll be happy to assist you."
    }
  ];

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Montserrat:wght@600;700&display=swap');

          body {
            margin: 0;
            font-family: 'Roboto', sans-serif;
            background-color: #f0f4f8;
            color: #1a202c;
          }
          
          .faq-page-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: #f0f4f8;
          }
          
          .header {
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            padding: 1rem 0;
          }

          .header-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
          }

          .header-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: #4a5568;
          }

          .main-content {
            flex: 1;
            max-width: 1280px;
            margin: 0 auto;
            padding: 4rem 1rem;
          }
          
          .hero-section {
            text-align: center;
            margin-bottom: 4rem;
          }

          .page-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 2.5rem;
            color: #2d3748;
            margin-bottom: 1.5rem;
          }
          
          .page-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.25rem;
            color: #718096;
            max-width: 48rem;
            margin: 0 auto;
            line-height: 1.6;
          }

          .card {
            max-width: 64rem;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          .card-content {
            padding: 2rem;
          }
          
          .accordion-root {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .accordion-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0.5rem 1rem;
          }

          .accordion-trigger {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            font-size: 1rem;
            color: #2d3748;
            background: none;
            border: none;
            cursor: pointer;
            width: 100%;
            text-align: left;
            padding: 1rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: color 0.2s;
          }
          
          .accordion-trigger:hover {
            color: #4299e1;
          }

          .accordion-icon {
            transition: transform 0.3s;
          }
          
          .accordion-icon.rotate {
            transform: rotate(180deg);
          }

          .accordion-content {
            font-family: 'Roboto', sans-serif;
            color: #718096;
            line-height: 1.6;
            padding-bottom: 1rem;
          }

          .contact-cta-section {
            text-align: center;
            margin-top: 4rem;
          }

          .contact-cta-text {
            font-family: 'Roboto', sans-serif;
            color: #718096;
            margin-bottom: 1rem;
          }
          
          .contact-link {
            font-family: 'Roboto', sans-serif;
            color: #4299e1;
            transition: color 0.2s;
            text-decoration: none;
            border-bottom: 1px solid transparent;
          }
          
          .contact-link:hover {
            color: #2b6cb0;
            border-bottom: 1px solid #2b6cb0;
          }

          .footer {
            background-color: #2d3748;
            color: #e2e8f0;
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.875rem;
          }

          @media (min-width: 768px) {
            .page-title {
              font-size: 3rem;
            }
          }
        `}
      </style>
      <div className="faq-page-container">
        <Header />
        
        <main className="main-content">
          <div className="hero-section">
            <h1 className="page-title">Frequently Asked Questions</h1>
            <p className="page-subtitle">
              Find answers to common questions about our platform and features.
            </p>
          </div>

          <Card>
            <CardContent>
              <Accordion>
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="contact-cta-section">
            <p className="contact-cta-text">
              Still have questions?
            </p>
            <a 
              href="/contact" 
              className="contact-link"
            >
              Contact our support team
            </a>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQ;
