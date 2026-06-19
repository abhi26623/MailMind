export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto p-8 py-12 text-gray-800 dark:text-gray-200">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-lg">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to MailMind. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website (themailmind.online) and use our services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
          <p>
            We collect information that you provide directly to us when you register for an account, such as your email address and profile information retrieved via Google Sign-In.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Use of Google User Data</h2>
          <p>
            MailMind's use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services, as well as to communicate with you about updates and support.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your personal information. However, please note that no method of transmission over the internet or method of electronic storage is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
