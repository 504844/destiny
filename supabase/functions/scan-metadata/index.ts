import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    const CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')
    const CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('Missing Spotify Credentials in Edge Function Secrets')
    }

    // 1. Get Access Token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
      },
      body: 'grant_type=client_credentials'
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    if (!accessToken) throw new Error('Failed to obtain Spotify access token')

    // 2. Search for the Track
    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    
    const searchData = await searchResponse.json()
    const track = searchData.tracks?.items?.[0]

    if (!track) {
      return new Response(JSON.stringify({ found: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Get Audio Features (BPM, Energy)
    // Note: Spotify API does not provide "Country" of artist origin efficiently.
    const featuresResponse = await fetch(
      `https://api.spotify.com/v1/audio-features/${track.id}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    
    const features = await featuresResponse.json()

    // 4. Construct Response
    const result = {
      found: true,
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      artworkUrl: track.album?.images?.[0]?.url,
      previewUrl: track.preview_url,
      bpm: features?.tempo ? Math.round(features.tempo) : null,
      energy: features?.energy ? Math.round(features.energy * 100) : null,
      // Spotify doesn't provide country/nationality in standard endpoints
      country: null 
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})