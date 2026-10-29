import type { NextPageContext } from 'next';
import { useTranslation } from '../lib/i18n';

type Props = {
  statusCode?: number;
};

export default function ErrorPage({ statusCode }: Props) {
  const { t } = useTranslation();
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
      <h1>{statusCode ? `${t('errorTitle')} ${statusCode}` : t('somethingWentWrong')}</h1>
      <p style={{ color: '#6b7280' }}>
        {statusCode === 404
          ? t('pageNotFound')
          : t('unexpectedError')}
      </p>
      <a href="/" style={{ color: '#111827', fontWeight: 700 }}>{t('backToHome')}</a>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};
