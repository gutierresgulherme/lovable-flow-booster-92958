import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, LogOut, Sparkles, TrendingUp, ShoppingBag, Crown, Settings } from "lucide-react";

interface Ad {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      setIsAdmin(hasAdminRole || false);

      // Load user's ads
      const { data: adsData, error } = await (supabase as any)
        .from("ads")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAds(adsData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar seus anúncios");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado");
      navigate("/auth");
    } catch (error) {
      toast.error("Erro ao fazer logout");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Meu Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie seus anúncios e configurações
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/webhook-settings")}
              variant="outline"
              className="border-secondary/50"
            >
              <Settings className="mr-2 h-4 w-4" />
              Webhook
            </Button>
            {isAdmin && (
              <Button
                onClick={() => navigate("/admin-dashboard")}
                variant="outline"
                className="border-accent/50"
              >
                <Crown className="mr-2 h-4 w-4" />
                Admin
              </Button>
            )}
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ads.length}</p>
                  <p className="text-sm text-muted-foreground">Anúncios Criados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">∞</p>
                  <p className="text-sm text-muted-foreground">Gerações Ilimitadas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/30 bg-card/90 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">IA</p>
                  <p className="text-sm text-muted-foreground">Tecnologia Avançada</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Seus Anúncios</CardTitle>
                <CardDescription>Gerencie todos os seus anúncios</CardDescription>
              </div>
              <Button
                onClick={() => navigate("/create")}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo Anúncio
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Carregando...
              </div>
            ) : ads.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não criou nenhum anúncio
                </p>
                <Button
                  onClick={() => navigate("/create")}
                  className="bg-gradient-primary hover:opacity-90"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Anúncio
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {ads.map((ad) => (
                  <Card key={ad.id} className="border-border/50 bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{ad.title}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {ad.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {ad.keywords?.map((keyword: string, i: number) => (
                              <Badge
                                key={i}
                                variant="secondary"
                                className="text-xs"
                              >
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge
                          variant={ad.status === "published" ? "default" : "secondary"}
                        >
                          {ad.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;