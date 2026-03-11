import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Check, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { cn } from '../App';
import { api } from '../services/api';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const AutoSaveIndicator = () => {
  const [status, setStatus] = useState<SaveStatus>('idle');

  useEffect(() => {
    const handleStatusChange = (e: CustomEvent<SaveStatus>) => {
      setStatus(e.detail);
      if (e.detail === 'saved') {
        setTimeout(() => setStatus('idle'), 3000);
      }
    };

    window.addEventListener('autosave-status' as any, handleStatusChange);
    return () => window.removeEventListener('autosave-status' as any, handleStatusChange);
  }, []);

  if (status === 'idle') return null;

  return (
    <div className={cn(
      "fixed bottom-6 right-6 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold transition-all duration-500 animate-in slide-in-from-bottom-4",
      status === 'saving' && "bg-slate-900 text-white",
      status === 'saved' && "bg-emerald-500 text-white",
      status === 'error' && "bg-rose-500 text-white"
    )}>
      {status === 'saving' && <Loader2 size={16} className="animate-spin" />}
      {status === 'saved' && <Check size={16} />}
      {status === 'error' && <CloudOff size={16} />}
      <span>
        {status === 'saving' && "Salvando..."}
        {status === 'saved' && "Salvo"}
        {status === 'error' && "Erro ao salvar"}
      </span>
    </div>
  );
};

export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<any>,
  delay = 1000
) {
  const initialRender = useRef(true);

  const updateStatus = (status: SaveStatus) => {
    window.dispatchEvent(new CustomEvent('autosave-status', { detail: status }));
  };

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    updateStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveFn(data);
        updateStatus('saved');
      } catch (error) {
        console.error('AutoSave error:', error);
        updateStatus('error');
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [data, delay, saveFn]);
}

export function useDraft<T>(type: string, initialValue: T, reference_id?: number) {
  const [draft, setDraft] = useState<T>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    api.drafts.list().then(drafts => {
      const existing = drafts.find((d: any) => d.type === type && d.reference_id === (reference_id || null));
      if (existing) {
        setDraft(existing.payload);
      }
      setIsLoaded(true);
    });
  }, [type, reference_id]);

  useAutoSave(draft, useCallback((data: T) => {
    if (!isLoaded) return Promise.resolve();
    return api.drafts.save(type, data, reference_id);
  }, [type, reference_id, isLoaded]), 500);

  const clearDraft = useCallback(() => {
    setDraft(initialValue);
    return api.drafts.delete(type, reference_id);
  }, [type, reference_id, initialValue]);

  return [draft, setDraft, clearDraft, isLoaded] as const;
}
