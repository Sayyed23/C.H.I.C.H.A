import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    console.log('Auth header received:', authHeader)

    // Create a Supabase client with the auth header
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } }
      }
    )

    // Get the user from the auth header
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))

    if (userError) {
      console.error('User error:', userError)
      throw userError
    }
    if (!user) {
      console.error('No user found')
      throw new Error('No user found')
    }

    console.log('User found:', user.id)

    // Get chat history for the user
    const { data: chatHistory, error: chatError } = await supabase
      .from('chat_history')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        messages (
          id,
          content,
          is_bot,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (chatError) {
      console.error('Chat history error:', chatError)
      throw chatError
    }

    console.log('Chat history retrieved:', chatHistory)

    return new Response(JSON.stringify(chatHistory), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})