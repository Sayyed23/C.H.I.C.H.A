import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { prompt, imageUrl } = await req.json()
    console.log('Editing image with prompt:', prompt)
    console.log('Source image URL:', imageUrl)

    if (!prompt || !imageUrl) {
      throw new Error('Missing required parameters: prompt and imageUrl')
    }

    const runwareApiKey = Deno.env.get('RUNWARE_API_KEY')
    if (!runwareApiKey) {
      throw new Error('RUNWARE_API_KEY is not set')
    }

    // Download the image and convert it to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`)
    }

    const imageBlob = await imageResponse.blob()
    const imageBuffer = await imageBlob.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Enhance the prompt for better image editing results
    const enhancedPrompt = `Edit this image according to the following instructions: ${prompt}. Keep the main subject and composition intact while applying the requested changes.`

    console.log('Making request to Runware API with enhanced prompt:', enhancedPrompt)
    
    const requestBody = JSON.stringify([
      {
        taskType: "authentication",
        apiKey: runwareApiKey
      },
      {
        taskType: "imageInference",
        taskUUID: crypto.randomUUID(),
        positivePrompt: enhancedPrompt,
        width: 1024,
        height: 1024,
        model: "runware:100@1",
        numberResults: 1,
        outputFormat: "WEBP",
        CFGScale: 7.5,
        scheduler: "FlowMatchEulerDiscreteScheduler",
        strength: 0.75,
        initImage: `data:image/jpeg;base64,${base64Image}`
      }
    ])

    console.log('Sending request to Runware API...')
    const runwareResponse = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody
    })

    if (!runwareResponse.ok) {
      const errorData = await runwareResponse.json()
      console.error('Runware API error response:', errorData)
      throw new Error(`Runware API error: ${JSON.stringify(errorData)}`)
    }

    const data = await runwareResponse.json()
    console.log('Runware API response:', data)

    const imageData = data.data?.find((item: any) => item.taskType === "imageInference")
    
    if (!imageData?.imageURL) {
      throw new Error('No image URL in response')
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: imageData.imageURL,
        prompt: enhancedPrompt 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error in edit-image function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'generation_error'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})