import { GetServerSideProps } from 'next';
import getSupabaseAdmin from '../../lib/supabaseAdmin';

type Props = {};

export default function RedirectPage(_: Props) {
  // This page always redirects on the server; component won't be shown.
  return null;
}

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  const code = Array.isArray(params?.code) ? params?.code[0] : params?.code;
  if (!code) {
    return { notFound: true };
  }
  // Create Supabase admin client when envs are available
  const supabaseAdmin = getSupabaseAdmin();

  let qrId = null;
  if (supabaseAdmin) {
    // Find QR record
    const { data: qrRows, error: qrError } = await supabaseAdmin
      .from('qr_codes')
      .select('*')
      .eq('code', code)
      .limit(1);

    if (qrError) {
      console.error('QR lookup error', qrError);
    }

    if (qrRows && qrRows.length > 0) qrId = qrRows[0].id;
  }

  const userAgent = req.headers['user-agent'] || null;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null;
  const referrer = req.headers['referer'] || req.headers['referrer'] || null;

  let scanId: string | null = null;
  try {
    if (supabaseAdmin) {
      const insert = await supabaseAdmin
        .from('scans')
        .insert({ qr_id: qrId, user_agent: userAgent, ip_address: ip, referrer: referrer })
        .select('id')
        .limit(1);
      if (insert.error) console.error('Scan insert error', insert.error);
      if (insert.data && insert.data.length > 0) scanId = insert.data[0].id;
    }
  } catch (e) {
    console.error('Failed to log scan', e);
  }

  // Redirect to the public travelogue landing (include code and scan id as query params)
  const queryParams = new URLSearchParams();
  queryParams.set('qr', String(code));
  if (scanId) queryParams.set('scan', String(scanId));

  return {
    redirect: {
      destination: '/?' + queryParams.toString(),
      permanent: false,
    },
  };
};
