import { GetServerSideProps } from 'next';
import { useTranslation } from '../lib/i18n';

type Props = {};

export default function QrInvalidPage() {
  return (
    <main className="dest-detail">
      <div className="dest-detail-inner" style={{ textAlign: 'center', paddingTop: 48 }}>
        <h1>Invalid or Expired QR Code</h1>
        <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '12px auto 24px' }}>
          This QR link is not recognized. Please scan a valid Philippines Travelogue QR code or visit the homepage directly.
        </p>
        <a className="read-more" href="/">Go to Travelogue</a>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
}
