import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Users, ShoppingBag, DollarSign, Trash2, RefreshCw } from "lucide-react";

interface User {
  id: string;
  email: string;
  created_at: string;
  full_name: string | null;
  is_premium: boolean;
}

interface Product {
  id: string;
  title: string;
  created_at: string;
  user_id: string;
  category: string | null;
  base_price: number | null;
  profiles: { email: string } | null;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

      // Check if user is admin using server-side function
      const { data: roles } = await (supabase as any)
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAdminRole = roles?.some((r: any) => r.role === "admin");
      
      if (!hasAdminRole) {
        toast.error("Acesso negado. Apenas administradores.");
        navigate("/dashboard");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Erro ao carregar dados admin:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load all users with their profiles
      const { data: usersData } = await (supabase as any)
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          is_premium,
          created_at
        `);

      // Get emails from auth.users metadata
      const usersWithEmails = await Promise.all(
        (usersData || []).map(async (profile: any) => {
          const { data: { user } } = await supabase.auth.admin.getUserById(profile.user_id);
          return {
            id: profile.user_id,
            email: user?.email || "N/A",
            created_at: profile.created_at,
            full_name: profile.full_name,
            is_premium: profile.is_premium || false,
          };
        })
      );

      setUsers(usersWithEmails);

      // Load all products
      const { data: productsData } = await (supabase as any)
        .from("products")
        .select(`
          id,
          title,
          created_at,
          user_id,
          category,
          base_price,
          profiles!inner(user_id)
        `)
        .order("created_at", { ascending: false });

      setProducts(productsData || []);

      // Load ads count
      const { data: adsData } = await (supabase as any)
        .from("ads")
        .select("id");
      
      setTotalAds(adsData?.length || 0);

      // Load payments count
      const { data: paymentsData } = await (supabase as any)
        .from("payments")
        .select("id");

      setTotalPayments(paymentsData?.length || 0);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await (supabase as any)
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Produto excluído com sucesso!");
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast.error("Erro ao excluir produto");
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
    toast.success("Dados atualizados!");
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
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                      <p className="text-2xl font-bold">{products.length}</p>
                      <p className="text-sm text-muted-foreground">Produtos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-accent/30 bg-card/90 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <ShoppingBag className="h-6 w-6 text-accent" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalAds}</p>
                      <p className="text-sm text-muted-foreground">Anúncios</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalPayments}</p>
                      <p className="text-sm text-muted-foreground">Pagamentos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card className="border-primary/30 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Usuários Cadastrados ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{user.full_name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Cadastrado em: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.is_premium && (
                          <Badge variant="secondary">Premium</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="border-secondary/30 bg-card/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Produtos Criados ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold">{product.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {product.category && (
                            <Badge variant="outline">{product.category}</Badge>
                          )}
                          {product.base_price && (
                            <span className="text-sm text-primary font-semibold">
                              R$ {product.base_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em: {new Date(product.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
