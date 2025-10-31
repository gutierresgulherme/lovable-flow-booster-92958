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
    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    const openaiKey = Deno.env.get('VITE_OPENAI_API_KEY');

    const health = {
      ok: true,
      timestamp: new Date().toISOString(),
      services: {
        mp: !!mercadoPagoToken,
        openai: !!openaiKey,
      },
      warnings: [] as string[],
    };

    if (!mercadoPagoToken) {
      health.warnings.push('MERCADO_PAGO_ACCESS_TOKEN não configurado');
    }
    if (!openaiKey) {
      health.warnings.push('VITE_OPENAI_API_KEY não configurado (IA desabilitada)');
    }

    console.log('🏥 Health check:', health);

    return new Response(
      JSON.stringify(health), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no health check:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error?.message || 'Erro desconhecido',
        timestamp: new Date().toISOString(),
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
