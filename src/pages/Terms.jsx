import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <div>
        <Link to="/" className="text-sm text-primary hover:underline">← Back</Link>
        <h1 className="text-2xl font-bold mt-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mt-1">Last updated: April 15, 2026</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">1. Authorized Use</h2>
        <p className="text-sm text-muted-foreground">Access to ChiroMike is restricted to authorized personnel of Huwe Chiropractic. Unauthorized access is strictly prohibited.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">2. Data Responsibility</h2>
        <p className="text-sm text-muted-foreground">Users are responsible for the accuracy of data entered into the system. All clinical and billing data must comply with applicable healthcare regulations including HIPAA.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">3. Security</h2>
        <p className="text-sm text-muted-foreground">Users must keep their login credentials confidential and immediately report any suspected unauthorized access to the system administrator.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">4. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground">Huwe Chiropractic and ChiroMike are not liable for data loss, billing errors, or other damages resulting from system misuse or third-party outages.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">5. Changes</h2>
        <p className="text-sm text-muted-foreground">These terms may be updated at any time. Continued use of the system constitutes acceptance of the current terms.</p>
      </section>
    </div>
  );
}