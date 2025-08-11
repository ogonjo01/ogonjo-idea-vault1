import { Card, CardContent } from '@/components/ui/card';

const Privacy = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header placeholder */}
      {/* <Header /> */}

      <main className="flex-1 container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="font-montserrat font-bold text-4xl lg:text-5xl text-gray-900 mb-6">
            Privacy Policy
          </h1>
          <p className="font-roboto text-lg text-gray-600">
            Last updated: August 11, 2025
          </p>
        </div>

        {/* Table of Contents */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="font-montserrat font-semibold text-xl text-gray-900 mb-4">Table of Contents</h2>
          <ul className="font-roboto text-gray-600 list-disc list-inside space-y-2">
            <li><a href="#information-collected" className="hover:text-gray-900 transition-colors">Information We Collect</a></li>
            <li><a href="#data-usage" className="hover:text-gray-900 transition-colors">How We Use Your Data</a></li>
            <li><a href="#data-protection" className="hover:text-gray-900 transition-colors">Data Protection</a></li>
            <li><a href="#third-party-services" className="hover:text-gray-900 transition-colors">Third-Party Services</a></li>
            <li><a href="#cookies-tracking" className="hover:text-gray-900 transition-colors">Cookies and Tracking</a></li>
            <li><a href="#data-retention" className="hover:text-gray-900 transition-colors">Data Retention</a></li>
            <li><a href="#privacy-rights" className="hover:text-gray-900 transition-colors">Your Privacy Rights</a></li>
          </ul>
        </div>

        <Card className="max-w-4xl mx-auto rounded-3xl shadow-lg border border-gray-200">
          <CardContent className="p-8 space-y-8">
            <div id="information-collected">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                1. Information We Collect
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We collect information you provide when you sign up, log in, or interact with the OGONJO Business Ideas Platform, including your name and email address. We also gather usage data such as pages viewed, search queries, interactions with ideas or summaries (e.g., likes, saves), and content uploads. Additionally, we collect device information (e.g., IP address, browser type) to enhance security and personalize your experience.
              </p>
            </div>

            <div id="data-usage">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                2. How We Use Your Data
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed mb-4">
                Your information is used to operate and improve the Service. Specifically, we use it to:
              </p>
              <ul className="font-roboto text-gray-600 leading-relaxed list-disc list-inside space-y-2 mb-4">
                <li>Create and manage your user account, including authentication via Supabase.</li>
                <li>Provide customer support and respond to inquiries or reports (e.g., content disputes).</li>
                <li>Personalize your experience, such as recommending ideas or tailoring modal content.</li>
                <li>Analyze usage patterns to enhance features, performance, and user engagement.</li>
              </ul>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We do not sell your personal data to third parties. Anonymized, aggregated data may be used for research, analytics, or platform improvements.
              </p>
            </div>

            <div id="data-protection">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                3. Data Protection
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We prioritize your privacy with robust security measures. Data is transmitted over encrypted connections (TLS) and stored securely using Supabase, with access restricted to authorized personnel. While we strive to protect your information, no online transmission is entirely secure, and we cannot guarantee absolute protection against breaches. In case of a data incident, we will notify affected users and authorities as required by law.
              </p>
            </div>

            <div id="third-party-services">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                4. Third-Party Services
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We collaborate with third-party services to support the platform. Supabase manages data storage and synchronization, ensuring scalability and security. Analytics tools may track usage to improve functionality. These providers have their own privacy policies; please review them. We share your data with third parties only as necessary (e.g., data backups with Supabase) and under strict confidentiality agreements.
              </p>
            </div>

            <div id="cookies-tracking">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                5. Cookies and Tracking
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We use cookies and similar technologies to maintain your session, save preferences, and monitor site usage. These help personalize content (e.g., recommended ideas) and improve performance. You can manage cookie preferences via your browser settings, though disabling them may limit some features. We do not use cookies for advertising or share tracking data with advertisers.
              </p>
            </div>

            <div id="data-retention">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                6. Data Retention
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed">
                We retain your personal data only as long as necessary to provide the Service, comply with legal obligations, or resolve disputes. Account data (e.g., name, email) is kept while your account is active. Usage data may be retained for up to 24 months for analytics, after which it is anonymized. Upon account deletion or termination, we will delete or anonymize your data within 30 days, except where required by law.
              </p>
            </div>

            <div id="privacy-rights">
              <h2 className="font-montserrat font-semibold text-2xl text-gray-900 mb-4">
                7. Your Privacy Rights
              </h2>
              <p className="font-roboto text-gray-600 leading-relaxed mb-4">
                Depending on your jurisdiction, you have rights over your personal data:
              </p>
              <ul className="font-roboto text-gray-600 leading-relaxed list-disc list-inside space-y-2 mb-4">
                <li>Under the GDPR (EU residents): Access, correct, delete, or restrict processing of your data, and object to certain uses.</li>
                <li>Under the CCPA (California residents): Request disclosure, deletion, or opt-out of data sales.</li>
                <li>Other regions: Contact us to understand local rights.</li>
              </ul>
              <p className="font-roboto text-gray-600 leading-relaxed">
                To exercise these rights or address privacy concerns, email us at privacy@ogonjo.com. We will respond within 30 days, in compliance with applicable laws.
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

export default Privacy;