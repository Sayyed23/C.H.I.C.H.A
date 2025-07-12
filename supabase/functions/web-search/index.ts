import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY')
const GOOGLE_SEARCH_CX = Deno.env.get('GOOGLE_SEARCH_CX')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    console.log('Received search query:', query)

    if (!query) {
      throw new Error('Query is required')
    }

    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
      console.error('Google Search API credentials not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Web search service is currently unavailable',
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    console.log('Making request to Google Custom Search API...')
    
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_CX}&q=${encodeURIComponent(query)}&num=5`
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.error('Google Search API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Search service temporarily unavailable',
          results: []
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const data = await response.json()
    console.log('Google Search API response:', data)

    // Transform Google Search results to match expected format
    const results = data.items ? data.items.map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      domain: new URL(item.link).hostname
    })) : []

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Web search error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Search service temporarily unavailable',
        results: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})