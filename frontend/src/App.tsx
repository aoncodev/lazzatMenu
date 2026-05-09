import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { I18nProvider, useI18n } from "@/lib/i18n"
import { IngredientsPage } from "@/components/ingredients-page"
import { MenuPage } from "@/components/menu-page"
import { Languages } from "lucide-react"

function ErrorBanner({ message, onClear }: { message: string; onClear: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClear, 5000)
    return () => clearTimeout(timer)
  }, [message, onClear])

  return (
    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center justify-between" data-testid="error-banner">
      <span>{message}</span>
      <button onClick={onClear} className="ml-2 hover:opacity-70 cursor-pointer">&times;</button>
    </div>
  )
}

function AppContent() {
  const { t, lang, toggle } = useI18n()
  const [error, setError] = useState("")

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">{t("title")}</h1>
          <Button variant="outline" size="sm" onClick={toggle} data-testid="lang-toggle">
            <Languages className="h-4 w-4" />
            {lang === "en" ? "RU" : "EN"}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {error && <ErrorBanner message={error} onClear={() => setError("")} />}

        <Tabs defaultValue="ingredients">
          <TabsList className="mb-4">
            <TabsTrigger value="ingredients" data-testid="tab-ingredients">{t("ingredients")}</TabsTrigger>
            <TabsTrigger value="menu" data-testid="tab-menu">{t("menu")}</TabsTrigger>
          </TabsList>
          <TabsContent value="ingredients">
            <IngredientsPage onError={setError} />
          </TabsContent>
          <TabsContent value="menu">
            <MenuPage onError={setError} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  )
}
