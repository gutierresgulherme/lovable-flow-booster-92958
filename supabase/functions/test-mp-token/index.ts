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
    console.log('🧪 Testando token do Mercado Pago...');

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('❌ Token não configurado');
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'MERCADO_PAGO_ACCESS_TOKEN não configurado' 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = {
      items: [{
        title: 'Teste de Token',
        quantity: 1,
        unit_price: 1.00,
        currency_id: 'BRL',
      }],
      payer: { email: 'test@test.com' },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token inválido:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          status: 'error',
          message: 'Token inválido ou sem permissões',
          details: errorText
        }), 
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('✅ Token válido e checkout testado com sucesso');

    return new Response(
      JSON.stringify({ 
        status: 'ok',
        message: 'Token válido e checkout testado com sucesso',
        init_point: data.init_point
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao testar token:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error',
        message: error?.message || 'Erro desconhecido'
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
