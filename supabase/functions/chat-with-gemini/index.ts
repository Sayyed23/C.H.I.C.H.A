import { createClient } from 'https://esm.sh/@google/generative-ai@0.1.3'
import { corsHeaders } from '../_shared/cors.ts'

console.log('Function chat-with-gemini started')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, imageUrl } = await req.json()
    console.log('Received request with prompt:', prompt, 'and image:', imageUrl)

    const genAI = new createClient(Deno.env.get('GEMINI_API_KEY') || '')
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let response
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl)
      const imageData = await imageResponse.blob()
      
      const visionModel = genAI.getGenerativeModel({ model: 'gemini-pro-vision' })
      response = await visionModel.generateContent([prompt, imageData])
    } else {
      response = await model.generateContent(prompt)
    }

    const result = await response.response.text()
    console.log('Generated response:', result)

    return new Response(
      JSON.stringify({ response: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in chat-with-gemini:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})