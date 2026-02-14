import { Link } from 'react-router-dom'
import { useImage } from '../../context/ImageContext'

export default function TermsPage() {
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

        <h1 className="text-3xl font-bold text-white mb-2">Terms and Conditions</h1>
        <p className="text-gray-500 text-sm mb-10">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-8 prose prose-invert prose-amber max-w-none">
          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using {appName} (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions.
              If you do not agree, do not use the Service. We may update these terms from time to time; continued use
              after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">2. Use of the Service</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              You may use {appName} to discover, save, and organize information about movies and TV shows, and to access
              streaming or related features as made available. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-gray-300">
              <li>Provide accurate registration information and keep your account secure</li>
              <li>Use the Service only for lawful purposes and in accordance with these terms</li>
              <li>Not attempt to circumvent security, abuse the API, or overload our systems</li>
              <li>Not resell, sublicense, or commercially exploit the Service without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">3. Account and Eligibility</h2>
            <p className="text-gray-300 leading-relaxed">
              You must be at least 13 years of age (or the minimum age in your jurisdiction) to use the Service.
              You are responsible for all activity under your account. Notify us promptly of any unauthorized use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">4. Content and Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed">
              Metadata (titles, images, descriptions) may be sourced from third parties. Streaming and playback may
              be provided by external services. We do not guarantee availability or legality of third-party content
              in your region. Your use of linked or embedded content may be subject to those providers&apos; terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">5. Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service&apos;s design, branding, and original code are owned by us or our licensors. You may not copy,
              modify, or create derivative works without permission. Movie and TV titles, artwork, and related
              materials are the property of their respective rights holders.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">6. Disclaimers</h2>
            <p className="text-gray-300 leading-relaxed">
              The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee uninterrupted access,
              accuracy of metadata, or compatibility with all devices. We are not liable for any indirect, incidental,
              or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">7. Termination</h2>
            <p className="text-gray-300 leading-relaxed">
              We may suspend or terminate your account if you breach these terms or for operational reasons. You may
              stop using the Service at any time. Provisions that by their nature should survive (e.g. disclaimers,
              limitations of liability) will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-amber-400 mb-3">8. Contact</h2>
            <p className="text-gray-300 leading-relaxed">
              For questions about these Terms and Conditions, please contact the administrator of this {appName} instance.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-700">
          <Link to="/privacy" className="text-amber-400 hover:underline font-medium">
            Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  )
}
