//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-6">
            Privacy Policy
          </h1>
          <p className="font-roboto text-lg text-muted-foreground">
            Last updated: January 2025
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-8">
            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Information We Collect
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We collect information you provide when you sign up or use the platform. This includes 
                your name, email address, and payment details (processed securely by Stripe). We also 
                gather usage data such as pages viewed, search queries, and interactions within the platform, 
                along with device information and IP addresses.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                How We Use Your Data
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed mb-4">
                Your information helps us operate and improve the Service. We use it to:
              </p>
              <ul className="font-roboto text-muted-foreground leading-relaxed list-disc list-inside space-y-2 mb-4">
                <li>Create and manage your user account.</li>
                <li>Process subscription payments and handle billing.</li>
                <li>Provide customer support and respond to inquiries.</li>
                <li>Personalize your experience (e.g., content recommendations).</li>
                <li>Analyze usage to improve features and performance.</li>
              </ul>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We will never sell your personal data. We may use anonymized data for research or analytics.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Data Protection
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We prioritize your privacy and employ security measures to protect your information. 
                Your data is transmitted over secure, encrypted connections. Payment information is handled 
                through Stripe, a trusted third-party processor, so we do not store your credit card details 
                on our servers. We restrict access to your personal data to authorized personnel only. 
                Despite these efforts, no method of transmission over the internet is 100% secure, so we 
                cannot guarantee absolute security.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Third-Party Services
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We use third-party services to enhance our platform. For example, Stripe processes payments 
                and collects minimal information needed to complete transactions. We also use analytics tools 
                to understand platform usage. These providers have their own privacy policies; we encourage 
                you to review them. We share your data with third parties only as necessary to provide the 
                Service (for example, sharing your email and payment details with Stripe for billing).
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Cookies and Tracking
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We use cookies and similar technologies to keep you logged in, save your preferences, 
                and track site usage. Cookies allow us to improve functionality and personalize content. 
                You can configure your browser to reject cookies, but disabling them may affect your experience. 
                We do not use cookies for advertising or sell cookie data to advertisers.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Your Privacy Rights
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you have specific rights regarding your personal data:
              </p>
              <ul className="font-roboto text-muted-foreground leading-relaxed list-disc list-inside space-y-2 mb-4">
                <li>Under the GDPR (for EU residents), you can access, correct, or delete your data, and you can object to or restrict processing.</li>
                <li>Under the CCPA (for California residents), you can request disclosure of your data, deletion of your data, and opt-out of the sale of your personal information.</li>
              </ul>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                To exercise these rights or for any privacy concerns, please contact us at privacy@ogonjo.com. 
                We will respond to requests in accordance with applicable law.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

     
    </div>
  );
};

export default Privacy;