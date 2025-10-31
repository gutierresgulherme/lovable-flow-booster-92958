import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users, ShoppingBag, DollarSign } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [totalAds, setTotalAds] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      
      if (!hasAdminRole) {
        toast.error("Acesso negado. Apenas administradores.");
        navigate("/dashboard");
        return;
      }

      // Load admin data
      const { data: adsData } = await supabase
        .from("ads")
        .select("id");
      
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id");

      setTotalAds(adsData?.length || 0);
      setTotalPayments(paymentsData?.length || 0);
    } catch (error) {
      console.error("Erro ao carregar dados admin:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-hero">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Painel de controle administrativo
            </p>
          </div>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{users.length}</p>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAds}</p>
                    <p className="text-sm text-muted-foreground">Total de Anúncios</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent/30 bg-card/90 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalPayments}</p>
                    <p className="text-sm text-muted-foreground">Pagamentos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;