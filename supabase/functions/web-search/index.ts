
// @deno-types="https://deno.land/std@0.208.0/http/server.ts"
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// API Keys for different search engines
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')
const GOOGLE_SEARCH_API_KEY = Deno.env.get('GOOGLE_SEARCH_API_KEY')
const GOOGLE_SEARCH_CX = Deno.env.get('GOOGLE_SEARCH_CX')
const BING_SEARCH_API_KEY = Deno.env.get('BING_SEARCH_API_KEY')
const DUCKDUCKGO_API_KEY = Deno.env.get('DUCKDUCKGO_API_KEY') // Not strictly required for many DDG endpoints

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query, engine = 'firecrawl' } = await req.json()
    console.log(`Received search query for ${engine}:`, query)

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a non-empty string' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    let results = []

    // Choose search engine based on the specified engine parameter
    switch (engine.toLowerCase()) {
      case 'google':
        if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
          console.log('Google Search API key or CX ID is not configured')
          // Fall back to firecrawl if Google keys are not available
          if (FIRECRAWL_API_KEY) {
            console.log('Falling back to Firecrawl search')
            results = await performFirecrawlSearch(query)
          } else {
            throw new Error('No search API keys are configured')
          }
        } else {
          results = await performGoogleSearch(query)
        }
        break
      
      case 'bing':
        if (!BING_SEARCH_API_KEY) {
          console.log('Bing Search API key is not configured')
          // Fall back to firecrawl if Bing key is not available
          if (FIRECRAWL_API_KEY) {
            console.log('Falling back to Firecrawl search')
            results = await performFirecrawlSearch(query)
          } else {
            throw new Error('No search API keys are configured')
          }
        } else {
          results = await performBingSearch(query)
        }
        break
      
      case 'duckduckgo':
        results = await performDuckDuckGoSearch(query)
        break
      
      case 'firecrawl':
      default:
        if (!FIRECRAWL_API_KEY) {
          // Try to find any available search API
          if (GOOGLE_SEARCH_API_KEY && GOOGLE_SEARCH_CX) {
            console.log('Falling back to Google search')
            results = await performGoogleSearch(query)
          } else if (BING_SEARCH_API_KEY) {
            console.log('Falling back to Bing search')
            results = await performBingSearch(query)
          } else {
            console.log('Falling back to DuckDuckGo search')
            results = await performDuckDuckGoSearch(query)
          }
        } else {
          results = await performFirecrawlSearch(query)
        }
    }

    // If we have no results and none of the search engines worked
    if (results.length === 0) {
      console.log('No search results found')
      // Return empty results but with 200 status
      return new Response(
        JSON.stringify({ 
          results: [], 
          engine,
          message: "No search results found for your query."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`${engine} search returned ${results.length} results`)

    return new Response(
      JSON.stringify({ results, engine }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Web search error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        results: [],
        engine: 'error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Return 200 even on errors, but include error info in the response
      }
    )
  }
})

async function performFirecrawlSearch(query) {
  console.log('Making request to Firecrawl API...')
  
  try {
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY is not configured')
    }
    
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
    return data.results || []
  } catch (error) {
    console.error('Firecrawl search error:', error)
    return []
  }
}

async function performGoogleSearch(query) {
  console.log('Making request to Google Custom Search API...')
  
  try {
    if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_CX) {
      throw new Error('Google Search API key or CX ID is not configured')
    }
    
    const url = new URL('https://www.googleapis.com/customsearch/v1')
    url.searchParams.append('key', GOOGLE_SEARCH_API_KEY)
    url.searchParams.append('cx', GOOGLE_SEARCH_CX)
    url.searchParams.append('q', query)
    
    const response = await fetch(url.toString())
    
    if (!response.ok) {
      console.error('Google Search API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`Google Search API error: ${response.statusText || 'Unknown error'} (${response.status})`)
    }
    
    const data = await response.json()
    
    if (!data.items || !Array.isArray(data.items)) {
      console.log('No Google search results')
      return []
    }
    
    // Transform Google search results to a consistent format
    return data.items.map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      domain: new URL(item.link).hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(item.link).hostname}&sz=128`,
    }))
  } catch (error) {
    console.error('Google search error:', error)
    return []
  }
}

async function performBingSearch(query) {
  console.log('Making request to Bing Search API...')
  
  try {
    if (!BING_SEARCH_API_KEY) {
      throw new Error('Bing Search API key is not configured')
    }
    
    const response = await fetch('https://api.bing.microsoft.com/v7.0/search?q=' + encodeURIComponent(query), {
      headers: {
        'Ocp-Apim-Subscription-Key': BING_SEARCH_API_KEY
      }
    })
    
    if (!response.ok) {
      console.error('Bing Search API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`Bing Search API error: ${response.statusText || 'Unknown error'} (${response.status})`)
    }
    
    const data = await response.json()
    
    if (!data.webPages || !data.webPages.value || !Array.isArray(data.webPages.value)) {
      console.log('No Bing search results')
      return []
    }
    
    // Transform Bing search results to a consistent format
    return data.webPages.value.map(item => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet,
      domain: new URL(item.url).hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=128`,
    }))
  } catch (error) {
    console.error('Bing search error:', error)
    return []
  }
}

async function performDuckDuckGoSearch(query) {
  console.log('Making request to DuckDuckGo Instant Answer API...')
  
  try {
    // DuckDuckGo Instant Answer API requires no API key for basic functionality
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error('DuckDuckGo API error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      throw new Error(`DuckDuckGo API error: ${response.statusText || 'Unknown error'} (${response.status})`)
    }
    
    const data = await response.json()
    
    // Create a consistent format from DDG results
    const results = []
    
    // Add the main Abstract result if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || 'Abstract',
        url: data.AbstractURL,
        snippet: data.Abstract,
        domain: data.AbstractURL ? new URL(data.AbstractURL).hostname : 'duckduckgo.com',
        favicon: `https://www.google.com/s2/favicons?domain=${data.AbstractURL ? new URL(data.AbstractURL).hostname : 'duckduckgo.com'}&sz=128`,
      })
    }
    
    // Add related topics
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 4).forEach(topic => {
        if (topic.Result && topic.FirstURL) {
          // Extract text from HTML
          const text = topic.Text || topic.Result.replace(/<[^>]*>/g, '')
          
          results.push({
            title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
            url: topic.FirstURL,
            snippet: text,
            domain: new URL(topic.FirstURL).hostname,
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(topic.FirstURL).hostname}&sz=128`,
          })
        }
      })
    }
    
    return results
  } catch (error) {
    console.error('DuckDuckGo search error:', error)
    return []
  }
}
