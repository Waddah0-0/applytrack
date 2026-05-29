import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { Header } from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import api from "@/lib/api"
import { Mail, Briefcase, FileCheck, CheckCircle2 } from "lucide-react"

export default function DashboardPage() {
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const { data: emailsData, refetch: refetchEmails } = useQuery({
    queryKey: ['emails'],
    queryFn: () => api.get('/emails'),
  })

  const { data: trackerData, refetch: refetchTracker } = useQuery({
    queryKey: ['tracker'],
    queryFn: () => api.get('/tracker'),
  })

  const handleSync = async () => {
    setIsSyncing(true)
    await refetchEmails()
    await refetchTracker()
    setIsSyncing(false)
  }

  const emails = emailsData?.emails || []
  const trackedJobs = trackerData || []
  const selectedEmail = emails.find((e: any) => e.id === selectedEmailId)

  // Calculate Metrics from DB State
  const totalApps = trackedJobs.length
  const assessments = trackedJobs.filter((j: any) => j.status === 'Assessment').length
  const interviews = trackedJobs.filter((j: any) => j.status === 'Interviewing').length
  const offers = trackedJobs.filter((j: any) => j.status === 'Offer').length

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <Header
        title="Mission Control"
        subtitle="Overview of your parsed mailbox and application metrics"
        onSync={handleSync}
        isSyncing={isSyncing}
      />

      <div className="p-8 flex-1 flex flex-col gap-8 overflow-y-auto">
        {emailsData?.isDemo && (
          <div className="bg-brand-indigo/10 border border-brand-indigo/20 text-brand-indigo px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="font-medium text-sm">Demo Mode Active. Configure your IMAP settings to see live data.</span>
          </div>
        )}

        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-[#0e131f] to-[#161b28] border-primary/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-400">Tracked Applications</span>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{totalApps}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-400">Assessments</span>
                  <div className="w-8 h-8 rounded-full bg-brand-violet/10 flex items-center justify-center">
                    <FileCheck className="w-4 h-4 text-brand-violet" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{assessments}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-400">Interviews</span>
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-amber-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{interviews}</div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={item}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-slate-400">Offers</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white">{offers}</div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="flex-1 flex gap-6 min-h-[500px]">
          {/* Email List */}
          <Card className="w-1/3 flex flex-col overflow-hidden bg-surface/50 backdrop-blur-md">
            <div className="p-4 border-b border-white/5 bg-surface font-semibold text-sm tracking-wide">
              CAREER MAILBOX ({emails.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {emails.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  <Mail className="w-8 h-8 mb-2 opacity-20" />
                  No career emails found.
                </div>
              ) : (
                emails.map((email: any) => (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all border ${
                      selectedEmailId === email.id
                        ? "bg-primary/10 border-primary/30"
                        : "bg-surface-elevated border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-medium text-sm text-white truncate pr-2">{email.company}</span>
                      <span className="text-xs text-slate-500 shrink-0">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mb-2">{email.subject}</div>
                    <Badge variant={
                      email.category === 'Offer' ? 'success' :
                      email.category === 'Rejection' ? 'destructive' :
                      email.category === 'Assessment' ? 'info' :
                      email.category === 'Interview' ? 'warning' : 'outline'
                    } className="text-[10px] py-0">
                      {email.category}
                    </Badge>
                  </button>
                ))
              )}
            </div>
          </Card>

          {/* Email Detail */}
          <Card className="w-2/3 flex flex-col overflow-hidden bg-surface/50 backdrop-blur-md">
             {selectedEmail ? (
                <>
                  <div className="p-6 border-b border-white/5 bg-surface">
                    <h2 className="text-xl font-bold text-white mb-2">{selectedEmail.subject}</h2>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold">
                          {selectedEmail.company.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{selectedEmail.from}</p>
                          <p className="text-xs text-slate-400">To: you</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{new Date(selectedEmail.date).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {selectedEmail.body || selectedEmail.snippet}
                  </div>
                </>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                  <Mail className="w-12 h-12 mb-4 opacity-10" />
                  Select an email to view contents.
                </div>
             )}
          </Card>
        </div>
      </div>
    </div>
  )
}
