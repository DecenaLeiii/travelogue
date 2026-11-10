# Featured Categories Admin Improvements - Version 2

## Overview
The Featured Categories admin page has been significantly improved to display categories organized by destination, making it clear to admins which destination each category comes from. This provides a more transparent and intuitive curation experience.

## What Changed

### Previous Behavior
- Categories were shown as a flat list without destination context
- Admins had to manually track which destination each category came from
- No control over how many items to display per category
- Categories might be confusing if multiple destinations had categories with similar names

### New Behavior
- **Organized by Destination**: Available categories are now grouped by destination name
- **Clear Source Attribution**: When featuring a category, the source destination is displayed
- **Item Count Display**: Each category shows how many items it contains
- **Customizable Item Count**: Admins can set 1-10 items to display per featured category (default: 3)
- **Better Visual Hierarchy**: Improved UI layout makes it easier to understand relationships

## How It Works

### 1. Available Categories Section
Shows all destination categories organized by destination:
```
Baguio
├─ featured_foods (2 items)
├─ must_do_activities (3 items)

Boracay
├─ best_beaches (4 items)
└─ water_sports (2 items)
```

Each category card displays:
- Category name
- Number of items available
- Belongs to which destination (implicit from grouping)

### 2. Add Featured Category Form
When adding a category, the dropdown shows:
```
featured_foods (Baguio) - 2 items
must_do_activities (Baguio) - 3 items
best_beaches (Boracay) - 4 items
```

This gives complete context about:
- Category name
- Source destination
- Number of items available

Admins also set:
- **Display Name**: What users see on the homepage (e.g., "Featured Foods")
- **Items to Show**: How many items (1-10) to display on homepage

### 3. Featured Categories Display
Each featured category shows:
```
Category: featured_foods
From: Baguio
Display Name: Featured Foods to Try
Items to Show: 3
3 items available

[Preview Items] [Remove]
```

When clicking "Preview Items", admins see:
- All available items with images
- Item descriptions
- Which destination each item is from
- Full context before deciding to feature

## Technical Implementation

### New Data Structures

```typescript
type AvailableCategory = {
  category_name: string;      // e.g., "featured_foods"
  destination_name: string;   // e.g., "Baguio"
  destination_slug: string;   // e.g., "baguio"
  items_count: number;        // Number of items in this category
};

type FeaturedCategoryConfig = {
  category_name: string;      // The category to feature
  display_name: string;       // Display name on homepage
  items_count?: number;       // How many items to show (1-10)
};
```

### Key Changes in getServerSideProps
1. Iterates through all published destinations
2. Extracts destination_categories from each destination
3. Creates AvailableCategory entries with full context
4. Maintains a map to prevent duplicates

```typescript
for (const dest of destinations) {
  if (dest.destination_categories?.length) {
    for (const cat of dest.destination_categories) {
      // Creates AvailableCategory with destination context
      availableCategoriesMap.set(key, {
        category_name: cat.title?.toLowerCase().replace(/\s+/g, '_'),
        destination_name: dest.name,
        destination_slug: dest.slug,
        items_count: cat.items?.length || 0,
      });
    }
  }
}
```

### New Functions
- **getCategorySourceDestination()**: Gets the source destination for a featured category
- **handleItemsCountChange()**: Manages the per-category display count

## Workflow for Admins

### Step 1: Add Categories to Destinations
1. Go to **Manage Destinations**
2. Edit a destination (e.g., Baguio)
3. In "Destination categories" section, add a category:
   - Title: "Featured Foods"
   - Items: Strawberry, Jam, etc.
4. Save the destination

### Step 2: Feature the Category on Homepage
1. Go to **Manage Featured Categories**
2. See the category listed under "Baguio" with item count
3. Click "Add Featured Category"
4. Select "featured_foods (Baguio) - 2 items"
5. Set Display Name: "Featured Foods to Try"
6. Set Items to Show: 3
7. Click "Add Category"
8. Preview the items by clicking "Preview Items"
9. Save

### Step 3: Homepage Display
The homepage now shows:
- 3 items from "Featured Foods to Try" category
- Items from Baguio's featured_foods category

## Benefits

### For Admins
✅ **Clear Context**: Know exactly which destination each category comes from  
✅ **Transparency**: See all available items before featuring  
✅ **Control**: Customize how many items show per category  
✅ **Efficiency**: Categories automatically discovered from Manage Destinations  
✅ **Prevents Errors**: Can't accidentally duplicate or confuse categories

### For Users
✅ **Better Organization**: Categories are clearly tied to destinations  
✅ **Flexibility**: Homepage can show 3-5 items per category  
✅ **Consistency**: Items within a category are cohesive and related  
✅ **Quality**: Admins had full visibility before featuring

## Database/File Storage

Featured categories are saved in `db/site_branding.json`:
```json
{
  "featured_categories": [
    {
      "category_name": "featured_foods",
      "display_name": "Featured Foods to Try",
      "items_count": 3
    },
    {
      "category_name": "best_beaches",
      "display_name": "Best Beaches",
      "items_count": 4
    }
  ]
}
```

## Testing Checklist

- [x] Build succeeds without errors
- [x] Dev server runs on port 3001
- [x] Available categories organized by destination
- [x] Category dropdown shows destination + item count
- [x] Can add featured categories
- [x] Can set items to show (1-10)
- [x] Can preview items in expanded view
- [x] Can remove featured categories
- [x] Changes save to site_branding.json
- [x] Source destination displays correctly on featured categories

## Rollout Notes

**No database migrations required.** The feature works with existing site_branding.json format.

**Backward Compatible:** Existing featured categories will load correctly. The new `items_count` field defaults to 3 if not present.

## Files Modified

- **pages/admin/featured-categories.tsx** (335 lines)
  - Refactored component structure
  - New AvailableCategory type with destination context
  - Improved UI with better organization
  - Added items_count management
  - Enhanced getServerSideProps to build category list from destinations

## Commit Info
- **Commit**: `2185776`
- **Changes**: 213 insertions, 122 deletions
- **Files**: 1 modified

## Next Steps / Future Enhancements

1. **Drag-to-Reorder**: Allow admins to drag categories to change display order
2. **Category Search**: Filter categories by destination or name
3. **Item-Level Control**: Select specific items to feature instead of whole category
4. **Preview on Mobile**: Show how categories look on mobile devices
5. **Auto-Suggestions**: Suggest categories based on popularity metrics
6. **A/B Testing**: Test different category configurations

---

**Status**: ✅ Complete and Production-Ready  
**Last Updated**: November 10, 2026
