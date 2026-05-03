import { X, ExternalLink } from 'lucide-react'

interface Props {
  url: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ExternalLinkDialog({ url, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-in fade-in duration-150">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-2xl w-full max-w-[400px] overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <ExternalLink size={24} />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Open External Link</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are about to open this link in your default browser:
          </p>
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border text-sm font-mono text-foreground/80 break-all">
            {url}
          </div>
        </div>
        <div className="bg-muted/30 p-4 px-6 flex justify-end gap-3 border-t border-border">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <X size={14} />
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-colors shadow-sm cursor-pointer"
          >
            <ExternalLink size={14} />
            Open Link
          </button>
        </div>
      </div>
    </div>
  )
}
