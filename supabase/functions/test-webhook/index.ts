import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { webhook_url } = await req.json();
    console.log('🧪 Testando webhook:', webhook_url);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const testPayload = {
      event_type: 'test',
      payment_id: 'test_' + Date.now(),
      email: user.email,
      amount: 39.00,
      status: 'test',
      payment_method: 'test',
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Enviando payload de teste:', testPayload);

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const responseBody = await response.text();
    const truncatedBody = responseBody.substring(0, 1000);

    console.log(`📡 Resposta: ${response.status}`);

    const supabaseService = createClient(
      supabaseUrl, 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseService.from('webhook_logs').insert({
      user_id: user.id,
      event_type: 'test',
      webhook_url: webhook_url,
      success: response.ok,
      response_status: response.status,
      response_body: truncatedBody,
      source: 'manual_test',
    });

    return new Response(JSON.stringify({ 
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Webhook testado com sucesso!' : 'Falha no teste do webhook',
      response: truncatedBody,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro ao testar webhook:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
