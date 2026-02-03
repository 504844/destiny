Phase 5: Metadata Service Extraction
Goal: Remove the ~100 lines of API fetching logic (Spotify, Deezer, iTunes) from TrackItem.tsx.
Create services/metadata.ts
Move getSpotifyAccessToken, fetchSpotifyMetadata, fetchDeezerMetadata, fetchItunesMetadata here.
Move the complex searchExternalMetadata orchestration logic here.
This makes TrackItem.tsx purely about presentation and state, not API implementation.
Create hooks/useTrackMetadata.ts
Extract the useEffect logic that triggers the metadata search, handles the "healing" retry logic, and updates Supabase.
This hook should return { metadata, isLoading, isRetrying, dominantColor }.

Phase 6: TrackItem UI Decomposition
Goal: Break TrackItem.tsx into small, readable functional components.
Create components/track/TrackArtwork.tsx
Handle the image rendering, hover effects, Play/Pause button overlay, and the SVG Progress Ring.
This isolates the complex "Is Playing" visual logic.
Create components/track/TrackInfo.tsx
Handle the Title, Artist, and Submitter text rendering.
Handle the logic for truncating text vs wrapping text when active.
Create components/track/TrackActions.tsx
Handle the row of social icons (Spotify, Apple, SoundCloud, YouTube) and their generation logic.
Refactor TrackItem.tsx
It becomes a simple container that calls useTrackMetadata and lays out the three components above using flexbox/grid.

Phase 7: HomeView Refinement
Goal: Clean up the render logic in HomeView.tsx.
Create components/home/HomeControls.tsx
Extract the "Sticky" header containing WeekSelector, Search button, and Edit button.
Create components/home/TrackList.tsx
Move the logic for rendering the list of tracks, the "Loading Skeletons", and the "Empty State" (dashed box) into a dedicated component.
This makes HomeView essentially just a wrapper for Header -> Controls -> TrackList.
