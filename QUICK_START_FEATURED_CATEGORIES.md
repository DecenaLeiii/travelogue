# Quick Start: Managing Homepage Featured Categories

## 🎯 What is This?
The "Discover Destination Experiences" section on your homepage showcases destination categories like:
- Local Foods to Try
- Must-Do Activities  
- Cultural Experiences
- And more!

## 🚀 How to Access

### Method 1: Top Navigation (FASTEST)
1. Go to **Admin Dashboard** (`/admin`)
2. Click **"Featured Categories"** in the top menu bar

### Method 2: Dashboard Panel
1. Go to **Admin Dashboard** (`/admin`)
2. Scroll down to **"Homepage Media"** section
3. Click **"Manage Featured Categories"**

## 📋 What You Can Do

### View Available Categories
All categories from your destination records are shown. These come from the `category` field when you create/edit destinations.

### Add a Category (Max 5)
1. Select a category from the **"Category Name"** dropdown
2. Enter a **Display Name** (what users see on the homepage)
3. Click **"Add Category"**
4. Click **"Save Featured Categories"**

### Edit Display Names
1. Scroll to **"Featured Categories"** section
2. Modify any display name
3. Click **"Save Featured Categories"**

### Remove a Category
1. Find the category in the list
2. Click the **red "Remove"** button
3. Click **"Save Featured Categories"**

## 💡 Tips

- **Minimum**: At least 1 category needed to show the section
- **Maximum**: Up to 5 categories
- **Minimum per category**: At least 1 destination item with that category tag
- **Changes are live**: They appear on the homepage immediately after saving
- **Display names are flexible**: Use any name you want (doesn't have to match the category name)

## 📸 Example Setup

| Category Name | Display Name | Examples |
|---|---|---|
| local_foods | Local Foods to Try | Grilled Tuna, Kinilaw, Lechon |
| activities | Must-Do Activities | Parasailing, Scuba Diving, Canyoneering |
| cultural_items | Cultural Experiences | Traditional Crafts, Heritage Tours |

## ❓ Troubleshooting

**Q: I don't see any categories in the dropdown**
A: You need to add items with a `category` field to your destinations first. Edit a destination and set its category.

**Q: Changes aren't showing up on the homepage**
A: 
- Make sure at least 1 category is selected
- Verify destinations have items with matching categories
- Try refreshing the homepage (Ctrl+Shift+R)

**Q: Can I have the same category twice?**
A: No, each category can only appear once. Edit the display name instead if needed.

## 🔧 Technical Details

- **Configuration File**: `db/site_branding.json`
- **API Endpoint**: `/api/admin/site-branding` (PUT)
- **Frontend**: `/pages/admin/featured-categories.tsx`
- **Display Component**: `FeaturedCategoriesSection.tsx`

## 📖 Related Documentation

- [Full Implementation Guide](./ADMIN_FEATURED_CATEGORIES_FIX.md)
- [Homepage Structure](./README.md)
- [Destination Management](./pages/admin/destinations/index.tsx)
