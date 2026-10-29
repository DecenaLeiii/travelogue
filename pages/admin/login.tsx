import { useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { useTranslation } from '../../lib/i18n';
import { clearAdminSessionCookie } from '../../lib/auth';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin');
    } else {
      const j = await res.json();
      setError(j?.error || t('saveFailed'));
    }
  };

  const { t } = useTranslation();
  return (
    <main className="admin-page admin-login-wrap">
      <div className="admin-login-card">
        <aside className="admin-login-brand" aria-label="Branding panel">
          <div className="admin-brand-badge">Admin Portal</div>
          <img src="/dot logo no background.png" alt="Department of Tourism logo" className="admin-brand-logo" onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
          <h1>{t('adminLoginHeading')}</h1>
          <p>{t('adminLoginDescription')}</p>
          <ul className="admin-brand-points">
            <li>Live destination insights</li>
            <li>Authenticated updates</li>
            <li>Secure operations</li>
          </ul>
        </aside>

        <section className="admin-login-panel">
          <div className="admin-login-header">
            <span className="admin-login-kicker">Welcome back</span>
            <h2>Sign in</h2>
          </div>

          <form onSubmit={submit} className="admin-form">
            <label>
              <span>{t('emailLabel')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </label>
            <label>
              <span>{t('passwordLabel')}</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>

            <button type="submit" className="admin-login-submit" disabled={loading}>
              <span>{loading ? t('signingIn') : t('login')}</span>
            </button>

            {error && <p className="admin-error" aria-live="polite">{error}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  clearAdminSessionCookie(res);
  return { props: {} };
};
