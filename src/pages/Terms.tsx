//import Header from '@/components/Header';
//import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      
      
      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-foreground mb-6">
            Terms of Service
          </h1>
          <p className="font-roboto text-lg text-muted-foreground">
            Last updated: January 2025
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardContent className="p-8 space-y-8">
            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                Introduction
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                Welcome to OGONJO Business Ideas Platform (the "Service"). By using our platform, 
                you agree to these Terms of Service. Please read them carefully.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                1. User Responsibilities
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed mb-4">
                You are responsible for maintaining the confidentiality of your account credentials 
                and for any activity under your account. Use our Service in compliance with all 
                applicable laws. You agree not to upload or share any content that is illegal, 
                infringing, defamatory, or harmful. You may not attempt to disrupt or reverse-engineer 
                the Service or its security features.
              </p>
            </div>

            <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                2. Content Ownership
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                All ideas, presentations, and content uploaded to the platform remain the property 
                of the original creators. By submitting content, you grant OGONJO Business Ideas Platform 
                a non-exclusive license to display and distribute your work to our subscribers. You promise 
                that you have the necessary rights to share any content you upload. We respect intellectual 
                property rights; if you believe content infringes on your rights, please contact us immediately.
              </p>
            </div>

            {/* REMOVED: Subscription and Payment section */}
            {/* <div>
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                3. Subscription and Payment
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                Access to the Service is subscription-based. When you subscribe, you authorize us 
                (and our payment processor, e.g., Stripe) to charge your selected payment method on 
                a recurring basis. Subscription fees are billed at the start of each period (monthly, 
                yearly, etc.) and are non-refundable except as required by law. You can cancel anytime 
                through your account dashboard; the cancellation will take effect at the end of your 
                current billing period. We reserve the right to change subscription plans and pricing, 
                with notice posted on the platform or communicated via email.
              </p>
            </div> 
            */}

            <div>
              {/* Renumbered from 4 to 3 */}
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                3. Prohibited Use
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed mb-4">
                You must not use the Service for unlawful or unethical activities. Prohibited behaviors 
                include, but are not limited to:
              </p>
              <ul className="font-roboto text-muted-foreground leading-relaxed list-disc list-inside space-y-2">
                <li>Sharing your account credentials or allowing unauthorized access to the Service.</li>
                <li>Copying, modifying, or distributing content from the Service without permission.</li>
                <li>Uploading viruses, spyware, or any malicious code.</li>
                <li>Attempting to disable, overload, or impair the Service.</li>
                <li>Using the Service to harass or abuse others, or to transmit harmful or unsolicited content.</li>
              </ul>
            </div>

            <div>
              {/* Renumbered from 5 to 4 */}
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                4. Account Termination
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your account without notice if you violate 
                these Terms. Upon termination, your access to the Service will end, and any content you 
                have uploaded may be removed. We may also delete your personal data following our Privacy 
                Policy. Termination does not relieve you of any payment obligations incurred prior to termination.
              </p>
            </div>

            <div>
              {/* Renumbered from 6 to 5 */}
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                5. Disclaimers and Liability
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind. We do 
                not guarantee that the Service will be error-free, uninterrupted, or secure. You use the 
                Service at your own risk. To the maximum extent permitted by law, OGONJO Business Ideas Platform 
                and its affiliates are not liable for any damages arising from your use of the Service, 
                including loss of data or profits. Our liability is limited to the amount you paid in the 
                past 12 months, if any.
              </p>
            </div>

            <div>
              {/* Renumbered from 7 to 6 */}
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                6. Changes to Terms
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. When changes are made, the updated Terms will 
                be posted on the platform, and if significant, we will notify you by email. Continued use 
                of the Service after changes constitutes your acceptance of the new Terms.
              </p>
            </div>

            <div>
              {/* Renumbered from 8 to 7 */}
              <h2 className="font-montserrat font-semibold text-2xl text-foreground mb-4">
                7. Governing Law
              </h2>
              <p className="font-roboto text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the United States. Any disputes will be resolved 
                in the courts of the United States unless otherwise required by law.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      
    </div>
  );
};

export default Terms;