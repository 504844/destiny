Phase 1: Logic Extraction (Separation of Concerns)
Goal: Move complex logic out of UI components into dedicated hooks and utility files.
Extract Data Fetching Logic (hooks/useMusicData.ts)
Create a custom hook useMusicData to handle fetching weeks, tracks, and managing loading states.
Move fetchWeeks and fetchTracks from App.tsx into this hook.
Extract Audio State (hooks/useAudioPlayer.ts)
Create a hook to manage playingTrackId, onPlay, and onStop.
This removes the clutter of playback state management from the main App.tsx.
Extract Admin Logic (hooks/useAdmin.ts)
Move the "Triple Click" login logic, isAdmin state, and modal visibility toggles into a hook.
Centralize Parsing Logic (lib/parsers.ts)
Move the complex parseDiscordDump function from AdminPanel.tsx into a pure utility file. This makes it easier to unit test the regex logic without mounting the component.

Phase 2: App.tsx Decomposition
Goal: Make App.tsx a clean "Orchestrator" that just assembles views.
Create components/layout/Navbar.tsx
Extract the top navigation bar, logo (and its click logic), and social icons.
Create components/layout/BackgroundEffects.tsx
Extract the dynamic gradient and grid background divs.
Create components/views/HomeView.tsx
Extract the "Home" specific render logic (Hero text, WeekSelector sticky bar, Track list) into its own component.
App.tsx should basically just toggle between <HomeView /> and <UserProfile />.
Create components/layout/Footer.tsx
Extract the footer.

Phase 3: AdminPanel Refactoring
Goal: Break down the monolithic AdminPanel into a manageable form wizard.
Create components/admin/WeekMetadataForm.tsx
Extract the left column inputs (Week Number, Date Range, Spotify URL).
Create components/admin/DiscordImport.tsx
Extract the large Textarea for the Discord dump.
Create components/admin/TrackEditorList.tsx
Extract the right column that lists all tracks.
Create components/admin/TrackEditorItem.tsx
Extract the individual row for editing a single track (Input fields for Artist, Title, Submitter, Medal).

Phase 4: Search & Profile Componentization
Goal: Clean up CommandSearch and UserProfile.
Refactor CommandSearch.tsx
Extract SearchInput (The top bar).
Extract RecentSearches (The history list logic).
Extract SearchResults (The logic determining if we show Users or Tracks groups).
Refactor UserProfile.tsx
Extract ProfileHeader (Avatar and gradient background).
Extract StatsGrid (The 4 statistic cards).
Extract HistoryList (The chronological list of tracks).