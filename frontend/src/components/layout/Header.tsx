import { motion } from "framer-motion"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title: string;
  subtitle: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Header({ title, subtitle, onSync, isSyncing }: HeaderProps) {
  return (
    <header className="flex items-center justify-between py-6 px-8 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-30">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold tracking-tight text-white"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-sm text-slate-400 mt-1"
        >
          {subtitle}
        </motion.p>
      </div>

      <div className="flex items-center gap-4">
        {onSync && (
          <Button
            onClick={onSync}
            disabled={isSyncing}
            className="bg-white/5 hover:bg-white/10 text-white border border-white/10"
          >
            <motion.div
              animate={isSyncing ? { rotate: 360 } : { rotate: 0 }}
              transition={isSyncing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
              className="mr-2"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.div>
            {isSyncing ? "Syncing IMAP..." : "Sync Emails"}
          </Button>
        )}
      </div>
    </header>
  )
}
