# Google Play Data Safety Form — Answers

Use these answers when filling out the Data Safety section in Google Play Console.

## Does your app collect or share any of the required user data types?
Yes

## Is all of the user data collected by your app encrypted in transit?
Yes (HTTPS for all API calls)

## Do you provide a way for users to request that their data is deleted?
Yes — users can clear all app data from the app's settings or by uninstalling. No server-side data exists to delete.

---

## Data Types

### Location
- **Collected:** Yes — Approximate location and Precise location
- **Shared:** No
- **Ephemeral:** Yes (used in real time, not stored on servers)
- **Required:** No (user can set location manually)
- **Purpose:** App functionality (finding nearby restaurants)

### App activity — App interactions
- **Collected:** Yes (via PostHog analytics)
- **Shared:** No
- **Ephemeral:** No (retained by PostHog)
- **Required:** No
- **Purpose:** Analytics

### Device or other IDs
- **Collected:** Yes (anonymous device identifier via PostHog)
- **Shared:** No
- **Ephemeral:** No
- **Purpose:** Analytics

---

## All other data types: NOT COLLECTED
- Personal info (name, email, address, phone): No
- Financial info: No
- Health and fitness: No
- Messages: No
- Photos and videos: No
- Audio files: No
- Files and docs: No
- Calendar: No
- Contacts: No
- Web browsing: No
