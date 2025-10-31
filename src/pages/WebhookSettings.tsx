import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WebhookLog {
  id: string;
  event_type: string;
  webhook_url: string;
  success: boolean;
  response_status: number | null;
  created_at: string;
  source: string;
}

const WebhookSettings = () => {
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [hasSettings, setHasSettings] = useState(false);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("webhook_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar configurações:", error);
      return;
    }

    if (data) {
      setWebhookUrl(data.webhook_url);
      setIsActive(data.is_active);
      setHasSettings(true);
    }
  };

  const loadLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("webhook_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Erro ao carregar logs:", error);
      return;
    }

    setLogs(data || []);
  };

  const handleSave = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Por favor, insira uma URL válida");
      return;
    }

    try {
      new URL(webhookUrl);
    } catch {
      toast.error("URL inválida. Por favor, insira uma URL completa (ex: https://...)");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (hasSettings) {
        const { error } = await supabase
          .from("webhook_settings")
          .update({
            webhook_url: webhookUrl,
            is_active: isActive,
          })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("webhook_settings")
          .insert({
            user_id: user.id,
            webhook_url: webhookUrl,
            is_active: isActive,
          });

        if (error) throw error;
        setHasSettings(true);
      }

      toast.success("Configurações salvas com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Salve uma URL primeiro");
      return;
    }

    setIsTesting(true);

    try {
      const { data, error } = await supabase.functions.invoke("test-webhook", {
        body: { webhook_url: webhookUrl },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Webhook testado com sucesso!");
      } else {
        toast.error(`Falha no teste: ${data.message}`);
      }

      await loadLogs();
    } catch (error: any) {
      console.error("Erro ao testar webhook:", error);
      toast.error(error.message || "Erro ao testar webhook");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-3xl">Configurações de Webhook</CardTitle>
            <CardDescription>
              Configure para receber notificações automáticas quando um pagamento for aprovado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL do Webhook</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://seu-site.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="bg-background border-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                URL que receberá as notificações de pagamento aprovado
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="webhook-active">Webhook Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Ative ou desative o envio de notificações
                </p>
              </div>
              <Switch
                id="webhook-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Configurações
              </Button>
              <Button
                onClick={handleTestWebhook}
                disabled={isTesting || !webhookUrl}
                variant="outline"
                className="flex-1"
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Testar Webhook
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Histórico de Webhooks</CardTitle>
            <CardDescription>
              Últimos 10 webhooks enviados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum webhook enviado ainda
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.success ? (
                          <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Sucesso
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="mr-1 h-3 w-3" />
                            Falhou
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{log.event_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.source === "manual_test" ? "Teste Manual" : "Mercado Pago"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebhookSettings;