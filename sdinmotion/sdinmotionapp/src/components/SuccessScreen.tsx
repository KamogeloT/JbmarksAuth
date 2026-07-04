import React, { useState } from 'react';
import { CheckCircleIcon } from './icons';

interface Props {
  refNumber: string;
  taskId?: string;
  faultType: string;
  onDone: () => void;
  onTrack: () => void;
}

export const SuccessScreen: React.FC<Props> = ({ refNumber, taskId, faultType, onDone, onTrack }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(refNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = refNumber;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const text = `I've reported a ${faultType} issue to JB Marks Municipality.\n\nReference: ${refNumber}\n\nTrack status in the JBMarks Community App.`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fault Report Submitted', text });
      } catch { /* user cancelled */ }
    } else {
      // Fallback — copy to clipboard
      await navigator.clipboard.writeText(text);
      alert('Report details copied to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#1B5E20] via-[#2E7D32] to-[#4CAF50] px-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Green header with checkmark */}
        <div className="bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] px-6 py-8 text-center">
          <div className="success-check inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 mb-4">
            <CheckCircleIcon className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold">Report Submitted!</h2>
          <p className="text-white/80 text-sm mt-1">Your {faultType.toLowerCase()} issue has been logged</p>
        </div>

        {/* Reference number */}
        <div className="px-6 py-6">
          <p className="text-xs text-gray-500 text-center mb-2 font-semibold uppercase tracking-wider">Your Reference Number</p>
          <div className="bg-gray-50 border-2 border-dashed border-[#F9A825] rounded-xl px-4 py-4 text-center mb-4">
            <p className="text-2xl font-mono font-extrabold text-[#1B5E20] tracking-wider">{refNumber}</p>
            {taskId && <p className="text-[10px] text-gray-400 mt-1">Task #{taskId}</p>}
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleCopy}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                copied
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2E7D32]'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-[#2E7D32] transition-all"
            >
              📤 Share
            </button>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-5">
            <p className="text-xs text-blue-800 leading-relaxed">
              💡 <strong>Keep this reference number.</strong> Use it to track your report's status in the app or when calling the municipality.
            </p>
          </div>

          {/* Main actions */}
          <div className="space-y-3">
            <button
              onClick={onTrack}
              className="w-full py-3.5 bg-[#1565C0] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              🔍 Track This Report
            </button>
            <button
              onClick={onDone}
              className="w-full py-3.5 bg-[#2E7D32] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all"
            >
              ✓ Done
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .success-check {
          animation: checkBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes checkBounce {
          from { opacity: 0; transform: scale(0); }
          50% { transform: scale(1.2); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SuccessScreen;
