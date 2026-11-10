import type { Destination } from './destinations';

export type CategoryItem = {
  name: string;
  description?: string;
  image?: string;
};

export type DestinationCategoryData = {
  category_name: string;
  display_name: string;
  items_count?: number;
  items: (CategoryItem & { destination_name: string; destination_slug: string })[];
};

export type FeaturedItemsConfig = {
  [destination_slug: string]: {
    [category_name: string]: string[]; // array of selected item names
  };
};

/**
 * Extract all items from a specific category across all destinations
 * @param destinations - Array of destinations
 * @param categoryName - The category to extract ('local_foods', 'activities', etc.)
 * @param displayName - Display name for this category
 * @returns Combined category data with items from all destinations
 */
export function extractDestinationCategory(
  destinations: Destination[],
  categoryName: 'local_foods' | 'activities' | 'festivals' | 'cultural_experiences' | 'shopping' | string,
  displayName: string,
): DestinationCategoryData {
  const items: DestinationCategoryData['items'] = [];

  for (const dest of destinations) {
    if (!dest.published) continue;

    // Handle local_foods
    if (categoryName === 'local_foods' && dest.local_foods?.length) {
      for (const food of dest.local_foods) {
        items.push({
          name: food.name,
          description: food.description,
          image: food.image,
          destination_name: dest.name,
          destination_slug: dest.slug,
        });
      }
    }

    // Handle destination_categories (Activities, Festivals, etc.)
    if (dest.destination_categories?.length) {
      for (const cat of dest.destination_categories) {
        // Match by category title or by predefined category names
        if (
          cat.title?.toLowerCase() === categoryName.toLowerCase() ||
          cat.title?.toLowerCase().replace(/\s+/g, '_') === categoryName.toLowerCase()
        ) {
          for (const item of cat.items) {
            items.push({
              name: item.name,
              description: item.description,
              image: item.image,
              destination_name: dest.name,
              destination_slug: dest.slug,
            });
          }
        }
      }
    }
  }

  return {
    category_name: categoryName,
    display_name: displayName,
    items,
  };
}

/**
 * Get all available category names from destinations
 */
export function getAvailableCategoryNames(destinations: Destination[]): Set<string> {
  const categories = new Set<string>();

  for (const dest of destinations) {
    if (!dest.published) continue;

    // Add local_foods if available
    if (dest.local_foods?.length) {
      categories.add('local_foods');
    }

    // Add all destination category titles
    if (dest.destination_categories?.length) {
      for (const cat of dest.destination_categories) {
        if (cat.title) {
          categories.add(cat.title.toLowerCase().replace(/\s+/g, '_'));
          categories.add(cat.title); // Keep original too
        }
      }
    }
  }

  return categories;
}

/**
 * Get featured categories data for homepage display (legacy format)
 */
export function getFeaturedCategoriesForHomepage(
  destinations: Destination[],
  featuredCategories: { category_name: string; display_name: string; items_count?: number }[] = [],
): DestinationCategoryData[] {
  return featuredCategories
    .slice(0, 5) // Max 5 categories
    .map((config) => {
      const categoryData = extractDestinationCategory(destinations, config.category_name, config.display_name);
      return {
        ...categoryData,
        items_count: config.items_count || 3,
      };
    })
    .filter((cat) => cat.items.length > 0); // Only include categories with items
}

/**
 * Get featured items data for homepage display (new destination-centric format)
 * Returns featured items organized by destination and category
 */
export function getFeaturedItemsForHomepage(
  destinations: Destination[],
  featuredItems: FeaturedItemsConfig = {},
): DestinationCategoryData[] {
  const result: DestinationCategoryData[] = [];
  const destinationMap = new Map(destinations.map(d => [d.slug, d]));

  // Process featured items organized by destination
  for (const [destSlug, categories] of Object.entries(featuredItems)) {
    const destination = destinationMap.get(destSlug);
    if (!destination || !destination.published) continue;

    for (const [categoryName, selectedItemNames] of Object.entries(categories)) {
      if (!Array.isArray(selectedItemNames) || selectedItemNames.length === 0) continue;

      // Find items from this destination and category
      const categoryItems: DestinationCategoryData['items'] = [];

      // Check local_foods
      if (categoryName === 'local_foods' && destination.local_foods?.length) {
        for (const food of destination.local_foods) {
          if (selectedItemNames.includes(food.name)) {
            categoryItems.push({
              name: food.name,
              description: food.description,
              image: food.image,
              destination_name: destination.name,
              destination_slug: destination.slug,
            });
          }
        }
      }

      // Check destination_categories
      if (destination.destination_categories?.length) {
        for (const cat of destination.destination_categories) {
          if (
            cat.title?.toLowerCase() === categoryName.toLowerCase() ||
            cat.title?.toLowerCase().replace(/\s+/g, '_') === categoryName.toLowerCase()
          ) {
            for (const item of cat.items) {
              if (selectedItemNames.includes(item.name)) {
                categoryItems.push({
                  name: item.name,
                  description: item.description,
                  image: item.image,
                  destination_name: destination.name,
                  destination_slug: destination.slug,
                });
              }
            }
          }
        }
      }

      // Add to results if we found matching items
      if (categoryItems.length > 0) {
        result.push({
          category_name: categoryName,
          display_name: categoryName.charAt(0).toUpperCase() + categoryName.slice(1).replace(/_/g, ' '),
          items: categoryItems,
        });
      }
    }
  }

  return result;
}
