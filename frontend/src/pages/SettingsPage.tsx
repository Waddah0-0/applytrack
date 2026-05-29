import { useState, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { Server, KeyRound, Save } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    email: '',
    password: '',
    host: 'imap.gmail.com',
    port: 993,
    demoMode: true
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    api.get('/settings').then((res: any) => {
      setSettings(res)
    })
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setMessage("")
    try {
      const res: any = await api.post('/settings', settings)
      setMessage(res.message || "Settings saved successfully.")
    } catch (err: any) {
      setMessage("Error saving settings.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <Header
        title="Settings"
        subtitle="Configure IMAP credentials and tenant parameters"
      />

      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-8">

          <Card className="bg-surface/50 backdrop-blur-md border-white/5 p-8">
             <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                     <KeyRound className="w-5 h-5 text-primary" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-white">IMAP Credentials</h2>
                    <p className="text-sm text-slate-400">Encrypted at-rest using AES-256. Never leaves your tenant.</p>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Email Address</label>
                    <Input
                        value={settings.email}
                        onChange={e => setSettings({...settings, email: e.target.value})}
                        placeholder="you@gmail.com"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">App Password</label>
                    <Input
                        type="password"
                        value={settings.password}
                        onChange={e => setSettings({...settings, password: e.target.value})}
                        placeholder="••••••••••••••••"
                    />
                    <p className="text-[10px] text-slate-500">Use a generated App Password, not your standard password.</p>
                 </div>
             </div>
          </Card>

          <Card className="bg-surface/50 backdrop-blur-md border-white/5 p-8">
             <div className="flex items-center gap-3 mb-6">
                 <div className="w-10 h-10 rounded-lg bg-brand-indigo/10 flex items-center justify-center border border-brand-indigo/20">
                     <Server className="w-5 h-5 text-brand-indigo" />
                 </div>
                 <div>
                    <h2 className="text-xl font-bold text-white">Connection Parameters</h2>
                    <p className="text-sm text-slate-400">Configure host and scan behaviors.</p>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">IMAP Host</label>
                    <Input
                        value={settings.host}
                        onChange={e => setSettings({...settings, host: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Port</label>
                    <Input
                        type="number"
                        value={settings.port}
                        onChange={e => setSettings({...settings, port: Number(e.target.value)})}
                    />
                 </div>
             </div>

             <div className="p-4 rounded-lg border border-white/5 bg-black/20 flex items-center justify-between">
                 <div>
                    <h4 className="text-sm font-medium text-white">Live Mode</h4>
                    <p className="text-xs text-slate-400">Toggle off to use local Demo Mode.</p>
                 </div>
                 <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={!settings.demoMode}
                        onChange={e => setSettings({...settings, demoMode: !e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                 </label>
             </div>
          </Card>

          <div className="flex items-center gap-4 justify-end">
              {message && <span className="text-sm text-primary">{message}</span>}
              <Button onClick={handleSave} disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? "Saving..." : "Save Configuration"}
              </Button>
          </div>

        </div>
      </div>
    </div>
  )
}
