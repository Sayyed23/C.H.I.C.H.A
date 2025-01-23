import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')

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

    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY is not configured')
      throw new Error('FIRECRAWL_API_KEY is not configured')
    }

    console.log('Making request to Firecrawl API...')
    
    const response = await fetch('https://api.firecrawl.co/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        query: query,
        num_results: 5,
        search_type: 'web',
      }),
    })

    if (!response.ok) {
      console.error('Firecrawl API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`Firecrawl API error: ${response.statusText || 'Unknown error'} (${response.status})`)
    }

    const data = await response.json()
    console.log('Firecrawl API response:', data)

    return new Response(
      JSON.stringify({ results: data.results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Web search error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})