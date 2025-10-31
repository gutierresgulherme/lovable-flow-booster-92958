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
    const { title, keywords, targetAudience } = await req.json();
    console.log('🤖 Gerando descrição para:', title);

    const OPENAI_API_KEY = Deno.env.get('VITE_OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY não configurado');
      return new Response(
        JSON.stringify({ 
          error: 'API Key do ChatGPT não configurada',
          description: 'Configure a chave de API para usar a IA'
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `Crie uma descrição persuasiva e otimizada para SEO para um produto da Shopee com as seguintes informações:

Título: ${title}
Palavras-chave: ${keywords?.join(', ') || 'N/A'}
Público-alvo: ${targetAudience || 'Geral'}

A descrição deve:
- Ser atraente e convincente
- Incluir as palavras-chave naturalmente
- Destacar benefícios do produto
- Ter entre 150-250 palavras
- Usar formatação com emojis relevantes
- Incluir call-to-action ao final

Retorne apenas a descrição, sem introdução ou explicação.`;

    console.log('📤 Enviando para OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em copywriting para e-commerce, especialmente Shopee. Cria descrições persuasivas e otimizadas para SEO.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro OpenAI:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar descrição', details: errorText }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const description = data.choices[0].message.content;
    
    console.log('✅ Descrição gerada com sucesso');

    return new Response(
      JSON.stringify({ description }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
