import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../lib/i18n';
import { verifyAdmin } from '../../lib/auth';
import { getPublishedDestinations, type Destination } from '../../lib/destinations';
import { getAvailableCategoryNames, type DestinationCategoryData, extractDestinationCategory } from '../../lib/destinationCategoryUtils';

type FeaturedCategoryConfig = {
  category_name: string;
  display_name: string;
};

type CategoryItemWithSelection = {
  name: string;
  description?: string;
  image?: string;
  destination_name: string;
  destination_slug: string;
  selected?: boolean;
};

type Props = {
  availableCategories: string[];
  initialFeaturedCategories: FeaturedCategoryConfig[];
  allDestinations: Destination[];
};

export default function FeaturedCategoriesAdmin({ availableCategories, initialFeaturedCategories, allDestinations }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategoryConfig[]>(initialFeaturedCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryItemsMap, setCategoryItemsMap] = useState<Map<string, CategoryItemWithSelection[]>>(new Map());

  // Build map of category items on load
  useEffect(() => {
    const itemsMap = new Map<string, CategoryItemWithSelection[]>();
    
    for (const category of featuredCategories) {
      const categoryData = extractDestinationCategory(allDestinations, category.category_name, category.display_name);
      itemsMap.set(category.category_name, categoryData.items as CategoryItemWithSelection[]);
    }
    
    setCategoryItemsMap(itemsMap);
  }, [featuredCategories, allDestinations]);

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !newDisplayName.trim()) {
      setStatus('Please fill in both fields');
      return;
    }

    if (featuredCategories.some((cat) => cat.category_name === newCategoryName)) {
      setStatus('This category is already added');
      return;
    }

    if (featuredCategories.length >= 5) {
      setStatus('Maximum 5 categories allowed');
      return;
    }

    setFeaturedCategories([...featuredCategories, { category_name: newCategoryName, display_name: newDisplayName }]);
    setNewCategoryName('');
    setNewDisplayName('');
    setStatus('');
  };

  const handleRemoveCategory = (categoryName: string) => {
    setFeaturedCategories(featuredCategories.filter((cat) => cat.category_name !== categoryName));
  };

  const handleDisplayNameChange = (categoryName: string, newDisplayName: string) => {
    setFeaturedCategories(
      featuredCategories.map((cat) => (cat.category_name === categoryName ? { ...cat, display_name: newDisplayName } : cat))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus('');

    try {
      const response = await fetch('/api/admin/site-branding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured_categories: featuredCategories }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save featured categories');
      }

      setStatus('Featured categories saved successfully!');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : 'Failed to save featured categories');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryItems = (categoryName: string) => {
    return categoryItemsMap.get(categoryName) || [];
  };

  return (
    <main className="admin-page">
      <div className="admin-header">
        <h1>Featured Categories</h1>
        <div className="admin-nav">
          <Link href="/admin/destinations">Manage Destinations</Link>
          <Link href="/admin/activity">Activity</Link>
          <Link href="/admin/feedback">Tourist Feedback</Link>
          <Link href="/admin/contacts">Contacts</Link>
          <Link href="/admin">Dashboard</Link>
          <button type="button" onClick={() => router.push('/admin/login')}>{t('logout')}</button>
        </div>
      </div>

      <div className="admin-content" style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Configure which destination categories appear in the "Discover Destination Experiences" section on the homepage.
            You can feature up to 5 categories.
          </p>

          <div style={{ backgroundColor: '#f3f4f6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Available Categories:</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {availableCategories.length > 0 ? (
                availableCategories.map((cat) => (
                  <div key={cat} style={{ padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    {cat.replace(/_/g, ' ')}
                  </div>
                ))
              ) : (
                <p style={{ color: '#999' }}>No categories found. Add items to destination records first.</p>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Add Featured Category</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Category Name:</label>
                <select
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">-- Select a category --</option>
                  {availableCategories
                    .filter((cat) => !featuredCategories.some((fc) => fc.category_name === cat))
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace(/_/g, ' ')}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Display Name (what users see):</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder="e.g., Local Foods to Try, Must-Do Activities"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCategoryName || !newDisplayName}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity: !newCategoryName || !newDisplayName ? 0.5 : 1,
                }}
              >
                Add Category
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Featured Categories ({featuredCategories.length}/5)</h3>

            {featuredCategories.length === 0 ? (
              <p style={{ color: '#999' }}>No featured categories selected yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {featuredCategories.map((category) => {
                  const isExpanded = expandedCategory === category.category_name;
                  const items = getCategoryItems(category.category_name);
                  
                  return (
                    <div
                      key={category.category_name}
                      style={{
                        padding: '15px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', marginBottom: '15px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, marginBottom: '5px' }}>Category: {category.category_name.replace(/_/g, ' ')}</div>
                          <div style={{ marginBottom: '8px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>Display Name:</label>
                            <input
                              type="text"
                              value={category.display_name}
                              onChange={(e) => handleDisplayNameChange(category.category_name, e.target.value)}
                              style={{
                                width: '100%',
                                maxWidth: '400px',
                                padding: '6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                boxSizing: 'border-box',
                              }}
                            />
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {items.length} item{items.length !== 1 ? 's' : ''} available
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => setExpandedCategory(isExpanded ? null : category.category_name)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#6366f1',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            {isExpanded ? 'Hide Items' : 'View Items'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(category.category_name)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {isExpanded && items.length > 0 && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '10px' }}>
                            Items in this category:
                          </div>
                          <div style={{ display: 'grid', gap: '10px' }}>
                            {items.map((item, idx) => (
                              <div
                                key={`${category.category_name}-${idx}`}
                                style={{
                                  padding: '10px',
                                  backgroundColor: '#fff',
                                  borderRadius: '4px',
                                  border: '1px solid #f0f0f0',
                                  display: 'grid',
                                  gridTemplateColumns: item.image ? '80px 1fr' : '1fr',
                                  gap: '12px',
                                  alignItems: 'start',
                                }}
                              >
                                {item.image && (
                                  <div
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      backgroundColor: '#f0f0f0',
                                      backgroundImage: `url(${item.image})`,
                                      backgroundSize: 'cover',
                                      backgroundPosition: 'center',
                                    }}
                                  />
                                )}
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                                    {item.name}
                                  </div>
                                  {item.description && (
                                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '6px', lineHeight: 1.4 }}>
                                      {item.description}
                                    </div>
                                  )}
                                  <div style={{ fontSize: '12px', color: '#999' }}>
                                    From: <strong>{item.destination_name}</strong>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {isExpanded && items.length === 0 && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb', color: '#999', fontSize: '13px' }}>
                          No items found for this category. Make sure destinations have items tagged with this category.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {status && (
            <div
              style={{
                marginTop: '15px',
                padding: '12px',
                borderRadius: '6px',
                backgroundColor: status.includes('error') || status.includes('Failed') ? '#fee2e2' : '#dcfce7',
                color: status.includes('error') || status.includes('Failed') ? '#991b1b' : '#166534',
                border: `1px solid ${status.includes('error') || status.includes('Failed') ? '#fca5a5' : '#86efac'}`,
              }}
            >
              {status}
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '16px',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Featured Categories'}
          </button>
        </div>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  try {
    await verifyAdmin(context.req);

    // Get all destinations to find available categories
    const destinations = await getPublishedDestinations();
    const availableCategories = Array.from(getAvailableCategoryNames(destinations)).sort();

    // Get current featured categories from site branding
    const fs = require('fs');
    const path = require('path');
    const siteBrandingPath = path.join(process.cwd(), 'db', 'site_branding.json');
    let initialFeaturedCategories: FeaturedCategoryConfig[] = [];

    if (fs.existsSync(siteBrandingPath)) {
      const siteBrandingData = JSON.parse(fs.readFileSync(siteBrandingPath, 'utf-8'));
      if (Array.isArray(siteBrandingData.featured_categories)) {
        initialFeaturedCategories = siteBrandingData.featured_categories;
      }
    }

    return {
      props: {
        availableCategories,
        initialFeaturedCategories,
        allDestinations: destinations,
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
