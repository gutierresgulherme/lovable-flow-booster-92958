import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowLeft, Calculator } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Campos do produto
  const [productName, setProductName] = useState("");
  const [productCost, setProductCost] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [desiredMargin, setDesiredMargin] = useState("");

  // Taxas Shopee
  const [freeShipping, setFreeShipping] = useState("no");
  const [fixedFee, setFixedFee] = useState("high");

  // IA fields
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");

  // Cálculo do preço final
  const [finalPrice, setFinalPrice] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  // Cálculo automático do preço final
  useEffect(() => {
    if (!productCost || !taxRate || !desiredMargin) {
      setFinalPrice(0);
      return;
    }

    const cost = parseFloat(productCost);
    const tax = parseFloat(taxRate);
    const margin = parseFloat(desiredMargin);
    const commission = freeShipping === "yes" ? 20 : 14;
    const fixed = fixedFee === "low" ? 2 : 4;

    const calculatedPrice = cost + (cost * margin / 100) + fixed + (cost * commission / 100) + (cost * tax / 100);
    setFinalPrice(calculatedPrice);
  }, [productCost, taxRate, desiredMargin, freeShipping, fixedFee]);

  const handleClear = () => {
    setProductName("");
    setProductCost("");
    setTaxRate("");
    setDesiredMargin("");
    setFreeShipping("no");
    setFixedFee("high");
    setKeywords("");
    setTargetAudience("");
    setGeneratedDescription("");
    setFinalPrice(0);
    toast.info("Campos limpos com sucesso!");
  };

  const handleGenerateAd = () => {
    if (!productName.trim()) {
      toast.error("Preencha o nome do produto");
      return;
    }
    if (finalPrice === 0) {
      toast.error("Preencha todos os campos obrigatórios para calcular o preço");
      return;
    }
    toast.success("Anúncio gerado com sucesso!");
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error("Adicione o nome do produto");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad", {
        body: {
          title: productName,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          targetAudience,
        },
      });

      if (error) throw error;
      setGeneratedDescription(data.description);
      toast.success("Descrição gerada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar descrição");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!productName.trim() || !generatedDescription.trim()) {
      toast.error("Nome do produto e descrição são obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("ads").insert({
        user_id: user.id,
        title: productName,
        description: generatedDescription,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        target_audience: targetAudience,
        status: "published",
      });

      if (error) throw error;
      toast.success("Anúncio salvo com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar anúncio");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-hero">
      <div className="w-full max-w-[95%] sm:max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="border-primary/30 backdrop-blur-sm bg-card/90 shadow-[0_0_30px_rgba(251,146,60,0.15)]">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl sm:text-3xl">Calculadora de Preços Shopee</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Calcule o preço ideal considerando custos, impostos e taxas da plataforma
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grid de campos principais */}
            <div className="grid grid-cols-1 gap-6">
              {/* Nome do Produto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="productName" className="text-base sm:text-sm">
                    Nome do Produto <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="productName"
                    placeholder="Ex: Fone de Ouvido Bluetooth TWS"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </CardContent>
              </Card>

              {/* Custo do Produto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="productCost" className="text-base sm:text-sm">
                    Custo do Produto (R$) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="productCost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={productCost}
                    onChange={(e) => setProductCost(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </CardContent>
              </Card>

              {/* Alíquota de Imposto */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="taxRate" className="text-base sm:text-sm">
                    Alíquota de Imposto (%) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </CardContent>
              </Card>

              {/* Margem Desejada */}
              <Card className="border-border/50 bg-muted/30">
                <CardContent className="pt-6 space-y-2">
                  <Label htmlFor="desiredMargin" className="text-base sm:text-sm">
                    Margem Desejada (%) <span className="text-primary">*</span>
                  </Label>
                  <Input
                    id="desiredMargin"
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={desiredMargin}
                    onChange={(e) => setDesiredMargin(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Wrappers de Taxas Shopee */}
            <div className="space-y-6 pt-4">
              {/* Programa de Frete Grátis */}
              <Card className="border-secondary/30 bg-card shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <CardContent className="pt-6 space-y-4">
                  <Label className="text-base sm:text-lg font-semibold text-secondary">
                    Programa de Frete Grátis Shopee
                  </Label>
                  <RadioGroup value={freeShipping} onValueChange={setFreeShipping}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="yes" id="shipping-yes" />
                      <Label htmlFor="shipping-yes" className="cursor-pointer flex-1">
                        Sim (20% de comissão)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="no" id="shipping-no" />
                      <Label htmlFor="shipping-no" className="cursor-pointer flex-1">
                        Não (14% de comissão)
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Taxa Fixa Shopee */}
              <Card className="border-secondary/30 bg-card shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <CardContent className="pt-6 space-y-4">
                  <Label className="text-base sm:text-lg font-semibold text-secondary">
                    Selecione o tipo de taxa fixa Shopee
                  </Label>
                  <RadioGroup value={fixedFee} onValueChange={setFixedFee}>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="low" id="fee-low" />
                      <Label htmlFor="fee-low" className="cursor-pointer flex-1">
                        Produto menor que R$8 → Taxa Fixa de R$2
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="high" id="fee-high" />
                      <Label htmlFor="fee-high" className="cursor-pointer flex-1">
                        Produto maior que R$8 → Taxa Fixa de R$4
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Resultado do Cálculo */}
            {finalPrice > 0 && (
              <Card className="border-primary/50 bg-gradient-to-br from-primary/10 to-secondary/10 shadow-[0_0_40px_rgba(251,146,60,0.2)]">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-base sm:text-lg text-muted-foreground">💰 Preço de Venda Sugerido</p>
                    <p className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
                      R$ {finalPrice.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Botões Finais */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleClear}
                variant="outline"
                className="w-full py-3 border-border/50 hover:border-primary/50"
              >
                Limpar
              </Button>
              <Button
                onClick={handleGenerateAd}
                disabled={!productName.trim() || finalPrice === 0}
                className="w-full py-3 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                Gerar Anúncio
              </Button>
            </div>

            {/* Seção de Geração de Descrição com IA */}
            <div className="pt-6 border-t border-border/50 space-y-4">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <h3 className="text-lg sm:text-xl font-semibold">Gerar Descrição com IA (Opcional)</h3>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="keywords"
                    placeholder="Ex: bluetooth, cancelamento de ruído, TWS"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audience">Público-alvo</Label>
                  <Input
                    id="audience"
                    placeholder="Ex: Jovens de 18-30 anos, gamers"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full bg-background border-primary/20 focus:border-primary text-base sm:text-sm"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isLoading || !productName}
                className="w-full py-3 bg-gradient-primary hover:opacity-90 transition-opacity"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Descrição com IA
              </Button>

              {generatedDescription && (
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Gerada</Label>
                  <Textarea
                    id="description"
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    rows={8}
                    className="font-mono text-sm bg-background border-primary/20"
                  />
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    variant="secondary"
                    className="w-full py-3"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Anúncio
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo fixo no rodapé mobile */}
      {finalPrice > 0 && (
        <div className="fixed bottom-0 left-0 right-0 sm:hidden">
          <div 
            className="p-4 flex items-center justify-between"
            style={{
              position: 'sticky',
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.85)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span className="text-sm text-muted-foreground">Preço Sugerido:</span>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              R$ {finalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Create;