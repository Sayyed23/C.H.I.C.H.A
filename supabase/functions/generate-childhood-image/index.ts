
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      description, style, era, mood, gender, customGender, 
      age, location, season, timeOfDay, weather, 
      activity, companions, specialObject 
    } = await req.json();
    
    console.log('Generating childhood memory image with prompt:', description);
    
    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      console.error('OPENAI_API_KEY is not set in environment variables');
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Process gender input - use custom gender if gender is set to "Custom"
    const actualGender = gender === "Custom" && customGender?.trim() 
      ? customGender.trim() 
      : gender;

    // Build the enhanced prompt
    let promptParts = ["A stunning visualization of a treasured childhood memory"];

    // Add child details if specified
    if (actualGender !== "Not specified" && age !== "Not specified") {
      promptParts[0] += `, featuring a ${age}-year-old ${actualGender.toLowerCase()} child`;
    } else if (actualGender !== "Not specified") {
      promptParts[0] += `, featuring a ${actualGender.toLowerCase()} child`;
    } else if (age !== "Not specified") {
      promptParts[0] += `, featuring a ${age}-year-old child`;
    }

    // Add location with appropriate context
    if (location !== "Not specified") {
      const locationPrefix = ["Beach", "Forest", "Mountains", "Lake", "Amusement park", "Neighborhood", "City streets", "Farm", "Campsite"]
        .includes(location) ? "at a" : "at the";
      
      if (location === "Grandparents' house") {
        promptParts.push("at grandparents' house");
      } else {
        promptParts.push(`${locationPrefix} ${location.toLowerCase()}`);
      }
    }

    // Add time context
    const timeContext = [];
    if (season !== "Not specified") {
      if (season === "Summer") {
        timeContext.push("during warm summer days");
      } else if (season === "Fall/Autumn") {
        timeContext.push("during colorful autumn days");
      } else if (season === "Winter") {
        timeContext.push("during cold winter days");
      } else if (season === "Spring") {
        timeContext.push("during blooming spring days");
      }
    }

    if (timeOfDay !== "Not specified") {
      if (timeOfDay === "Golden hour") {
        timeContext.push("bathed in golden sunlight");
      } else if (timeOfDay === "Sunrise") {
        timeContext.push("as the sun rises on the horizon");
      } else if (timeOfDay === "Sunset") {
        timeContext.push("as the sun sets with orange and purple hues");
      } else {
        timeContext.push(`during the ${timeOfDay.toLowerCase()}`);
      }
    }

    // Add weather details
    if (weather !== "Not specified") {
      if (weather === "Sunny") {
        timeContext.push("under bright sunshine");
      } else if (weather === "Cloudy") {
        timeContext.push("under a sky dotted with fluffy clouds");
      } else if (weather === "Rainy") {
        timeContext.push("with gentle rain creating puddles");
      } else if (weather === "Snowy") {
        timeContext.push("with snowflakes gently falling");
      } else if (weather === "Foggy") {
        timeContext.push("enveloped in a mysterious fog");
      } else if (weather === "Stormy") {
        timeContext.push("with dramatic storm clouds overhead");
      } else if (weather === "Windy") {
        timeContext.push("with wind gently tousling hair and clothes");
      }
    }

    if (timeContext.length > 0) {
      promptParts.push(timeContext.join(", "));
    }

    // Add activity and companions
    const activityDetails = [];
    if (activity !== "Not specified") {
      if (["Playing", "Reading", "Swimming", "Biking", "Running", "Drawing", "Building"].includes(activity)) {
        activityDetails.push(`${activity.toLowerCase()} with joy and excitement`);
      } else if (activity === "Celebrating") {
        activityDetails.push("celebrating with excitement and happiness");
      } else if (activity === "Learning") {
        activityDetails.push("learning with curiosity and wonder");
      } else if (activity === "Exploring") {
        activityDetails.push("exploring with curiosity and adventure");
      } else if (activity === "Eating") {
        activityDetails.push("enjoying delicious childhood treats");
      } else if (activity === "Opening presents") {
        activityDetails.push("excitedly opening presents with wonder");
      } else if (activity === "Camping") {
        activityDetails.push("camping under the stars");
      } else if (activity === "Gardening") {
        activityDetails.push("gardening with tiny hands in the soil");
      } else if (activity === "Dancing") {
        activityDetails.push("dancing with carefree joy");
      } else if (activity === "Singing") {
        activityDetails.push("singing with childlike enthusiasm");
      } else if (activity === "Playing sports") {
        activityDetails.push("playing sports with determination");
      } else if (activity === "Playing video games") {
        activityDetails.push("engrossed in playing video games");
      }
    }

    // Add companions
    if (companions !== "Not specified") {
      if (companions === "Family") {
        activityDetails.push("surrounded by loving family members");
      } else if (companions === "Friends") {
        activityDetails.push("alongside laughing childhood friends");
      } else if (companions === "Parents") {
        activityDetails.push("with attentive parents nearby");
      } else if (companions === "Siblings") {
        activityDetails.push("with playful siblings");
      } else if (companions === "Grandparents") {
        activityDetails.push("with wise and caring grandparents");
      } else if (companions === "Cousins") {
        activityDetails.push("with fun-loving cousins");
      } else if (companions === "Classmates") {
        activityDetails.push("among energetic classmates");
      } else if (companions === "Pet") {
        activityDetails.push("with a beloved childhood pet");
      } else if (companions === "Best friend") {
        activityDetails.push("sharing moments with a best friend");
      } else if (companions === "Alone") {
        activityDetails.push("in a peaceful moment of solitude");
      }
    }

    // Add special object
    if (specialObject !== "Not specified") {
      if (["Teddy bear", "Doll", "Action figure"].includes(specialObject)) {
        activityDetails.push(`with a cherished ${specialObject.toLowerCase()}`);
      } else if (["Bicycle", "Skateboard"].includes(specialObject)) {
        activityDetails.push(`with a beloved ${specialObject.toLowerCase()}`);
      } else if (["Ball", "Kite"].includes(specialObject)) {
        activityDetails.push(`with a colorful ${specialObject.toLowerCase()}`);
      } else if (specialObject === "Console/Video game") {
        activityDetails.push("with a favorite video game console");
      } else if (specialObject === "Book") {
        activityDetails.push("with a treasured storybook");
      } else if (specialObject === "Musical instrument") {
        activityDetails.push("with a childhood musical instrument");
      } else if (specialObject === "Camera") {
        activityDetails.push("with a camera capturing memories");
      } else if (specialObject === "Art supplies") {
        activityDetails.push("with colorful art supplies");
      } else if (specialObject === "Blanket fort") {
        activityDetails.push("inside a magical blanket fort");
      } else if (specialObject === "Tree house") {
        activityDetails.push("in a secret tree house");
      } else if (specialObject === "Swing set") {
        activityDetails.push("on a creaking swing set");
      } else if (specialObject === "Sand box") {
        activityDetails.push("playing in a sandy sandbox");
      } else if (specialObject === "Flashlight") {
        activityDetails.push("with a beam of light from a flashlight");
      } else if (specialObject === "Board game") {
        activityDetails.push("around a fun board game");
      } else if (specialObject === "Trading cards") {
        activityDetails.push("with prized trading cards");
      } else if (specialObject === "Sports equipment") {
        activityDetails.push("with favorite sports equipment");
      }
    }

    if (activityDetails.length > 0) {
      promptParts.push(activityDetails.join(", "));
    }

    // Add era-specific details
    if (era !== "Not specified") {
      if (era === "1970s") {
        promptParts.push("with authentic 1970s details, fashion, and atmosphere");
      } else if (era === "1980s") {
        promptParts.push("with vibrant 1980s colors, style, and pop culture elements");
      } else if (era === "1990s") {
        promptParts.push("with nostalgic 1990s aesthetics, technology, and fashion");
      } else if (era === "2000s") {
        promptParts.push("with characteristic early 2000s style, gadgets, and trends");
      } else if (era === "2010s") {
        promptParts.push("with modern 2010s technology, fashion, and environment");
      }
    }

    // Add user's specific description
    if (description && description.trim()) {
      promptParts.push(description.trim());
    }

    // Add style specification
    let styleSpec = "";
    if (style !== "Default") {
      if (style === "Watercolor") {
        styleSpec = "rendered in delicate watercolor with soft edges and translucent colors";
      } else if (style === "Oil painting") {
        styleSpec = "portrayed as a rich oil painting with textured brushstrokes and depth";
      } else if (style === "Photography") {
        styleSpec = "captured like a professional photograph with perfect focus and lighting";
      } else if (style === "Anime") {
        styleSpec = "illustrated in expressive anime style with characteristic lines and colors";
      } else if (style === "Pixar") {
        styleSpec = "rendered in the heartwarming 3D style of Pixar animation";
      } else if (style === "Vintage film") {
        styleSpec = "captured on vintage film with gentle grain and classic color grading";
      } else if (style === "Dreamy illustration") {
        styleSpec = "depicted as a dreamy illustration with soft focus and ethereal qualities";
      }
      
      if (styleSpec) {
        promptParts.push(styleSpec);
      }
    }

    // Add mood specification
    let moodSpec = "";
    if (mood !== "Default") {
      if (mood === "Warm") {
        moodSpec = "radiating warmth, comfort and security";
      } else if (mood === "Nostalgic") {
        moodSpec = "evoking powerful nostalgia and sweet melancholy";
      } else if (mood === "Playful") {
        moodSpec = "filled with playfulness, laughter and joy";
      } else if (mood === "Serene") {
        moodSpec = "exuding serenity, peace and tranquility";
      } else if (mood === "Exciting") {
        moodSpec = "bursting with excitement, energy and adventure";
      } else if (mood === "Magical") {
        moodSpec = "infused with childlike wonder and magical atmosphere";
      }
      
      if (moodSpec) {
        promptParts.push(moodSpec);
      }
    }

    // Join all parts with appropriate punctuation
    const fullPrompt = promptParts.join(". ");

    // Add quality enhancers
    const qualityDescriptors = [
      "highly detailed", "intricate", "crisp", "sharp focus", "dramatic lighting",
      "emotive", "cinematic", "professional", "photorealistic", "masterful"
    ];

    const technicalSpecs = [
      "Ultra HD details", "perfect composition", "golden ratio", "award-winning photography",
      "masterful use of light and shadow", "striking color palette", "photorealistic rendering",
      "8K resolution", "childhood wonder preserved in visual form"
    ];

    // Select random quality descriptors
    const getRandomItems = (arr, count) => {
      const result = [];
      const copy = [...arr];
      for (let i = 0; i < count && copy.length > 0; i++) {
        const index = Math.floor(Math.random() * copy.length);
        result.push(copy[index]);
        copy.splice(index, 1);
      }
      return result;
    };

    const selectedSpecs = getRandomItems(technicalSpecs, 4);
    const selectedQuality = getRandomItems(qualityDescriptors, 3);
    
    const enhancedPrompt = `${fullPrompt}. ${selectedQuality.join(", ")}. ${selectedSpecs.join(", ")}.`;
    
    console.log('Enhanced prompt:', enhancedPrompt);

    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard"
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API error response:', error);
      throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('OpenAI API response received successfully');
    
    if (!data.data || data.data.length === 0 || !data.data[0].url) {
      console.error('No image URL in response data:', data);
      throw new Error('No image URL in response data');
    }

    return new Response(
      JSON.stringify({ imageUrl: data.data[0].url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-childhood-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'generation_error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
