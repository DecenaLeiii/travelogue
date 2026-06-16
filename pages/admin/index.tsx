import getSupabaseAdmin from '../../lib/supabaseAdmin';
import { GetServerSideProps } from 'next';

type Props = {
  scans: any[];
  totals: { scans: number; destinations: number };
};

export default function AdminDashboard({ scans, totals }: Props) {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Admin Dashboard</h1>
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0' }}>Travelogue QR</h3>
          <img src="/qr-travelogue.svg" alt="Travelogue QR" style={{ width: 140, height: 140, border: '1px solid #eee' }} />
        </div>
        <div style={{ fontSize: 13 }}>
          Single QR code that redirects to the travelogue. Use this for printouts and posters.
        </div>
      </div>
      <p>
        <strong>Totals:</strong> Scans: {totals.scans} — Destinations: {totals.destinations}
      </p>

      <div style={{ marginTop: 12 }}>
        <a href="/api/admin/export">Download CSV export</a>
      </div>

      <h2 style={{ marginTop: 18 }}>Recent Scans</h2>
      <div style={{ marginTop: 12 }}>
        <h3>Scans (last 30 days)</h3>
        <DailyChart scans={scans} />
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Time</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>User Agent</th>
            <th style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>Referrer</th>
          </tr>
        </thead>
        <tbody>
          {scans.map((s) => (
            <tr key={s.id}>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{new Date(s.scanned_at).toLocaleString()}</td>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{s.user_agent || 'unknown'}</td>
              <td style={{ padding: 6, borderBottom: '1px solid #eee' }}>{s.referrer || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function DailyChart({ scans }: { scans: any[] }) {
  // compute counts per day for last 30 days
  const days = 30;
  const now = new Date();
  const counts: number[] = [];
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key);
    counts.push(0);
  }

  const idxMap: Record<string, number> = {};
  labels.forEach((l, i) => (idxMap[l] = i));
  scans.forEach((s) => {
    const key = new Date(s.scanned_at).toISOString().slice(0, 10);
    if (key in idxMap) counts[idxMap[key]] += 1;
  });

  const max = Math.max(...counts, 1);

  return (
    <svg viewBox={`0 0 ${labels.length} 100`} width="100%" height={120} preserveAspectRatio="none">
      {counts.map((c, i) => {
        const h = (c / max) * 100;
        return <rect key={i} x={i} y={100 - h} width={0.9} height={h} fill="#0b5fff" />;
      })}
    </svg>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookie = req.headers.cookie || '';
  if (!cookie.includes('admin_token=1')) {
    return { redirect: { destination: '/admin/login', permanent: false } };
  }

  // Fetch recent scans and totals
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { props: { scans: [], totals: { scans: 0, destinations: 0 } } };

  const { data: scansData } = await supabaseAdmin.from('scans').select('*').order('scanned_at', { ascending: false }).limit(50);
  const { data: destData } = await supabaseAdmin.from('destinations').select('id');
  const { data: scanCount } = await supabaseAdmin.from('scans').select('id');

  const totals = { scans: (scansData || []).length, destinations: (destData || []).length };

  return { props: { scans: scansData || [], totals } };
};
