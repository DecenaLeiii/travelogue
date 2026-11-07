# Featured Categories - Full Implementation Guide

## 🎯 Overview
The Featured Categories feature allows admins to curate which destination items appear in the "Discover Destination Experiences" section on the homepage. This includes categories like:
- **Local Foods to Try** (foods and dishes from destinations)
- **Must-Do Activities** (adventures and experiences)
- **Festivals** (events and celebrations)
- **Cultural Experiences** (heritage and traditions)
- **Custom categories** (any category tags in your destinations)

## 📍 Accessing Featured Categories

### From Admin Dashboard
1. Log in to `/admin`
2. Click **"Featured Categories"** in the top navigation menu
3. **OR** Scroll down to **"Homepage Media"** panel and click **"Manage Featured Categories"**

### Direct URL
Navigate directly to: `/admin/featured-categories`

## 🎛️ Interface Overview

### Left Panel: Category Management
- **Add Featured Category**: Select a category from available options and set a display name
- **Available Categories**: Shows all categories found in your destination data
- **Featured Categories List**: Shows all currently featured categories with options

### Right Panel: Item Preview (NEW!)
For each featured category, you can:
- Click **"View Items"** to expand and see all items in that category
- See item details: name, description, image, and source destination
- Check which destinations contribute items to each category
- Click **"Hide Items"** to collapse the view

## 🔧 Step-by-Step Setup

### Step 1: Create Destination Items with Categories
Before featuring categories, your destinations must have items with category tags:

**For Local Foods:**
- Edit a destination page
- Add "Local Foods" items with fields: name, description, image
- Each food automatically gets tagged as "local_foods"

**For Activities/Other Categories:**
- Edit a destination page
- Add "Destination Categories" (e.g., "Activities", "Festivals")
- Add items within each category: name, description, image

### Step 2: Add Categories to Featured List
1. Go to `/admin/featured-categories`
2. In **"Add Featured Category"** section:
   - Select a **Category Name** from the dropdown (based on destination data)
   - Enter a **Display Name** (what users see: "Local Foods to Try", "Must-Do Activities", etc.)
   - Click **"Add Category"**

### Step 3: View and Verify Items
1. Scroll to the **"Featured Categories"** list
2. For each category, click **"View Items"**
3. Verify all items you want featured are showing:
   - Item name and description
   - Item image thumbnail
   - Source destination name
4. If items are missing:
   - Check that destination items have the right category tag
   - Destination must be "published"
   - Item must have at least a name

### Step 4: Customize Display Names (Optional)
- Edit the **Display Name** field to change how users see the category
- Example: "activities" → "Must-Do Adventures" or "Popular Things to Do"

### Step 5: Save Changes
1. Click the green **"Save Featured Categories"** button
2. Wait for success message
3. Changes appear on homepage immediately

## 📊 Current Status Display

| Indicator | Meaning |
|-----------|---------|
| "Featured Categories (2/5)" | Shows how many categories are featured (max 5) |
| Item count | "10 items available" - Total items in that category |
| "View Items" button | Click to expand and see all items for that category |

## 💡 Tips & Best Practices

### Maximum Categories
- **Limit**: 5 featured categories maximum
- **Minimum**: At least 1 category needed to show section on homepage
- **Recommendation**: 2-4 categories for best homepage balance

### Item Visibility
- Only items from **published** destinations appear
- Items without a name won't display
- Items without images still show but with placeholder
- First 3 items per category show on homepage (but all are available)

### Naming Conventions
Good display names:
- ✅ "Local Foods to Try"
- ✅ "Must-Do Activities"
- ✅ "Cultural Experiences"
- ✅ "Festival Highlights"

Avoid:
- ❌ "local_foods" (use underscores in system, not for display)
- ❌ Very long names (keep under 30 characters)
- ❌ All caps

### Updating Categories
To add a new category:
1. First, edit a destination and add items with that category
2. Then, it will appear in the "Available Categories" list
3. Add it to Featured Categories

To remove a category:
1. Click the red **"Remove"** button
2. Click **"Save Featured Categories"**
3. The category disappears from homepage

## 🐛 Troubleshooting

### Problem: Category not appearing in dropdown
**Solution**: 
- Check that at least one destination has items with that category
- Verify the destination is published
- Try refreshing the page

### Problem: Items not showing in expanded view
**Solution**:
- Expand the category to "View Items"
- If "0 items available", check destination data:
  - Does the destination have items with this category?
  - Is the destination published?
  - Do items have a name field?

### Problem: Changes not appearing on homepage
**Solution**:
- Make sure you clicked **"Save Featured Categories"**
- Try hard refresh (Ctrl+Shift+R)
- Wait a few seconds for cache to clear
- Verify at least 1 category is featured

### Problem: Too many/few items showing on homepage
**Solution**:
- This is expected - homepage shows first 3 items per category
- All items are available in the category (visible when expanded)
- Add/remove destination items to adjust what's available

## 📱 Homepage Display

### What Users See
The homepage shows the "Discover Destination Experiences" section with:
- **Section Title**: "Discover Destination Experiences"
- **Featured Categories**: 2-5 categories you configured
- **Items per Category**: First 3 items displayed on homepage
- **Click to Destination**: Users can click any item to view the destination

### Example Layout
```
Discover Destination Experiences

Local Foods to Try          Must-Do Activities
├─ Grilled Tuna            ├─ Parasailing
├─ Kinilaw                 ├─ Scuba Diving
└─ Lechon                  └─ Canyoneering
```

## 🔄 API Details

### Save Endpoint
- **URL**: `/api/admin/site-branding`
- **Method**: PUT
- **Body**: 
  ```json
  {
    "featured_categories": [
      {
        "category_name": "local_foods",
        "display_name": "Local Foods to Try"
      },
      {
        "category_name": "activities",
        "display_name": "Must-Do Activities"
      }
    ]
  }
  ```

### Configuration Storage
- **File**: `db/site_branding.json`
- **Field**: `featured_categories` (array)
- **Auto-saved**: When you click "Save Featured Categories"

## 🎓 Related Destinations Features

To add new destination items:
1. Go to `/admin/destinations`
2. Click a destination to edit
3. Add items to:
   - **Local Foods** section (auto-tagged as "local_foods")
   - **Destination Categories** section (custom categories)
4. Each item can have: name, description, image

To add new destination categories:
1. While editing a destination
2. In "Destination Categories" section
3. Add a new category with a title
4. Add items within that category

## 🚀 Next Steps

1. **Set up your destinations** with items and categories
2. **Access Featured Categories** admin page
3. **View available categories** and their items
4. **Add categories** you want to feature (max 5)
5. **Customize display names** for users
6. **Save and verify** changes appear on homepage
7. **Monitor analytics** on admin dashboard to see engagement

## 📞 Support

If items aren't appearing:
1. Check destination has items with the right category
2. Verify destination is published
3. Click "View Items" to debug
4. Look for missing names or other issues
5. Edit destination and fix the items

If interface questions:
1. Use "View Items" button to explore category structure
2. Item count shows how many items are available
3. Display name is what users see on homepage
4. All 3 fields are required to save
