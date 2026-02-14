import { Link } from 'react-router-dom'
import { useImage } from '../../context/ImageContext'

export default function PrivacyPage() {
  const { appName } = useImage()

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-medium mb-8"
        >
          ← Back to {appName}
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 prose prose-invert prose-amber max-w-none">
          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">1. Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              This Privacy Policy describes how {appName} (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;) collects, uses,
              and protects your information when you use our website and services. By using the Service, you consent
              to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">2. Information We Collect</h2>
            <p className="text-gray-300 leading-relaxed mb-3">We may collect:</p>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li><strong>Account data:</strong> email address, password (hashed), and profile information you provide when registering or signing in with Google</li>
              <li><strong>Usage data:</strong> how you use the Service (e.g. saved titles, preferences, watch history if applicable)</li>
              <li><strong>Technical data:</strong> IP address, browser type, device information, and log data necessary for operation and security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">3. How We Use Your Information</h2>
            <p className="text-gray-300 leading-relaxed">
              We use your information to provide, maintain, and improve the Service; to authenticate you and manage
              your account; to send transactional emails (e.g. verification, password reset); to enforce our terms and
              prevent abuse; and to comply with legal obligations. We do not sell your personal information to third
              parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">4. Data Sharing and Third Parties</h2>
            <p className="text-gray-300 leading-relaxed">
              We may use third-party services for hosting, email delivery, authentication (e.g. Google Sign-In), and
              metadata (e.g. movie/TV data). Those providers process data according to their own privacy policies.
              We may disclose your information if required by law or to protect our rights and safety.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">5. Data Retention and Security</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your account and usage data for as long as your account is active or as needed to provide the
              Service and comply with law. We implement reasonable technical and organizational measures to protect
              your data; no system is completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">6. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed">
              Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal
              data, or to object to or restrict certain processing. You can update account details in your profile
              and request account deletion by contacting the administrator. For Google-linked accounts, you can
              also manage permissions in your Google account settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">7. Cookies and Similar Technologies</h2>
            <p className="text-gray-300 leading-relaxed">
              We may use cookies and similar technologies for session management, preferences, and analytics to
              improve the Service. You can control cookies through your browser settings; disabling them may affect
              some features.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">8. Changes and Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy from time to time; we will indicate the last updated date. Continued
              use after changes constitutes acceptance. For privacy-related questions or requests, contact the
              administrator of this {appName} instance.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <Link to="/terms" className="text-amber-400 hover:underline font-medium">
            Terms and Conditions →
          </Link>
        </div>
      </div>
    </div>
  )
}
