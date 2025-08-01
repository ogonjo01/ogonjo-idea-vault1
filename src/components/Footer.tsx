import { Link } from 'react-router-dom';
import { useState } from 'react';

const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

 const handleSubscribe = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateEmail(email)) {
    setMessage('Please enter a valid email address.');
    return;
  }

  setIsLoading(true);
  setMessage('');

  try {
    const response = await fetch('http://localhost:3000/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, resubscribe: true }),
    });

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      // Safely extract error message from response data
      const errorMessage =
        typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
          ? data.message
          : JSON.stringify(data.error || data.message) || 'Subscription failed';

      throw new Error(errorMessage);
    }

    setMessage('Thank you for subscribing! Please check your email.');
  } catch (error: any) {
    if (error instanceof Error) {
      console.error('Subscribe error:', error.message);
      setMessage(`Failed to subscribe: ${error.message}`);
    } else {
      console.error('Subscribe error:', JSON.stringify(error));
      setMessage('Failed to subscribe. Please try again later.');
    }
  } finally {
    setIsLoading(false);
    setEmail('');
    setTimeout(() => setMessage(''), 5000);
  }
};


  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Links */}
          <div>
            <h3 className="font-montserrat font-semibold text-foreground mb-4">About Us</h3>
            <div className="space-y-2">
              <Link
                to="/terms"
                className="block font-roboto text-sm text-muted-foreground hover:text-primary transition-colors"
                aria-label="Terms of Service"
              >
                Terms of Service
              </Link>
              <Link
                to="/privacy"
                className="block font-roboto text-sm text-muted-foreground hover:text-primary transition-colors"
                aria-label="Privacy Policy"
              >
                Privacy Policy
              </Link>
              <Link
                to="/faq"
                className="block font-roboto text-sm text-muted-foreground hover:text-primary transition-colors"
                aria-label="FAQ"
              >
                FAQ
              </Link>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-montserrat font-semibold text-foreground mb-4">Contact</h3>
            <p className="font-roboto text-sm text-muted-foreground">Email: ogonjo.info@gmail.com</p>
            <p className="font-roboto text-sm text-muted-foreground">Phone: +250 791 956 253</p>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h3 className="font-montserrat font-semibold text-foreground mb-4">Subscribe</h3>
            <form onSubmit={handleSubscribe} className="space-y-2" noValidate>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                  isError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-primary'
                } disabled:bg-gray-100`}
                aria-label="Email address"
                aria-invalid={isError}
                aria-describedby="subscription-message"
                disabled={isLoading}
                required
              />
              <button
                type="submit"
                className="w-full bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Subscribing...' : 'Subscribe'}
              </button>
              {message && (
                <p
                  id="subscription-message"
                  className={`text-sm text-center mt-1 ${
                    isError ? 'text-red-600' : 'text-green-600'
                  }`}
                  role={isError ? 'alert' : undefined}
                >
                  {message}
                </p>
              )}
            </form>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="font-montserrat font-semibold text-foreground mb-4">Connect</h3>
            <div className="flex space-x-4">
              <a
                href="https://x.com/ogonjo_"
                aria-label="Twitter"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://linkedin.com/in/ogonjo-info-9851b736b"
                aria-label="LinkedIn"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61577435602195"
                aria-label="Facebook"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="font-roboto text-sm text-muted-foreground">
            © {new Date().getFullYear()} OGONJO. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
