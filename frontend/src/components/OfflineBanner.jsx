import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 text-xs px-6 py-2 flex items-center gap-2" role="alert">
      <WifiOff className="w-4 h-4 shrink-0" />
      Backend is unreachable. Start the HireFlow API (python main.py); the page will reconnect automatically.
    </div>
  );
}
