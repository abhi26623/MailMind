export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto p-8 py-12 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-lg">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing or using MailMind (themailmind.online), you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, you may not use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Description of Service</h2>
          <p>
            MailMind provides email management and organization tools. We integrate with Google APIs to access and manage your email data as explicitly authorized by you during the Google Sign-In process.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold mb-3">3. User Conduct</h2>
          <p>
            You agree not to use the service for any unlawful purpose or in any way that could damage, disable, overburden, or impair our servers or networks. You are responsible for maintaining the confidentiality of your account information.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Intellectual Property</h2>
          <p>
            The content, organization, graphics, design, compilation, and other matters related to our Site are protected under applicable copyrights, trademarks, and other proprietary rights.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Disclaimer of Warranties</h2>
          <p>
            Our services are provided "as is" and "as available" without any warranty of any kind, whether express or implied. MailMind does not guarantee that the service will be uninterrupted or error-free.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Contact Information</h2>
          <p>
            If you have any questions about these Terms, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
