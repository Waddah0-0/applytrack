import { useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import api from "@/lib/api"
import { Activity, Lock, ChevronRight } from "lucide-react"

export default function LandingPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup"
      const res: any = await api.post(endpoint, { email, password })
      localStorage.setItem("token", res.token)
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col lg:flex-row">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-indigo/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />

      {/* Left Column: Storytelling */}
      <div className="flex-1 p-8 lg:p-24 flex flex-col justify-center relative z-10 border-r border-white/5 bg-background/50 backdrop-blur-3xl">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-16"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-brand-indigo flex items-center justify-center shadow-pulse-glow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">APPLY<span className="text-primary font-light">TRACK</span></span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-7xl font-bold tracking-tighter text-white mb-6 leading-[1.1]"
          >
            Stop tracking jobs <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-brand-indigo italic font-light">by hand.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-slate-400 mb-12 max-w-xl leading-relaxed"
          >
            Securely connect your mailbox. ApplyTrack scans for internship & job correspondence and compiles a stunning, automated spatial pipeline. Built for world-class developers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="glass-panel p-5 rounded-2xl">
              <Activity className="w-6 h-6 text-primary mb-4" />
              <h3 className="font-semibold text-white mb-2">Zero-Effort IMAP</h3>
              <p className="text-sm text-slate-400">Automated mailbox scanning catches assessments before they expire.</p>
            </div>
            <div className="glass-panel p-5 rounded-2xl">
              <Lock className="w-6 h-6 text-brand-indigo mb-4" />
              <h3 className="font-semibold text-white mb-2">AES-256 Security</h3>
              <p className="text-sm text-slate-400">Credentials encrypted at-rest. Full tenant isolation.</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="w-full lg:w-[480px] p-8 lg:p-16 flex flex-col justify-center relative z-10 bg-[#060a13]">
        <motion.div
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
          className="w-full max-w-sm mx-auto"
        >
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-slate-400">
              {isLogin ? "Enter your credentials to access your pipeline." : "Secure your isolated workspace today."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {error}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="developer@example.com"
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-300">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-12"
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base mt-4" disabled={loading}>
              {loading ? "Authenticating..." : (isLogin ? "Access Pipeline" : "Register & Launch")}
              {!loading && <ChevronRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
