# Scan Count Fix Summary

## Problem
The global scan count for trending species was not working correctly. When users scanned species, the count wasn't being properly aggregated across all users, and the trending species section wasn't displaying the correct global count.

## Root Cause
In `src/hooks/useImageProcessing.js`, the code was using an incorrect `require()` statement to import `incrementGlobalObservation` and `addToHistory` functions:

```javascript
// ❌ WRONG - This was causing the issue
const { addToHistory, incrementGlobalObservation } = require('@firestoreService');
```

This incorrect import meant that:
1. The global observation count was never being incremented when users scanned
2. The history wasn't being saved with the correct global count
3. Trending species couldn't display accurate scan counts

## Solution
Fixed the import statement to use proper ES6 module imports at the top of the file:

```javascript
// ✅ CORRECT - Proper ES6 import
import { addToHistory, incrementGlobalObservation } from '@services/firebase';
```

## Changes Made

### File: `src/hooks/useImageProcessing.js`

1. **Added proper imports** at the top of the file:
   ```javascript
   import { addToHistory, incrementGlobalObservation } from '@services/firebase';
   ```

2. **Removed incorrect require statement** from `processSuccessfulMatch` function

3. **Fixed the global observation increment logic**:
   - Now properly calls `incrementGlobalObservation()` when a user scans a species
   - Correctly passes the global count to `addToHistory()`
   - Logs the global observation count for debugging

## How It Works Now

### Flow:
1. User scans a species using the camera or gallery
2. Species is identified via Vision API, PlantNet, or iNaturalist
3. **Global observation count is incremented** via `incrementGlobalObservation()`
4. User's history is saved with the updated global count via `addToHistory()`
5. Trending species are fetched from `globalObservations` collection sorted by count
6. TrendingCard displays the global count for each species
7. HistoryScreen shows the global count in the species details modal

### Data Flow:
```
User Scan
    ↓
incrementGlobalObservation() → Updates globalObservations collection
    ↓
addToHistory() → Saves to user's history with global count
    ↓
getTrendingSpecies() → Fetches top species by global count
    ↓
TrendingCard displays count (after globe logo)
HistoryScreen displays count in modal
```

## Verification

To verify the fix is working:

1. **In HomeScreen (Trending Section)**:
   - Open the app and navigate to Home
   - Look at the trending species cards
   - Each card should show a scan count (e.g., "42 scans")

2. **In HistoryScreen**:
   - Navigate to History
   - Tap on any species to open the details modal
   - Look for "Global App Scans" section
   - Should display the total number of scans across all users

3. **After Scanning**:
   - Scan a new species
   - Check the history - it should show the global count
   - Refresh the home feed - the trending count should increase

## Files Modified
- `src/hooks/useImageProcessing.js` - Fixed imports and global observation increment logic

## Related Files (No Changes Needed)
- `src/services/firebase/firestore.js` - Already has correct `incrementGlobalObservation()` implementation
- `src/components/common/Card/TrendingCard.js` - Already displays `item.count` correctly
- `src/screens/User/HistoryScreen/index.js` - Already displays `globalObsCount` correctly
- `src/screens/Main/HomeScreen/index.js` - Already fetches trending species correctly
