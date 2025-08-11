import { Card, CardContent } from '@/components/ui/card';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header placeholder */}
      {/* <Header /> */}

      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-gray-900 mb-6">
            Terms of Service
          </h1>
          <p className="font-roboto text-lg text-gray-600">
            Last updated: August 11, 2025
          </p>
        </div>

        {/* Table of Contents */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="font-montserrat font-semibold text-xl text-gray-900 mb-4">Table of Contents</h2>
          <ul className="font-roboto text-gray-600 list-disc list-inside space-y-2">
            <li><a href="#introduction" className="hover:text-gray-900 transition-colors">Introduction</a></li>
            <li><a href="#user-responsibilities" className="hover:text-gray-900 transition-colors">User Responsibilities</a></li>
            <li><a href="#content-ownership" className="hover:text-gray-900 transition-colors">Content Ownership</a></li>
            <li><a href="#prohibited-use" className="hover:text-gray-900 transition-colors">Prohibited Use</a></li>
            <li><a href="#account-termination" className="hover:text-gray-900 transition-colors">Account Termination</a></li>
            <li><a href="#disclaimers-liability" className="hover:text-gray-900 transition-colors">Disclaimers and Liability</a></li>
            <li><a href="#affiliate-disclosure" className="hover:text-gray-900 transition-colors">Affiliate Disclosure</a></li>
            <li><a href="#privacy-data" className="hover:text-gray-900 transition-colors">Privacy and Data Usage</a></li>
            <li><a href="#changes-terms" className="hover:text-gray-900 transition-colors">Changes to Terms</a></li>

          </ul>
        </div>

        <Card className="max-w-4xl mx-auto rounded-3xl shadow-lg border border-gray-200">
          <CardContent className="p-8 space-y-8">
            <div id="introduction">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                Introduction
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                Welcome to the OGONJO Business Ideas Platform (the "Service"), a dynamic platform designed to inspire and connect entrepreneurs with innovative business ideas. By accessing or using our website, mobile app, or any related services, you agree to be bound by these Terms of Service. Please read them carefully to understand your rights and obligations.
              </p>
            </div>

            <div id="user-responsibilities">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                1. User Responsibilities
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed mb-4">
                You are responsible for safeguarding your account credentials and all activities conducted under your account. Use the Service in compliance with all applicable local, national, and international laws. You agree not to upload, share, or promote content that is illegal, infringing, defamatory, obscene, or harmful. Additionally, you must not attempt to disrupt, reverse-engineer, or compromise the security features of the Service, including its Supabase backend or interactive components like modals and forms.
              </p>
            </div>

            <div id="content-ownership">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                2. Content Ownership
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                All business ideas, summaries, presentations, and other content uploaded to the platform remain the intellectual property of their original creators. By submitting content, you grant OGONJO Business Ideas Platform a non-exclusive, worldwide, royalty-free license to display, distribute, and promote your work to our users and subscribers. You warrant that you have the necessary rights to share any content and that it does not violate third-party rights. We respect intellectual property and encourage users to report infringement via our contact form.
              </p>
            </div>

            <div id="prohibited-use">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                3. Prohibited Use
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed mb-4">
                The Service must not be used for unlawful or unethical purposes. Prohibited activities include:
              </p>
              <ul className="font-roboto text-gray-600 leading-relaxed list-disc list-inside space-y-2">
                <li>Sharing account credentials or enabling unauthorized access.</li>
                <li>Copying, modifying, or distributing platform content without permission.</li>
                <li>Uploading malware, viruses, or malicious code.</li>
                <li>Attempting to disable, overload, or hack the Service or its infrastructure.</li>
                <li>Harassing users, transmitting spam, or engaging in abusive behavior.</li>
              </ul>
            </div>

            <div id="account-termination">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                4. Account Termination
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We reserve the right to suspend or terminate your account without prior notice if you breach these Terms. Upon termination, your access to the Service will cease, and any uploaded content may be removed. Personal data will be handled according to our Privacy Policy, with deletion possible after a retention period. Termination does not waive any outstanding payment obligations.
              </p>
            </div>

            <div id="disclaimers-liability">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                5. Disclaimers and Liability
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee uninterrupted access, error-free performance, or complete security. Your use of the Service is at your own risk. To the fullest extent permitted by law, OGONJO Business Ideas Platform and its affiliates are not liable for any direct, indirect, or consequential damages, including data loss or lost profits, arising from your use of the Service. Our liability is capped at the amount paid by you in the last 12 months, if applicable.
              </p>
            </div>

            <div id="affiliate-disclosure">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                6. Affiliate Disclosure
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                OGONJO Business Ideas Platform participates in affiliate marketing programs, including links to books, guides, and other resources (e.g., Amazon Associates). These affiliate links may earn us a commission if you purchase through them, at no additional cost to you. We only recommend products or services we believe add value to our users. The inclusion of affiliate links is clearly marked, and commissions help support the platform’s operations. You acknowledge that clicking these links supports our ecosystem, and we encourage transparency in all partnerships.
              </p>
            </div>

            <div id="privacy-data">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                7. Privacy and Data Usage
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We collect and process personal data (e.g., account details, interaction data) to provide and improve the Service, including Supabase-stored data and user-generated content. Our Privacy Policy, accessible on this platform, details how we handle your information, including data retention, sharing with third parties (e.g., payment processors), and your rights to access or delete data. By using the Service, you consent to this data usage, subject to applicable laws.
              </p>
            </div>

            <div id="changes-terms">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                8. Changes to Terms
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We may update these Terms periodically to reflect new features or legal requirements. Updated Terms will be posted here, with significant changes notified via email or in-app alerts. Continued use of the Service after such updates constitutes your acceptance of the revised Terms.
              </p>
            </div>

          
          </CardContent>
        </Card>
      </main>

      {/* Footer placeholder */}
      {/* <Footer /> */}
    </div>
  );
};

export default Terms;