import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Header } from "@/components/layout/Header"
import api from "@/lib/api"
import { GripVertical, Calendar, FileText } from "lucide-react"

const COLUMNS = [
  { id: "Applied", label: "Applied", color: "bg-primary/20 text-primary border-primary/30" },
  { id: "Assessment", label: "Assessment", color: "bg-brand-violet/20 text-brand-violet border-brand-violet/30" },
  { id: "Interviewing", label: "Interviewing", color: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
  { id: "Offer", label: "Offer", color: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" },
  { id: "Rejected", label: "Rejected", color: "bg-destructive/20 text-destructive border-destructive/30" }
]

export default function PipelinePage() {
  const queryClient = useQueryClient()
  const [draggedJob, setDraggedJob] = useState<any>(null)

  const { data: jobs = [] } = useQuery({
    queryKey: ['tracker'],
    queryFn: () => api.get('/tracker'),
  })

  const updateJobMutation = useMutation({
    mutationFn: (job: any) => api.post('/tracker', job),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tracker'] })
  })

  const handleDragStart = (e: React.DragEvent, job: any) => {
    setDraggedJob(job)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    if (draggedJob && draggedJob.status !== status) {
      updateJobMutation.mutate({ ...draggedJob, status })
    }
    setDraggedJob(null)
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      <Header
        title="Spatial Pipeline"
        subtitle="Drag and drop applications across your tracked states"
      />

      <div className="p-8 flex-1 overflow-x-auto">
        <div className="flex gap-6 min-h-full pb-8 h-[calc(100vh-140px)]">
          {COLUMNS.map((col) => {
            const columnJobs = Array.isArray(jobs) ? jobs.filter((j: any) => j.status === col.id) : []

            return (
              <div
                key={col.id}
                className="flex-1 min-w-[300px] max-w-[350px] flex flex-col bg-surface/30 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/50">
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.label}
                  </div>
                  <span className="text-slate-500 font-mono text-sm">{columnJobs.length}</span>
                </div>

                <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                  <AnimatePresence>
                    {columnJobs.map((job: any) => (
                      <motion.div
                        key={job.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -2 }}
                        draggable
                        onDragStart={(e: any) => handleDragStart(e, job)}
                        className={`bg-surface-elevated border border-white/5 rounded-xl p-4 shadow-sm cursor-grab active:cursor-grabbing relative group ${draggedJob?.id === job.id ? 'opacity-50' : ''}`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity bg-primary" />

                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-white truncate pr-4">{job.company}</h4>
                          <GripVertical className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
                        </div>

                        <p className="text-sm text-primary mb-3 truncate">{job.role}</p>

                        <div className="flex items-center justify-between text-xs text-slate-500 font-mono mt-auto pt-3 border-t border-white/5">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(job.dateApplied).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                            {job.notes && <FileText className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {columnJobs.length === 0 && (
                    <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-xl text-sm text-slate-600">
                      Drop here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
