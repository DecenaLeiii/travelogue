import { useEffect, useState } from 'react';
import supabase from '../lib/supabaseClient';
import supabaseAdmin from '../lib/supabaseAdmin';
import { GetServerSideProps } from 'next';

type Destination = {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  images?: string[];
};

export default function Home({ initialDestinations }: { initialDestinations?: Destination[] }) {
  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations || []);

  useEffect(() => {
    if (initialDestinations && initialDestinations.length) {
      setDestinations(initialDestinations as Destination[]);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase.from('destinations').select('id,name,slug,short_description,images').order('featured', { ascending: false }).limit(50);
      if (error) {
        console.error('Failed to load destinations', error);
        return;
      }
      setDestinations(data || []);
    };
    load();
  }, []);

  return (
    <div>
      <header className="site-header">
        <div className="inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/dot-logo.png" alt="DOT logo" style={{ width: 48, height: 48, borderRadius: 6, background: '#fff' }} onError={(e)=>{(e.target as HTMLImageElement).style.display='none'}} />
            <div style={{ fontWeight: 700 }}>Philippines Travelogue</div>
          </div>
          <nav>
            <a href="/">Home</a>
            <a href="#destinations">Tourism</a>
            <a href="#destinations">Destinations</a>
            <a href="/contact">Contact</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <img src="/qr-travelogue.svg" alt="QR" style={{ width: 42, height: 42 }} />
            </div>
          </div>
        </div>
      </header>

      <div className="hero" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.15)), url('/hero.jpg')` }}>
        <div className="overlay">
          <h1>Love the Philippines</h1>
          <p>Explore beaches, mountains, history, and culture across 20 featured destinations.</p>
          <a className="cta" href="#destinations">Learn more</a>
        </div>
      </div>

      <main>
        <div style={{ maxWidth: 1200, margin: '18px auto', padding: '0 16px' }}>
          <h2 id="destinations">Featured Destinations</h2>
          <div>
            <SearchableDestinations initial={destinations} />
          </div>
        </div>
      </main>
    </div>
  );
}

function SearchableDestinations({ initial }: { initial: Destination[] }) {
  const [query, setQuery] = useState('');
  const filtered = initial.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search destinations"
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #eee' }}
        />
      </div>
      <div className="dest-grid">
        {filtered.map((d) => (
          <a key={d.id} className="dest-card" href={`/destination/${d.slug}`}>
            <div style={{ height: 120, background: '#f6f7fb', borderRadius: 6, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d.name}</div>
            <div style={{ fontWeight: 600 }}>{d.name}</div>
            <div className="meta">{d.short_description}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const { data } = await supabaseAdmin.from('destinations').select('id,name,slug,short_description,images').order('featured', { ascending: false }).limit(50);
    return { props: { initialDestinations: data || [] } };
  } catch (err) {
    return { props: { initialDestinations: [] } };
  }
};
