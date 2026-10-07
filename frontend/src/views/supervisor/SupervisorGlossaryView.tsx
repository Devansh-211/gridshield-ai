import React, { useEffect, useState } from 'react';
import { fetchSupervisorGlossary } from '../../api/client';
import { GlossaryItem } from '../../../types/api';
import { BookOpen, Search, Sparkles, HelpCircle } from 'lucide-react';

export const SupervisorGlossaryView: React.FC = () => {
  const [terms, setTerms] = useState<GlossaryItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchSupervisorGlossary();
        setTerms(data);
      } catch (err) {
        console.error('Failed to load glossary:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.plain_translation.toLowerCase().includes(search.toLowerCase()) ||
      t.plain_analogy.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto space-y-6 bg-app">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded bg-surface border border-border shadow-sm">
        <div>
          <h1 className="text-base font-bold text-text-main flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Plain-Language Power Grid Glossary
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Everyday translations and real-world analogies for technical grid concepts.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search concepts or analogies..."
            className="w-full bg-app border border-border rounded pl-9 pr-3 py-2 text-xs text-text-main focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-xs text-text-muted py-12">
          Loading glossary terms...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-xs text-text-muted py-12">
          No matching glossary terms found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded bg-surface border border-border shadow-sm space-y-3 hover:border-blue-500/40 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                    {item.term}
                  </h3>
                  <span className="text-[10px] text-text-muted">Plain English</span>
                </div>

                <p className="text-xs text-text-main font-semibold leading-snug">
                  {item.plain_translation}
                </p>
              </div>

              {item.plain_analogy && (
                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 space-y-1">
                  <div className="text-[10px] font-bold text-blue-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Everyday Analogy:
                  </div>
                  <p className="text-[11px] text-text-muted italic leading-relaxed">
                    "{item.plain_analogy}"
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
