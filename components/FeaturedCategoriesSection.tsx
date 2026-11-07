import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DestinationCategoryData } from '../lib/destinationCategoryUtils';

type FeaturedCategoriesProps = {
  categories: DestinationCategoryData[];
  t: (key: string) => string;
};

export default function FeaturedCategoriesSection({ categories, t }: FeaturedCategoriesProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="featured-categories-section" aria-labelledby="featured-categories-title">
      <div className="featured-categories-heading">
        <h2 id="featured-categories-title">Discover Destination Experiences</h2>
      </div>
      <div className="featured-categories-grid">
        {categories.map((category) => (
          <div key={category.category_name} className="featured-category-item">
            <h3>{category.display_name}</h3>
            <div className="featured-category-cards">
              {category.items.slice(0, 3).map((item, idx) => (
                <Link
                  key={`${category.category_name}-${idx}`}
                  href={`/destination/${item.destination_slug}`}
                  className="featured-category-card"
                >
                  {item.image && (
                    <div className="featured-category-card-image">
                      <img
                        src={item.image}
                        alt={item.name}
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith('/hero.svg')) {
                            e.currentTarget.src = '/hero.svg';
                          }
                        }}
                      />
                    </div>
                  )}
                  <div className="featured-category-card-content">
                    <h4>{item.name}</h4>
                    {item.description && <p>{item.description}</p>}
                    <span className="featured-category-destination">{item.destination_name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
