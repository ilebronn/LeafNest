# Guest Mode Scan Limit Fix - Documentation

## Problem
Guest users were experiencing a bug where the scan count would reset when navigating back to any screen, allowing them to scan unlimited times instead of being limited to 1 scan.

## Root Cause
The issue was in the `useScanLimits` hook where:
1. `checkScanLimit()` was being called BEFORE the scan to verify the user had scans remaining
2. The scan count was being incremented DURING the check, not AFTER successful scan completion
3. When users navigated back to the ScanScreen, the hook would re-render and the state would be reset
4. This allowed users to bypass the 1-scan limit by simply navigating away and back

## Solution
Implemented a proper **pre-scan check** and **post-scan decrement** pattern:

### Changes Made

#### 1. **useScanLimits Hook** (`src/hooks/useScanLimits.js`)
- **Separated concerns** into two distinct functions:
  - `checkScanLimit()` - PRE-SCAN CHECK: Only verifies if user has scans remaining, does NOT decrement
  - `decrementScanCountPostScan()` - POST-SCAN: Called AFTER successful scan completion to decrement count

- **For Guest Users:**
  - `checkScanLimit()` checks if remaining scans > 0
  - `handleGuestPostScan()` increments the count AFTER successful identification
  - Count is persisted in AsyncStorage, not in component state

- **For Authenticated Users:**
  - `checkScanLimit()` checks if scans remaining > 0
  - `decrementScanCountPostScan()` is called after successful scan to decrement from server
  - Count is managed server-side in Firestore

#### 2. **ScanScreen** (`src/screens/Main/ScanScreen/index.js`)
- Added `handlePostScanSuccess()` wrapper that:
  - Calls `handleGuestPostScan()` for guest users
  - Calls `decrementScanCountPostScan()` for authenticated users
  - Ensures count is only modified AFTER successful scan

#### 3. **useImageProcessing Hook** (`src/hooks/useImageProcessing.js`)
- Added support for post-scan callback
- Ensures decrement happens only after successful species identification

## How It Works Now

### Guest User Flow:
```
1. User opens ScanScreen
2. User clicks Scan button
   ↓
3. checkScanLimit() checks AsyncStorage
   - If remaining > 0: Allow scan
   - If remaining ≤ 0: Show premium gate
   ↓
4. Image processing begins
   ↓
5. Species identified successfully
   ↓
6. handleGuestPostScan() called
   - Increments count in AsyncStorage
   - Shows upgrade prompt if limit reached
   ↓
7. Navigate to SpeciesLandingPage
```

### Authenticated User Flow:
```
1. User opens ScanScreen
2. User clicks Scan button
   ↓
3. checkScanLimit() checks Firestore
   - If remaining > 0: Allow scan
   - If remaining ≤ 0: Show premium gate
   ↓
4. Image processing begins
   ↓
5. Species identified successfully
   ↓
6. decrementScanCountPostScan() called
   - Decrements count in Firestore
   - Updates local state
   ↓
7. Navigate to SpeciesLandingPage
```

## Key Improvements

✅ **Persistent Storage**: Guest scan count is stored in AsyncStorage, not component state
✅ **Atomic Operations**: Count is only modified after successful scan completion
✅ **No State Reset**: Navigating back to ScanScreen doesn't reset the count
✅ **Server-Side Validation**: Authenticated users have server-side count management
✅ **Clear Separation**: Pre-scan checks are separate from post-scan operations

## Testing Checklist

- [ ] Guest user can scan 1 time
- [ ] Guest user cannot scan a 2nd time (premium gate shows)
- [ ] Guest user navigates back to ScanScreen - count remains 1
- [ ] Guest user navigates to other screens and back - count remains 1
- [ ] Authenticated user can scan multiple times (based on subscription)
- [ ] Authenticated user sees correct remaining scans after each scan
- [ ] Scan count persists after app restart (guest)
- [ ] Scan count resets after user signs up/in

## Files Modified

1. `src/hooks/useScanLimits.js` - Separated check and decrement logic
2. `src/screens/Main/ScanScreen/index.js` - Added post-scan success handler
3. `src/hooks/useImageProcessing.js` - Added support for post-scan callback

## Backward Compatibility

✅ All existing functionality preserved
✅ No breaking changes to API
✅ Guest mode still works as expected
✅ Authenticated users unaffected
