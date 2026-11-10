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

type CategoryItem = {
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newItemsCount, setNewItemsCount] = useState('3');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedCategoryItems, setSelectedCategoryItems] = useState<CategoryItem[]>([]);

  // Get items for selected category
  useEffect(() => {
    if (!selectedCategory) {
      setSelectedCategoryItems([]);
      return;
    }

    const categoryData = extractDestinationCategory(allDestinations, selectedCategory, 'temp');
    setSelectedCategoryItems(categoryData.items);
  }, [selectedCategory, allDestinations]);

  const handleAddCategory = () => {
    if (!selectedCategory.trim() || !newDisplayName.trim()) {
      setStatus('Please select a category and enter a display name');
      return;
    }

    if (featuredCategories.some((cat) => cat.category_name === selectedCategory)) {
      setStatus('This category is already featured');
      return;
    }

    if (featuredCategories.length >= 5) {
      setStatus('Maximum 5 categories allowed');
      return;
    }

    const itemsCount = Math.max(1, Math.min(parseInt(newItemsCount) || 3, 10));
    setFeaturedCategories([...featuredCategories, { category_name: selectedCategory, display_name: newDisplayName, items_count: itemsCount }]);
    
    // Reset form
    setSelectedCategory('');
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

      setStatus('✅ Featured categories saved successfully! They will appear on the homepage now.');
      setTimeout(() => setStatus(''), 5000);
    } catch (error) {
      console.error(error);
      setStatus('❌ ' + (error instanceof Error ? error.message : 'Failed to save featured categories'));
    } finally {
      setSaving(false);
    }
  };

  const getCategorySource = (categoryName: string): string => {
    const category = availableCategories.find(cat => cat.category_name === categoryName);
    return category ? category.destination_name : 'Unknown';
  };

  const getItemsForFeaturedCategory = (categoryName: string): CategoryItem[] => {
    const categoryData = extractDestinationCategory(allDestinations, categoryName, 'temp');
    return categoryData.items;
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
          Manage the "Discover Destination Experiences" section on the homepage. Select categories from your destinations, 
          preview items, and customize how many to display.
        </p>

        {/* Add Featured Category Section */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '20px' }}>Add Featured Category</h2>

          {/* Step 1: Select Category */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Step 1: Select a Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="">-- Choose a category --</option>
              {availableCategories
                .filter((cat) => !featuredCategories.some((fc) => fc.category_name === cat.category_name))
                .map((cat) => (
                  <option key={`${cat.destination_name}-${cat.category_name}`} value={cat.category_name}>
                    {cat.category_name} ({cat.destination_name}) - {cat.items_count} item{cat.items_count !== 1 ? 's' : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Step 2: Display Name */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Step 2: What Name Should Users See?
            </label>
            <input
              type="text"
              value={newDisplayName}
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="e.g., Featured Foods, Must-Do Activities"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Step 3: Items to Show */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Step 3: How Many Items to Display?
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={newItemsCount}
              onChange={(e) => setNewItemsCount(e.target.value)}
              style={{ width: '150px', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
            />
            <span style={{ marginLeft: '10px', color: '#666', fontSize: '14px' }}>items (1-10)</span>
          </div>

          {/* Step 4: Preview Items if Category Selected */}
          {selectedCategory && selectedCategoryItems.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ marginBottom: '10px', fontWeight: 600, color: '#1f2937' }}>
                Step 4: Preview All Available Items (first {Math.min(newItemsCount ? parseInt(newItemsCount) : 3, selectedCategoryItems.length)} will show)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                {selectedCategoryItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: `2px solid ${idx < (newItemsCount ? parseInt(newItemsCount) : 3) ? '#4f46e5' : '#e5e7eb'}`,
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#fff',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.image && (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                        />
                        {idx < (newItemsCount ? parseInt(newItemsCount) : 3) && (
                          <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: '#4f46e5',
                            color: '#fff',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}>
                            ✓
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{item.name}</div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px', lineHeight: '1.3' }}>
                          {item.description.substring(0, 60)}...
                        </div>
                      )}
                      <div style={{ fontSize: '11px', color: '#999' }}>{item.destination_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedCategory && selectedCategoryItems.length === 0 && (
            <div style={{ padding: '15px', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', marginBottom: '20px' }}>
              No items found in this category. Add items to this category in Manage Destinations first.
            </div>
          )}

          <button
            type="button"
            onClick={handleAddCategory}
            disabled={!selectedCategory || !newDisplayName || selectedCategoryItems.length === 0}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4f46e5',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '16px',
              opacity: !selectedCategory || !newDisplayName || selectedCategoryItems.length === 0 ? 0.5 : 1,
            }}
          >
            ✓ Add This Category
          </button>
        </div>

        {/* Featured Categories List */}
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginTop: 0 }}>Featured Categories ({featuredCategories.length}/5)</h2>

          {featuredCategories.length === 0 ? (
            <p style={{ color: '#999', marginTop: 0 }}>No featured categories yet. Add one using the form above.</p>
          ) : (
            <div style={{ display: 'grid', gap: '20px' }}>
              {featuredCategories.map((category) => {
                const items = getItemsForFeaturedCategory(category.category_name);
                const displayCount = category.items_count || 3;
                
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
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{category.display_name}</div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        From: <strong>{getCategorySource(category.category_name)}</strong> ({items.length} items)
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>Display Name:</label>
                          <input
                            type="text"
                            value={category.display_name}
                            onChange={(e) => handleDisplayNameChange(category.category_name, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '3px' }}>Items to Show:</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={displayCount}
                            onChange={(e) => handleItemsCountChange(category.category_name, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Show preview of items */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '10px', color: '#374151' }}>
                        Items that will display on homepage ({displayCount} out of {items.length}):
                      </div>
                      {items.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px' }}>
                          {items.slice(0, displayCount).map((item, idx) => (
                            <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#fff' }}>
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  style={{ width: '100%', height: '100px', objectFit: 'cover' }}
                                />
                              )}
                              <div style={{ padding: '8px' }}>
                                <div style={{ fontWeight: 600, fontSize: '12px' }}>{item.name}</div>
                                <div style={{ fontSize: '10px', color: '#999' }}>{item.destination_name}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>No items in this category</p>
                      )}
                    </div>

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
                );
              })}
            </div>
          )}

          {status && (
            <div
              style={{
                marginTop: '20px',
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
            {saving ? '⏳ Saving...' : '💾 Save Featured Categories'}
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
    
    const availableCategoriesMap = new Map<string, AvailableCategory>();
    
    for (const dest of destinations) {
      if (!dest.published) continue;
      
      // Add local_foods category if it exists
      if (dest.local_foods?.length) {
        const key = `${dest.name}-local_foods`;
        if (!availableCategoriesMap.has(key)) {
          availableCategoriesMap.set(key, {
            category_name: 'local_foods',
            destination_name: dest.name,
            destination_slug: dest.slug,
            items_count: dest.local_foods.length,
          });
        }
      }
      
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
