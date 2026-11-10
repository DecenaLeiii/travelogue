import { useEffect, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useTranslation } from '../../lib/i18n';
import { verifyAdmin } from '../../lib/auth';
import { getPublishedDestinations, type Destination } from '../../lib/destinations';
import { extractDestinationCategory } from '../../lib/destinationCategoryUtils';

type FeaturedCategoryConfig = {
  category_name: string;
  display_name: string;
  items_count?: number;
};

type CategoryItemWithSelection = {
  name: string;
  description?: string;
  image?: string;
  destination_name: string;
  destination_slug: string;
};

type AvailableCategory = {
  category_name: string;
  destination_name: string;
  destination_slug: string;
  items_count: number;
};

type Props = {
  availableCategories: AvailableCategory[];
  initialFeaturedCategories: FeaturedCategoryConfig[];
  allDestinations: Destination[];
};

export default function FeaturedCategoriesAdmin({ availableCategories, initialFeaturedCategories, allDestinations }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [featuredCategories, setFeaturedCategories] = useState<FeaturedCategoryConfig[]>(initialFeaturedCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newItemsCount, setNewItemsCount] = useState('3');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryItemsMap, setCategoryItemsMap] = useState<Map<string, CategoryItemWithSelection[]>>(new Map());

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
      setStatus('This category is already featured');
      return;
    }

    if (featuredCategories.length >= 5) {
      setStatus('Maximum 5 categories allowed');
      return;
    }

    const itemsCount = Math.max(1, Math.min(parseInt(newItemsCount) || 3, 10));
    setFeaturedCategories([...featuredCategories, { category_name: newCategoryName, display_name: newDisplayName, items_count: itemsCount }]);
    setNewCategoryName('');
    setNewDisplayName('');
    setNewItemsCount('3');
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

  const handleItemsCountChange = (categoryName: string, newCount: string) => {
    const count = Math.max(1, Math.min(parseInt(newCount) || 3, 10));
    setFeaturedCategories(
      featuredCategories.map((cat) => (cat.category_name === categoryName ? { ...cat, items_count: count } : cat))
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

  const getCategorySourceDestination = (categoryName: string): string => {
    const category = availableCategories.find(cat => cat.category_name === categoryName);
    return category ? category.destination_name : 'Unknown';
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

      <div className="admin-content" style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Manage the "Discover Destination Experiences" section on the homepage. First, add destination categories 
            in <Link href="/admin/destinations" style={{ color: '#4f46e5' }}>Manage Destinations</Link>. 
            Then select which categories to feature here.
          </p>

          {/* Available Categories by Destination */}
          <div style={{ backgroundColor: '#f3f4f6', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Available Categories (per Destination)</h3>
            {availableCategories.length > 0 ? (
              <div style={{ display: 'grid', gap: '15px' }}>
                {Array.from(
                  availableCategories.reduce((map, cat) => {
                    if (!map.has(cat.destination_name)) {
                      map.set(cat.destination_name, []);
                    }
                    map.get(cat.destination_name)!.push(cat);
                    return map;
                  }, new Map<string, AvailableCategory[]>())
                ).map(([destination, categories]) => (
                  <div key={destination} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>{destination}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {categories.map((cat) => (
                        <div
                          key={`${cat.destination_name}-${cat.category_name}`}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: '#f9fafb',
                            borderRadius: '4px',
                            border: '1px solid #e5e7eb',
                            fontSize: '13px',
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{cat.category_name}</div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                            {cat.items_count} item{cat.items_count !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#999', margin: 0 }}>
                No categories found. Add categories to destinations in Manage Destinations first.
              </p>
            )}
          </div>

          {/* Add Featured Category */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Add Featured Category</h3>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Select Category:</label>
                <select
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                >
                  <option value="">-- Select a category --</option>
                  {availableCategories
                    .filter((cat) => !featuredCategories.some((fc) => fc.category_name === cat.category_name))
                    .map((cat) => (
                      <option key={`${cat.destination_name}-${cat.category_name}`} value={cat.category_name}>
                        {cat.category_name} ({cat.destination_name}) - {cat.items_count} item{cat.items_count !== 1 ? 's' : ''}
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
                  placeholder="e.g., Featured Foods, Must-Do Activities"
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Items to Show on Homepage:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newItemsCount}
                  onChange={(e) => setNewItemsCount(e.target.value)}
                  style={{ width: '100px', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>Default: 3 items</div>
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

          {/* Featured Categories */}
          <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Featured Categories ({featuredCategories.length}/5)</h3>

            {featuredCategories.length === 0 ? (
              <p style={{ color: '#999' }}>No featured categories selected yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {featuredCategories.map((category) => {
                  const isExpanded = expandedCategory === category.category_name;
                  const items = getCategoryItems(category.category_name);
                  const sourceDestination = getCategorySourceDestination(category.category_name);
                  
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
                          <div style={{ fontWeight: 600, marginBottom: '5px' }}>
                            Category: {category.category_name}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>
                            From: <span style={{ fontWeight: 500 }}>{sourceDestination}</span>
                          </div>
                          <div style={{ marginBottom: '10px' }}>
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
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>Items to Show:</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={category.items_count || 3}
                              onChange={(e) => handleItemsCountChange(category.category_name, e.target.value)}
                              style={{
                                width: '80px',
                                padding: '6px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
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
                              padding: '6px 12px',
                              backgroundColor: isExpanded ? '#3b82f6' : '#e5e7eb',
                              color: isExpanded ? '#fff' : '#374151',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {isExpanded ? 'Hide' : 'Preview'} Items
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCategory(category.category_name)}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Expanded Category Items */}
                      {isExpanded && (
                        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>
                            All Available Items:
                          </div>
                          {items.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                              {items.map((item, idx) => (
                                <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
                                  {item.image && (
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                                    />
                                  )}
                                  <div style={{ padding: '10px' }}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{item.name}</div>
                                    {item.description && (
                                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', lineHeight: '1.3' }}>
                                        {item.description.substring(0, 80)}...
                                      </div>
                                    )}
                                    <div style={{ fontSize: '11px', color: '#999' }}>{item.destination_name}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>No items found in this category.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

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
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  try {
    await verifyAdmin(context.req);

    // Get all published destinations
    const destinations = await getPublishedDestinations();
    
    // Build availableCategories with destination context
    const availableCategoriesMap = new Map<string, AvailableCategory>();
    
    for (const dest of destinations) {
      if (!dest.published) continue;
      
      // Add destination categories
      if (dest.destination_categories?.length) {
        for (const cat of dest.destination_categories) {
          const key = `${dest.name}-${cat.title}`;
          if (!availableCategoriesMap.has(key)) {
            availableCategoriesMap.set(key, {
              category_name: cat.title?.toLowerCase().replace(/\s+/g, '_') || cat.title || '',
              destination_name: dest.name,
              destination_slug: dest.slug,
              items_count: cat.items?.length || 0,
            });
          }
        }
      }
    }
    
    const availableCategories = Array.from(availableCategoriesMap.values());

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
