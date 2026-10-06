import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Eye, ShieldAlert, X } from 'lucide-react';

export const PreviewBanner: React.FC = () => {
  const { user, isPreview, switchPreviewRole } = useAuth();

  if (!isPreview || !user) return null;

  return (
    <div className="bg-amber-600 dark:bg-amber-700 text-white px-4 py-1.5 flex items-center justify-between text-xs font-semibold tracking-wide shadow-md z-50 border-b border-amber-800 animate-pulse">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4 text-amber-200" />
        <span className="uppercase bg-amber-900/60 px-1.5 py-0.5 rounded text-[10px] tracking-wider border border-amber-400/40">
          Admin Preview Mode
        </span>
        <span>
          Viewing as <strong className="underline decoration-amber-300">{user.effective_role}</strong>. (Real Role: {user.real_role})
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-amber-100 hidden sm:inline">
          Server-side projection active. Real actions and mutations remain under administrator audit logging.
        </span>
        <button
          onClick={() => switchPreviewRole(null)}
          className="flex items-center gap-1 bg-neutral-900/80 hover:bg-neutral-900 text-white px-2.5 py-1 rounded border border-amber-300/40 hover:border-amber-300 transition-all cursor-pointer font-bold shadow-sm"
          title="Exit Preview and return to full Admin Console"
        >
          <X className="w-3.5 h-3.5" />
          Exit Preview
        </button>
      </div>
    </div>
  );
};
