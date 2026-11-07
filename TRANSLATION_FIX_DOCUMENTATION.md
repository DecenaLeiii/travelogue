# Regional Language Translations Fix

## Problem
The Philippines Travelogue website supports regional languages (Hiligaynon, Waray, Kapampangan, Bicolano, Pangasinan), but content was not translating properly in two scenarios:

1. **Homepage Modal**: When clicking on a destination card on the homepage to view its full description, translated content was not displaying for regional languages
2. **New Destinations**: When new destinations were added via the admin panel, they didn't have translation entries, so they couldn't be displayed in regional languages

## Solution

### 1. Modal Translation Fix
**File**: `pages/index.tsx`

Modified the homepage Modal component to fetch translations independently when the language changes:

```typescript
const [translatedContent, setTranslatedContent] = useState<string | null>(null);

useEffect(() => {
  if (!dest || lang === 'en') {
    setTranslatedContent(null);
    return;
  }

  // Fetch translated content from API
  fetch(`/api/translations/destination?slug=${encodeURIComponent(slug)}&lang=${encodeURIComponent(lang)}`)
    .then(async (res) => {
      const j = await res.json();
      const entry = j.translation || {};
      setTranslatedContent(entry.content || null);
    })
    .catch(() => setTranslatedContent(null));
}, [dest, lang]);

// Display translated content with fallback to original
<div>{translatedContent || (dest as any).content || t('noAdditionalDetails')}</div>
```

**Result**: Modal now displays translated destination content when language is changed.

### 2. Auto-Generation of Placeholder Translations
**Files**: 
- `lib/translationSync.ts` (new)
- `pages/api/admin/destinations/index.ts`
- `pages/api/admin/destinations/[id].ts`

Created a translation sync system that automatically generates placeholder translation entries when destinations are created, updated, or deleted:

```typescript
// When a destination is created
addTranslationPlaceholder(slug, {
  name: destination.name,
  short_description: destination.short_description,
  content: destination.content,
  // ... other fields
});

// When a destination is deleted
removeTranslationEntry(slug);
```

This function:
- Reads all regional language translation files
- Adds a new entry for the destination with English content as placeholder
- Writes the updated translations back to disk

**Result**: New destinations automatically appear in regional languages (using English content as fallback until proper translations are provided).

## Regional Languages Supported
- Hiligaynon (hil)
- Waray-Waray (war)
- Kapampangan (pam)
- Bicolano (bik)
- Pangasinan (pag)

## Translation Files Location
All translation files are stored in the `db/` directory:
- `destination_translations.hil.json`
- `destination_translations.war.json`
- `destination_translations.pam.json`
- `destination_translations.bik.json`
- `destination_translations.pag.json`

## How It Works

### Translation Loading Flow
1. User selects a regional language on the homepage
2. Language preference is stored in localStorage
3. When viewing a destination modal or detail page:
   - Frontend calls `/api/translations/destination?lang=hil&slug=boracay`
   - API loads the translation from the JSON file
   - Frontend displays translated content

### New Destination Flow
1. Admin creates a destination via `/admin/destinations/new`
2. POST to `/api/admin/destinations` with destination data
3. Destination is saved to Supabase database
4. `addTranslationPlaceholder()` automatically:
   - Reads all regional language translation files
   - Adds entry for new destination
   - Writes updated files back to disk
5. Destination now appears in regional languages

## Future Improvements
1. **Admin UI for Translations**: Create a dedicated interface for admins to add/edit translations for each regional language
2. **Bulk Translation Export/Import**: Allow admins to export destinations in CSV and import translations
3. **Translator Workflow**: Implement a system for professional translators to add proper translations
4. **Translation Status Dashboard**: Show which destinations still need proper translations vs. using English fallback
5. **Machine Translation API**: Optionally integrate Google Translate or similar for initial translations

## Testing
To verify translations are working:

1. **Existing Destinations**:
   - Navigate to homepage
   - Select a regional language (e.g., Hiligaynon)
   - Click on a destination card
   - Modal should display content in selected language

2. **New Destinations**:
   - Create a new destination via admin panel
   - Navigate to homepage
   - Select a regional language
   - New destination should appear (with English content as placeholder)

## Technical Details

### API Endpoint
- **GET** `/api/translations/destination?slug=boracay&lang=hil`
  - Returns single destination translation

- **GET** `/api/translations/destination?lang=hil`
  - Returns all destination translations for a language

### File Format
Translation files are JSON with structure:
```json
{
  "boracay": {
    "name": "Boracay",
    "short_description": "...",
    "content": "...",
    "highlights": ["..."],
    "travel_tips": ["..."],
    "region": "...",
    "location": "...",
    "best_time_to_visit": "..."
  }
}
```

### Server-Side vs Client-Side
- Server-side rendering: `/getPublishedDestinations()` fetches from Supabase with all fields
- Client-side translation: `useDestinationTranslations()` hook loads all translations for a language
- Modal translation: Independent fetch when language changes
