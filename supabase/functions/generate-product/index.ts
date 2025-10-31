import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { productName, description, category } = await req.json();
    const openAIApiKey = Deno.env.get('VITE_OPENAI_API_KEY');

    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are an e-commerce product specialist. Based on the following product information, generate optimized content for an online marketplace:

Product Name: ${productName}
Description: ${description || 'No description provided'}
Category: ${category || 'General'}

Please provide:
1. An optimized SEO-friendly title (max 80 characters)
2. A persuasive product description for e-commerce (150-200 words)
3. 5-8 relevant tags/keywords
4. A suggested base price in BRL (Brazilian Reais) with brief justification

Format your response as JSON with keys: title, description, tags (array), basePrice (number), priceJustification`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert e-commerce product content writer. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to generate product content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Try to parse JSON from the response
    let productData;
    try {
      productData = JSON.parse(content);
    } catch (e) {
      // If not valid JSON, extract data manually
      productData = {
        title: productName,
        description: content,
        tags: [],
        basePrice: 0,
        priceJustification: 'Could not parse price information'
      };
    }

    // Generate image prompts for Runway.ai
    const imagePrompts = [
      `${productName}, product photography, minimalist white studio background, soft professional lighting, high resolution, 4k`,
      `${productName} in lifestyle setting, modern home interior, natural lighting, cozy atmosphere, product placement`,
      `cinematic close-up of ${productName}, shallow depth of field, soft focus background, dramatic lighting, professional photography`,
      `creative marketing shot of ${productName}, vibrant gradient background, dynamic composition, modern advertising style`,
      `e-commerce banner composition with ${productName} centered, clean minimal background, product showcase, commercial photography`
    ];

    // Generate video prompts for Runway.ai
    const videoPrompts = [
      `short cinematic product showcase of ${productName}, rotating on a white pedestal, soft studio lighting, 360 degree view, slow motion`,
      `lifestyle video of ${productName} being used by a person in modern home setting, natural movements, warm atmosphere`,
      `macro slow motion video showing ${productName} details, dramatic side lighting, shallow depth of field, cinematic quality`,
      `animated hero shot for ${productName} e-commerce advertisement, dynamic camera movement, professional product video`,
      `vertical social media video of ${productName}, dynamic camera movements, modern editing style, attention-grabbing composition`
    ];

    return new Response(
      JSON.stringify({
        ...productData,
        imagePrompts,
        videoPrompts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-product function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
