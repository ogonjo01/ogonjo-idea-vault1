import React, { useState } from 'react';
import { Mail, MessageSquare } from 'lucide-react';

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
const useToast = () => {
  const toast = ({ title, description }) => {
    // Implement a simple toast-like message box
    const messageBox = document.createElement('div');
    messageBox.textContent = `${title}: ${description}`;
    messageBox.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background-color: #333;
      color: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 1000;
      font-family: 'Roboto', sans-serif;
      font-size: 1rem;
    `;
    document.body.appendChild(messageBox);
    setTimeout(() => messageBox.remove(), 3000);
  };
  return { toast };
};

const Card = ({ children }) => <div className="card">{children}</div>;
const CardHeader = ({ children }) => <div className="card-header">{children}</div>;
const CardTitle = ({ children }) => <h2 className="card-title">{children}</h2>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;
const Label = ({ children, htmlFor }) => <label className="form-label" htmlFor={htmlFor}>{children}</label>;
const Input = (props) => <input className="form-input" {...props} />;
const Textarea = (props) => <textarea className="form-textarea" {...props} />;
const Button = (props) => <button className="form-button" {...props} />;

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    toast({
      title: "Message sent!",
      description: "Thank you for contacting us. We'll get back to you within 24 hours.",
    });
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

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
          
          .contact-page-container {
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

          .grid-container {
            display: grid;
            grid-template-columns: 1fr;
            gap: 3rem;
            max-width: 72rem;
            margin: 0 auto;
          }

          @media (min-width: 1024px) {
            .grid-container {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          .card {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          
          .card-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .card-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            font-size: 1.25rem;
            color: #2d3748;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .card-content {
            padding: 1.5rem;
          }

          .form-space-y-6 > * + * {
            margin-top: 1.5rem;
          }

          .form-label {
            font-family: 'Roboto', sans-serif;
            display: block;
            font-weight: 500;
            color: #4a5568;
            margin-bottom: 0.5rem;
          }
          
          .form-input, .form-textarea {
            display: block;
            width: 100%;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            border: 1px solid #cbd5e0;
            font-family: 'Roboto', sans-serif;
            font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
          }
          
          .form-input:focus, .form-textarea:focus {
            outline: none;
            border-color: #4299e1;
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
          }

          .form-textarea {
            min-height: 8rem;
          }
          
          .form-button {
            width: 100%;
            padding: 0.75rem;
            background-color: #2d3748;
            color: #ffffff;
            font-family: 'Roboto', sans-serif;
            font-weight: 500;
            border-radius: 8px;
            cursor: pointer;
            transition: background-color 0.2s;
            border: none;
          }
          
          .form-button:hover {
            background-color: #4a5568;
          }

          .direct-contact-space {
            margin-top: 2rem;
          }

          .contact-item-title {
            font-family: 'Roboto', sans-serif;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 0.5rem;
          }

          .contact-item-text {
            font-family: 'Roboto', sans-serif;
            color: #718096;
          }

          .footer {
            background-color: #2d3748;
            color: #e2e8f0;
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.875rem;
          }
        `}
      </style>
      <div className="contact-page-container">
        <Header />
        <main className="main-content">
          <div className="hero-section">
            <h1 className="page-title">Contact Us</h1>
            <p className="page-subtitle">
              We're here to help! If you have any questions or feedback about our platform, 
              just drop us a message using the form below or send us an email. Our friendly 
              support team typically responds within 24 hours.
            </p>
          </div>

          <div className="grid-container">
            <Card>
              <CardHeader>
                <CardTitle>
                  <MessageSquare className="h-5 w-5" />
                  Send us a message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="form-space-y-6">
                  <div>
                    <Label htmlFor="name">Your Full Name</Label>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Enter your full name" />
                  </div>
                  <div>
                    <Label htmlFor="email">Your Email Address</Label>
                    <Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required placeholder="Enter your email" />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject of Your Message</Label>
                    <Input id="subject" name="subject" value={formData.subject} onChange={handleInputChange} required placeholder="What is this about?" />
                  </div>
                  <div>
                    <Label htmlFor="message">How can we assist you?</Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleInputChange} required rows={5} placeholder="Tell us how we can help..." />
                  </div>
                  <Button type="submit">Submit Message</Button>
                </form>
              </CardContent>
            </Card>

            <div className="direct-contact-space">
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Mail className="h-5 w-5" />
                    Direct Contact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="form-space-y-6">
                    <div>
                      <h3 className="contact-item-title">Email Support</h3>
                      <p className="contact-item-text">ogonjo.info@gmail.com</p>
                    </div>
                    <div>
                      <h3 className="contact-item-title">General Inquiries</h3>
                      <p className="contact-item-text">ogonjo.info@gmail.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card style={{ marginTop: '2rem' }}>
                <CardContent>
                  <h3 className="contact-item-title">Response Time</h3>
                  <p className="contact-item-text">
                    We strive to respond to all inquiries within one business day. 
                    For urgent matters, please include "URGENT" in your subject line.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Contact;
