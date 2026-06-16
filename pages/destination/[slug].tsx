import { GetServerSideProps } from 'next';
import getSupabaseAdmin from '../../lib/supabaseAdmin';

type Props = {
  destination?: any;
};

export default function DestinationPage({ destination }: Props) {
  if (!destination) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Destination not found</h1>
        <a href="/">Back to list</a>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <a href="/">← Back</a>
      <h1>{destination.name}</h1>
      <p><em>{destination.region}</em></p>
      <p>{destination.short_description}</p>
      <div style={{ marginTop: 12 }} dangerouslySetInnerHTML={{ __html: destination.content }} />
      {destination.images && destination.images.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {destination.images.map((src: string, i: number) => (
            <img key={i} src={src} alt={destination.name} style={{ maxWidth: '100%', marginBottom: 8 }} />
          ))}
        </div>
      )}
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const slug = Array.isArray(params?.slug) ? params?.slug[0] : params?.slug;
  if (!slug) return { notFound: true };

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) return { props: { destination: null } };

  const { data, error } = await supabaseAdmin.from('destinations').select('*').eq('slug', slug).limit(1);
  if (error) {
    console.error('Dest lookup error', error);
    return { props: { destination: null } };
  }

  const dest = data && data.length > 0 ? data[0] : null;
  return { props: { destination: dest } };
};
