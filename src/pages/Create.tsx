import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Sparkles, ArrowLeft, Save, Copy, Image, Video } from "lucide-react";

const Create = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Product fields
  const [productName, setProductName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [category, setCategory] = useState("");

  // Generated content
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [basePrice, setBasePrice] = useState<number | null>(null);
  const [priceJustification, setPriceJustification] = useState("");
  const [imagePrompts, setImagePrompts] = useState<string[]>([]);
  const [videoPrompts, setVideoPrompts] = useState<string[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleGenerate = async () => {
    if (!productName.trim()) {
      toast.error("Digite o nome do produto");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product", {
        body: {
          productName,
          description: shortDescription,
          category,
        },
      });

      if (error) throw error;

      setGeneratedTitle(data.title);
      setGeneratedDescription(data.description);
      setGeneratedTags(data.tags || []);
      setBasePrice(data.basePrice || null);
      setPriceJustification(data.priceJustification || "");
      setImagePrompts(data.imagePrompts || []);
      setVideoPrompts(data.videoPrompts || []);

      toast.success("✅ Conteúdo gerado com sucesso!");
    } catch (error: any) {
      console.error("Error generating product:", error);
      toast.error(error.message || "Erro ao gerar conteúdo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedTitle || !generatedDescription) {
      toast.error("Gere o conteúdo antes de salvar");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await (supabase as any).from("products").insert({
        user_id: user.id,
        title: generatedTitle,
        description: generatedDescription,
        category: category || null,
        tags: generatedTags,
        image_prompts: imagePrompts,
        video_prompts: videoPrompts,
        base_price: basePrice,
      });

      if (error) throw error;
      
      toast.success("✅ Produto salvo no Dashboard com sucesso!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("✅ Prompt copiado!");
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

        <Card className="border-primary/30 backdrop-blur-sm bg-card/90">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl sm:text-3xl">Criar Produto com IA</CardTitle>
                <CardDescription>
                  Gere conteúdo profissional para seu produto usando ChatGPT
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Input Fields */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">
                  Nome do Produto <span className="text-primary">*</span>
                </Label>
                <Input
                  id="productName"
                  placeholder="Ex: Fone de Ouvido Bluetooth TWS"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Descrição Curta</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Breve descrição do produto..."
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  rows={3}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria (opcional)</Label>
                <Input
                  id="category"
                  placeholder="Ex: Eletrônicos, Casa, Moda..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !productName.trim()}
              className="w-full py-3"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Conteúdo com IA
            </Button>

            {/* Generated Content */}
            {generatedTitle && (
              <div className="space-y-6 pt-6 border-t">
                <div className="space-y-2">
                  <Label>Título Otimizado</Label>
                  <Input
                    value={generatedTitle}
                    onChange={(e) => setGeneratedTitle(e.target.value)}
                    className="font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição Persuasiva</Label>
                  <Textarea
                    value={generatedDescription}
                    onChange={(e) => setGeneratedDescription(e.target.value)}
                    rows={6}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tags/Categorias</Label>
                  <div className="flex flex-wrap gap-2">
                    {generatedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {basePrice && (
                  <div className="space-y-2">
                    <Label>Preço Base Sugerido</Label>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        R$ {basePrice.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {priceJustification}
                      </p>
                    </div>
                  </div>
                )}

                {/* Image Prompts */}
                {imagePrompts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-secondary" />
                      <Label className="text-lg">🧠 Gere suas imagens no Runway.ai</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Copie um dos prompts abaixo e cole no Runway.ai:
                    </p>
                    <div className="space-y-2">
                      {imagePrompts.map((prompt, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <p className="flex-1 text-sm">{prompt}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(prompt)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video Prompts */}
                {videoPrompts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-secondary" />
                      <Label className="text-lg">🎬 Crie seus vídeos no Runway.ai</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cole um dos prompts abaixo no Runway.ai:
                    </p>
                    <div className="space-y-2">
                      {videoPrompts.map((prompt, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                        >
                          <p className="flex-1 text-sm">{prompt}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(prompt)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full py-3"
                  variant="secondary"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Salvar no Dashboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Create;
