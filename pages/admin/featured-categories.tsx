import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../lib/i18n';
import { verifyAdmin } from '../../lib/auth';
import { getPublishedDestinations, type Destination } from '../../lib/destinations';

type CategoryItem = {
  name: string;
  description?: string;
  image?: string;
};

type DestinationCategory = {
  title: string;
  items: CategoryItem[];
};

type DestinationWithCategories = {
  name: string;
  slug: string;
  destination_categories?: DestinationCategory[];
  local_foods?: CategoryItem[];
};

type FeaturedItemsConfig = {
  [destination_slug: string]: {
    [category_name: string]: string[]; // array of selected item names
  };
};

type Props = {
  allDestinations: DestinationWithCategories[];
  initialFeaturedItems: FeaturedItemsConfig;
};

export default function FeaturedCategoriesAdmin({ allDestinations, initialFeaturedItems }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [selectedDestination, setSelectedDestination] = useState('');
  const [featuredItems, setFeaturedItems] = useState<FeaturedItemsConfig>(initialFeaturedItems);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const currentDestination = selectedDestination 
    ? allDestinations.find(d => d.slug === selectedDestination)
    : null;

  const getSelectedItemsForCategory = (destSlug: string, categoryName: string): string[] => {
    return featuredItems?.[destSlug]?.[categoryName] || [];
  };

  const toggleItemSelection = (destSlug: string, categoryName: string, itemName: string) => {
    setFeaturedItems(prev => {
      const newConfig = { ...prev };
      if (!newConfig[destSlug]) newConfig[destSlug] = {};
      if (!newConfig[destSlug][categoryName]) newConfig[destSlug][categoryName] = [];
      
      const items = newConfig[destSlug][categoryName];
      if (items.includes(itemName)) {
        newConfig[destSlug][categoryName] = items.filter(i => i !== itemName);
      } else {
        newConfig[destSlug][categoryName] = [...items, itemName];
      }
      
      return newConfig;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');

    try {
      const response = await fetch('/api/admin/site-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_items: featuredItems }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save featured items');
      }

      setStatus('✅ Featured items saved successfully! They will appear on the homepage now.');
      setTimeout(() => setStatus(''), 5000);
    } catch (error) {
      console.error(error);
      setStatus('❌ ' + (error instanceof Error ? error.message : 'Failed to save featured items'));
    } finally {
      setSaving(false);
    }
  };

  const getTotalSelectedItems = (): number => {
    let total = 0;
    Object.values(featuredItems).forEach(destCategories => {
      Object.values(destCategories).forEach(items => {
        total += items.length;
      });
    });
    return total;
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>Featured Categories & Experiences</h1>
        <div className="admin-nav">
          <Link href="/admin/destinations">Manage Destinations</Link>
          <Link href="/admin/activity">Activity</Link>
          <Link href="/admin/feedback">Tourist Feedback</Link>
          <Link href="/admin/contacts">Contacts</Link>
          <Link href="/admin">Dashboard</Link>
          <button type="button" onClick={() => router.push('/admin/login')}>{t('logout')}</button>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
        <p style={{ color: '#666', marginBottom: '30px' }}>
          Select a destination and then choose which categories and items to feature on the homepage. 
          You can feature items from multiple categories per destination.
        </p>

        {/* Destination Selection */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Step 1: Select a Destination</h2>
          
          <select
            value={selectedDestination}
            onChange={(e) => setSelectedDestination(e.target.value)}
            style={{ width: '100%', maxWidth: '400px', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px' }}
          >
            <option value="">-- Choose a destination --</option>
            {allDestinations.map((dest) => (
              <option key={dest.slug} value={dest.slug}>
                {dest.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categories Selection */}
        {currentDestination && (
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Step 2: Select Items from {currentDestination.name}</h2>

            {/* Local Foods */}
            {currentDestination.local_foods && currentDestination.local_foods.length > 0 && (
              <div style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>🍽️ Local Foods</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {currentDestination.local_foods.map((item, idx) => {
                    const isSelected = getSelectedItemsForCategory(currentDestination.slug, 'local_foods').includes(item.name);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemSelection(currentDestination.slug, 'local_foods', item.name)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '3px solid #4f46e5' : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: isSelected ? '#eef2ff' : '#fff',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item.image && (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#4f46e5',
                                color: '#fff',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 'bold',
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.name}</div>
                          {item.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.3' }}>
                              {item.description}
                            </div>
                          )}
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: isSelected ? '#4f46e5' : '#f0f0f0',
                            color: isSelected ? '#fff' : '#666',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}>
                            {isSelected ? 'Selected ✓' : 'Click to select'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Destination Categories */}
            {currentDestination.destination_categories && currentDestination.destination_categories.map((category) => (
              <div key={category.title} style={{ marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>📍 {category.title}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                  {category.items.map((item, idx) => {
                    const categoryKey = category.title.toLowerCase().replace(/\s+/g, '_');
                    const isSelected = getSelectedItemsForCategory(currentDestination.slug, categoryKey).includes(item.name);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleItemSelection(currentDestination.slug, categoryKey, item.name)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '3px solid #4f46e5' : '2px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          backgroundColor: isSelected ? '#eef2ff' : '#fff',
                          transition: 'all 0.2s',
                        }}
                      >
                        {item.image && (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }}
                            />
                            {isSelected && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#4f46e5',
                                color: '#fff',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: 'bold',
                              }}>
                                ✓
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.name}</div>
                          {item.description && (
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', lineHeight: '1.3' }}>
                              {item.description}
                            </div>
                          )}
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: isSelected ? '#4f46e5' : '#f0f0f0',
                            color: isSelected ? '#fff' : '#666',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                          }}>
                            {isSelected ? 'Selected ✓' : 'Click to select'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary & Save */}
        <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <p style={{ color: '#666', margin: '0 0 15px 0' }}>
            Total items selected: <strong>{getTotalSelectedItems()}</strong>
          </p>
          
          {getTotalSelectedItems() > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '6px', marginBottom: '15px' }}>
              {Object.entries(featuredItems).map(([destSlug, categories]) => {
                const dest = allDestinations.find(d => d.slug === destSlug);
                if (!dest || Object.values(categories).every(items => items.length === 0)) return null;
                
                return (
                  <div key={destSlug} style={{ marginBottom: '15px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#1f2937' }}>{dest.name}</h4>
                    {Object.entries(categories).map(([categoryName, items]) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={categoryName} style={{ marginLeft: '15px', marginBottom: '8px' }}>
                          <div style={{ fontSize: '13px', color: '#666' }}>
                            <strong>{categoryName}:</strong> {items.join(', ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {status && (
            <div
              style={{
                marginBottom: '15px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: status.includes('❌') ? '#fee2e2' : '#dcfce7',
                color: status.includes('❌') ? '#991b1b' : '#166534',
                border: `1px solid ${status.includes('❌') ? '#fca5a5' : '#86efac'}`,
              }}
            >
              {status}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || getTotalSelectedItems() === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: getTotalSelectedItems() === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '16px',
              opacity: saving || getTotalSelectedItems() === 0 ? 0.7 : 1,
            }}
          >
            {saving ? '⏳ Saving...' : `💾 Save Featured Items (${getTotalSelectedItems()} selected)`}
          </button>
        </div>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  try {
    await verifyAdmin(context.req);

    const destinations = await getPublishedDestinations();
    
    const allDests: DestinationWithCategories[] = destinations.map(dest => ({
      name: dest.name,
      slug: dest.slug,
      destination_categories: dest.destination_categories,
      local_foods: dest.local_foods,
    }));

    const fs = require('fs');
    const path = require('path');
    const siteBrandingPath = path.join(process.cwd(), 'db', 'site_branding.json');
    let initialFeaturedItems: FeaturedItemsConfig = {};

    if (fs.existsSync(siteBrandingPath)) {
      const siteBrandingData = JSON.parse(fs.readFileSync(siteBrandingPath, 'utf-8'));
      if (siteBrandingData.featured_items && typeof siteBrandingData.featured_items === 'object') {
        initialFeaturedItems = siteBrandingData.featured_items;
      }
    }

    return {
      props: {
        allDestinations: allDests,
        initialFeaturedItems,
      },
    };
  } catch (error) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }
};
