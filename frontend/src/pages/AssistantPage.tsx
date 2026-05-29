import { useState } from "react"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { Wand2, Copy, Check } from "lucide-react"

export default function AssistantPage() {
  const [category, setCategory] = useState("Interview")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!company || !role) return;
    setLoading(true)
    try {
      const res: any = await api.post('/generate-response', { category, company, role })
      setDraft(res.draft)
      setCopied(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const templates = ["Interview", "Rejection", "Assessment", "Offer", "FollowUp"]

  return (
    <div className="flex flex-col h-full bg-background/50">
      <Header
        title="Response Assistant"
        subtitle="1-Click intelligent email generation"
      />

      <div className="p-8 flex-1 flex flex-col md:flex-row gap-8 overflow-y-auto">
        <Card className="w-full md:w-1/3 p-6 bg-surface/50 backdrop-blur-md">
          <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand-indigo" />
            Configuration
          </h3>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Context</label>
              <div className="flex flex-wrap gap-2">
                {templates.map(t => (
                  <Badge
                    key={t}
                    variant={category === t ? "default" : "outline"}
                    className={`cursor-pointer ${category === t ? 'bg-primary/20 text-primary border-primary/30' : 'border-white/10 hover:border-white/20'}`}
                    onClick={() => setCategory(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Company Name</label>
              <Input placeholder="e.g. Acme Corp" value={company} onChange={e => setCompany(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Job Role</label>
              <Input placeholder="e.g. Senior Frontend Engineer" value={role} onChange={e => setRole(e.target.value)} />
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading || !company || !role}
            >
              {loading ? "Generating..." : "Generate Draft"}
            </Button>
          </div>
        </Card>

        <Card className="w-full md:w-2/3 flex flex-col bg-surface/50 backdrop-blur-md border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                {draft && (
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 bg-background">
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        {copied ? "Copied" : "Copy"}
                    </Button>
                )}
            </div>

            <div className="p-4 border-b border-white/5 bg-surface font-semibold text-sm tracking-wide">
              GENERATED DRAFT
            </div>
            <div className="flex-1 p-6 relative">
              {draft ? (
                <textarea
                  className="w-full h-full bg-transparent resize-none outline-none font-mono text-sm text-slate-300 leading-relaxed"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 text-sm">
                  <div className="w-16 h-16 rounded-full border border-dashed border-slate-700 flex items-center justify-center mb-4">
                    <Wand2 className="w-6 h-6 opacity-50" />
                  </div>
                  Fill out configuration to generate a professional draft.
                </div>
              )}
            </div>
        </Card>
      </div>
    </div>
  )
}
