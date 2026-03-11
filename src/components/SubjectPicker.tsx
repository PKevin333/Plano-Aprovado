import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '../App';
import { Subject } from '../types';
import { api } from '../services/api';

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', 
  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#f97316'
];

export const ColorPicker = ({ value, onChange }: { value: string, onChange: (color: string) => void }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-8 h-8 rounded-full transition-all hover:scale-110",
            value === color ? "ring-2 ring-offset-2 ring-slate-900 scale-110" : "opacity-70"
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

export const SubjectAutocomplete = ({ 
  value, 
  onChange, 
  onSelect,
  placeholder = "Digite o nome da disciplina..."
}: { 
  value: string, 
  onChange: (val: string) => void,
  onSelect: (subject: Subject) => void,
  placeholder?: string
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.subjects.list().then(setSubjects);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = subjects.filter(s => 
    s.name.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      </div>

      {isOpen && (value.length > 0 || filtered.length > 0) && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="max-h-60 overflow-y-auto">
            {filtered.map(subject => (
              <button
                key={subject.id}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group"
                onClick={() => {
                  onSelect(subject);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="font-bold text-slate-700">{subject.name}</span>
                </div>
                <Check className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
              </button>
            ))}
            {value.length > 0 && !subjects.find(s => s.name.toLowerCase() === value.toLowerCase()) && (
              <div className="px-4 py-3 text-slate-400 text-sm italic border-t border-slate-50">
                Pressione Enter para criar "{value}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
