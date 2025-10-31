import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function sendWebhook(webhookUrl: string, payload: any, userId: string): Promise<{ success: boolean; status: number; body: string }> {
  let lastError = null;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/3 de enviar webhook para:`, webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      const truncatedBody = responseBody.substring(0, 1000);

      console.log(`📡 Webhook enviado - Status: ${response.status}`);

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      await supabase.from('webhook_logs').insert({
        user_id: userId,
        event_type: payload.event_type,
        webhook_url: webhookUrl,
        success: response.ok,
        response_status: response.status,
        response_body: truncatedBody,
        source: 'mercado_pago',
      });

      if (response.ok) {
        return { success: true, status: response.status, body: truncatedBody };
      }

      lastError = { success: false, status: response.status, body: truncatedBody };
      
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } catch (error: any) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
      lastError = { success: false, status: 0, body: error?.message || 'Erro desconhecido' };
      
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return lastError || { success: false, status: 0, body: 'Falha após 3 tentativas' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('📬 Webhook recebido:', JSON.stringify(body, null, 2));

    const { type, data } = body;

    if (type !== 'payment') {
      console.log('ℹ️ Tipo ignorado:', type);
      return new Response(JSON.stringify({ message: 'Tipo de evento ignorado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error('❌ Payment ID não encontrado');
      return new Response(JSON.stringify({ error: 'Payment ID não encontrado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('❌ Token MP não configurado');
      return new Response(JSON.stringify({ error: 'Token não configurado' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('🔍 Buscando detalhes do pagamento:', paymentId);
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}` },
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('❌ Erro ao buscar pagamento:', errorText);
      return new Response(JSON.stringify({ error: 'Erro ao buscar pagamento' }), {
        status: paymentResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payment = await paymentResponse.json();
    console.log('💳 Pagamento:', {
      id: payment.id,
      status: payment.status,
      email: payment.payer?.email,
      amount: payment.transaction_amount,
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert payment
    const { error: paymentError } = await supabase.from('payments').upsert({
      payment_id: payment.id.toString(),
      email: payment.payer?.email || payment.external_reference,
      status: payment.status,
      amount: payment.transaction_amount,
      payment_method: payment.payment_type_id || payment.payment_method_id,
    }, { onConflict: 'payment_id' });

    if (paymentError) {
      console.error('❌ Erro ao salvar pagamento:', paymentError);
    } else {
      console.log('✅ Pagamento salvo/atualizado');
    }

    // Se aprovado, atualizar premium
    if (payment.status === 'approved') {
      console.log('🎉 Pagamento aprovado! Ativando premium...');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', payment.payer?.email);

      if (profiles && profiles.length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ is_premium: true })
          .eq('user_id', profiles[0].user_id);

        if (profileError) {
          console.error('❌ Erro ao atualizar perfil:', profileError);
        } else {
          console.log('✅ Perfil premium ativado');
        }
      }

      // Buscar webhook settings do usuário
      const { data: webhookSettings } = await supabase
        .from('webhook_settings')
        .select('webhook_url, is_active, user_id')
        .eq('is_active', true)
        .maybeSingle();

      if (webhookSettings?.webhook_url) {
        console.log('📤 Enviando para webhook do usuário...');
        
        const webhookPayload = {
          event_type: 'payment_success',
          payment_id: payment.id.toString(),
          email: payment.payer?.email || payment.external_reference,
          amount: payment.transaction_amount,
          status: payment.status,
          payment_method: payment.payment_type_id || payment.payment_method_id,
          timestamp: new Date().toISOString(),
        };

        await sendWebhook(webhookSettings.webhook_url, webhookPayload, webhookSettings.user_id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Erro geral no webhook:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Erro desconhecido' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
