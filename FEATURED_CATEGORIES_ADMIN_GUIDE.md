# Featured Categories Admin Interface - Complete User Guide

## 🎯 Overview

The Featured Categories admin page lets you manage the "Discover Destination Experiences" section on the Travelogue homepage. You select which destination categories to feature and control how many items display per category.

---

## 📍 Location in Admin Dashboard

**Path:** `/admin/featured-categories`

**Access:**
1. Log in to Admin Dashboard
2. Click "Featured Categories" in the navigation menu
3. Or go to Homepage Media panel and click "Manage Featured Categories"

---

## 📋 Page Layout

### Section 1: Available Categories (per Destination)

Shows all categories that have been created across your destinations.

```
┌──────────────────────────────────────────────────────────┐
│ Available Categories (per Destination)                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🏔️  BAGUIO                                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ featured_foods           (2 items)                 │  │
│ │ must_do_activities       (3 items)                 │  │
│ │ hiking_trails            (5 items)                 │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ 🏝️  BORACAY                                             │
│ ┌────────────────────────────────────────────────────┐  │
│ │ best_beaches             (4 items)                 │  │
│ │ water_sports             (2 items)                 │  │
│ │ nightlife                (3 items)                 │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ 🏖️  PALAWAN                                             │
│ ┌────────────────────────────────────────────────────┐  │
│ │ island_hopping           (6 items)                 │  │
│ │ diving_spots             (4 items)                 │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**What you see here:**
- All categories organized by destination
- Item count for each category
- Destinations are grouped together

**If empty:**
- "No categories found. Add categories to destinations in Manage Destinations first."
- Go to Manage Destinations and add categories to start

---

### Section 2: Add Featured Category

Use this form to select which category to feature on the homepage.

```
┌──────────────────────────────────────────────────────────┐
│ Add Featured Category                                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Select Category:                                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ -- Select a category --                        ▼  │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Display Name (what users see):                           │
│ ┌────────────────────────────────────────────────────┐  │
│ │ ________________________________                   │  │
│ └────────────────────────────────────────────────────┘  │
│ e.g., Featured Foods, Must-Do Activities               │
│                                                          │
│ Items to Show on Homepage:                               │
│ ┌────────┐                                              │
│ │    3   │  ← Adjustable 1-10                          │
│ └────────┘                                              │
│ Default: 3 items                                         │
│                                                          │
│ [       Add Category       ]                             │
│ (disabled until fields are filled)                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Step-by-Step: Adding a Category

#### Step 1: Select Category
1. Click the dropdown under "Select Category"
2. You'll see all available categories with their source:
   ```
   featured_foods (Baguio) - 2 items
   must_do_activities (Baguio) - 3 items
   best_beaches (Boracay) - 4 items
   water_sports (Boracay) - 2 items
   ```
3. Click on the category you want to feature

**Tip:** The dropdown shows:
- Category name
- Which destination it's from
- How many items it has

This helps you pick the right category with full context!

#### Step 2: Set Display Name
1. Enter what you want users to see on the homepage
2. Examples:
   - "Featured Foods to Try"
   - "Must-Do Activities"
   - "Best Beaches"
   - "Popular Hiking Trails"

**Tip:** Use user-friendly names, not technical names!

#### Step 3: Set Items to Show
1. Enter a number between 1 and 10
2. This is how many items display for this category on the homepage
3. Default is 3
4. You can use different numbers for different categories

**Tip:** 
- Use 3-4 for general categories
- Use 5-6 for popular categories
- Use fewer (2-3) for niche categories

#### Step 4: Add the Category
1. Click "Add Category"
2. You'll see it appear in the "Featured Categories" section below

---

### Section 3: Featured Categories

Shows all categories you've selected to feature on the homepage.

```
┌──────────────────────────────────────────────────────────┐
│ Featured Categories (2/5)          [Save Featured Categories]
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Category: featured_foods                           │  │
│ │ From: Baguio ✓                                      │  │
│ │                                                    │  │
│ │ Display Name:                                      │  │
│ │ [Featured Foods to Try         ]                  │  │
│ │                                                    │  │
│ │ Items to Show:                                     │  │
│ │ [3▲▼]                                              │  │
│ │                                                    │  │
│ │ 2 items available                                  │  │
│ │                                                    │  │
│ │                    [Preview Items] [Remove]        │  │
│ │                                                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Category: best_beaches                             │  │
│ │ From: Boracay ✓                                     │  │
│ │                                                    │  │
│ │ Display Name:                                      │  │
│ │ [Best Beaches              ]                       │  │
│ │                                                    │  │
│ │ Items to Show:                                     │  │
│ │ [4▲▼]                                              │  │
│ │                                                    │  │
│ │ 4 items available                                  │  │
│ │                                                    │  │
│ │                    [Preview Items] [Remove]        │  │
│ │                                                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Features:**
- Displays each featured category as a card
- Shows source destination
- Can edit Display Name anytime
- Can adjust Items to Show (1-10)
- Can preview all items
- Can remove if no longer needed
- Shows count: (2/5) = 2 featured, up to 5 allowed

---

### Preview Items Feature

Click "Preview Items" to see all items in that category:

```
┌──────────────────────────────────────────────────────────┐
│ All Available Items:                                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ ┌──────────┐  ┌──────────┐                              │
│ │[Image]   │  │[Image]   │                              │
│ │          │  │          │                              │
│ │Strawberry│  │Jam       │                              │
│ │          │  │          │                              │
│ │Strawberry│  │Jam       │                              │
│ │Farm is   │  │Made from │                              │
│ │one of... │  │local...  │                              │
│ │Baguio    │  │Baguio    │                              │
│ │          │  │          │                              │
│ └──────────┘  └──────────┘                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

This preview shows:
- Item image (if available)
- Item name
- Item description (first 80 characters)
- Which destination the item is from

**Use this to:**
- Verify you're featuring the right items
- Ensure quality before saving
- Check item images are displaying correctly
- Confirm items are from the right destination

---

## 🎮 Common Tasks

### How to Change Display Name
1. Find the featured category card
2. Edit the "Display Name" text field
3. Click "Save Featured Categories"

### How to Change Items Count
1. Find the featured category card
2. Adjust the "Items to Show" number
3. Click "Save Featured Categories"

### How to Remove a Category
1. Find the featured category card
2. Click the "Remove" button
3. Click "Save Featured Categories"

### How to Preview Items Before Saving
1. Add a category
2. Click "Preview Items" to see all items
3. Verify they look good
4. Adjust settings if needed
5. Click "Save Featured Categories"

---

## 💾 Saving Your Changes

After making changes:
1. Click the "Save Featured Categories" button at the bottom
2. You'll see a success message: "Featured categories saved successfully!"
3. The changes will appear on the homepage within moments

---

## ⚠️ Important Notes

### Before You Start
- Make sure you've added categories to your destinations first
- Go to Manage Destinations → Edit a destination → Add categories

### You Can Feature Up To 5 Categories
- Maximum of 5 categories on the homepage
- Button will disable when you reach 5
- Remove one to add another

### Items Per Category is Flexible
- Minimum: 1 item
- Maximum: 10 items
- Default: 3 items
- Each category can have different counts

### Source Destination is Always Shown
- "From: Baguio" tells you which destination the category comes from
- This helps prevent confusion
- If something looks wrong, check the source

---

## 🏠 How It Appears on Homepage

When users visit the homepage, they'll see:

```
╔════════════════════════════════════════════════════════╗
║ Discover Destination Experiences                      ║
╠════════════════════════════════════════════════════════╣
║                                                        ║
║ Featured Foods to Try                                 ║
║ ┌──────────┐  ┌──────────┐  ┌──────────┐             ║
║ │Strawberry│  │Jam       │  │Vegetables│             ║
║ │with      │  │from local│  │fresh from│             ║
║ │details...│  │recipes...│  │farm...   │             ║
║ └──────────┘  └──────────┘  └──────────┘             ║
║                                                        ║
║ Best Beaches                                           ║
║ ┌──────────┐  ┌──────────┐  ┌──────────┐             ║
║ │White     │  │Diniwid   │  │Willy's   │             ║
║ │Beach with│  │Beach ideal│  │Rock scenic│             ║
║ │...details │  │for...    │  │...       │             ║
║ └──────────┘  └──────────┘  └──────────┘             ║
║ [View More]                                           ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

- Your "Display Name" becomes the section heading
- Shows the number of items you set
- Users can see all items in each category

---

## ✅ Best Practices

1. **Use Friendly Names**
   - ❌ "featured_foods"
   - ✅ "Featured Foods to Try"

2. **Show Enough Items**
   - Too few (1-2): Looks sparse
   - Good (3-4): Balanced
   - Many (5-6): More options

3. **Organize by Relevance**
   - Feature popular categories first
   - Seasonal categories as appropriate
   - Mix destinations to show variety

4. **Review Before Saving**
   - Always click "Preview Items"
   - Check for any broken images
   - Verify item details are accurate

5. **Keep It Fresh**
   - Update categories regularly
   - Add new destination categories periodically
   - Remove underperforming categories

---

## 🆘 Troubleshooting

### No Categories Showing
**Problem:** "No categories found. Add categories to destinations in Manage Destinations first."

**Solution:**
1. Go to Manage Destinations
2. Click on a destination
3. Scroll to "Destination categories"
4. Click "Add category"
5. Add items to the category
6. Save the destination
7. Return to Featured Categories - you should see it now

### Category Won't Add
**Problem:** "Add Category" button is disabled

**Solution:**
- Make sure you selected a category from the dropdown
- Make sure you entered a display name
- Both fields must be filled

### Changes Not Saving
**Problem:** Changes disappear after refresh

**Solution:**
1. Make sure you click "Save Featured Categories"
2. Wait for the success message
3. Then refresh the page

### Item Images Not Showing in Preview
**Problem:** Preview items show no images

**Solution:**
- Images might not be uploaded for those items
- Go to Manage Destinations
- Edit the category items
- Upload images for each item
- Return to Featured Categories and check again

---

## 📞 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Review this guide
3. Contact your administrator
4. Check the browser console for error messages

---

**Last Updated:** November 10, 2026  
**Admin Tool:** Featured Categories Manager v2
