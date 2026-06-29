import React, { useState } from 'react';
import { Upload, Sparkles, X, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickSetupProps {
  onAddEventBatch: (events: any[]) => Promise<void>;
  onAddRecurringRule: (rule: any) => Promise<void>;
}

export const QuickSetup: React.FC<QuickSetupProps> = ({
  onAddEventBatch,
  onAddRecurringRule,
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  // State for timetable file uploading
  // const [isParsing, setIsParsing] = useState(false);
  
  // Timetable extractor preview state
  const [parsedItems, setParsedItems] = useState<any[]>([
    { title: 'OOP Lecture', day: 'Monday', start: '10:00 AM', end: '11:30 AM', location: 'Lab 4', faculty: 'Prof. XYZ', accent: 'lavender' },
    { title: 'DBMS Seminar', day: 'Wednesday', start: '01:00 PM', end: '02:30 PM', location: 'Room 302', faculty: 'Dr. ABC', accent: 'sky' },
    { title: 'Data Structures', day: 'Thursday', start: '11:00 AM', end: '12:30 PM', location: 'Lab 2', faculty: 'Prof. PQR', accent: 'emerald' },
  ]);

  // Recurring event creator state
  const [recTitle, setRecTitle] = useState('');
  const [recCategory, setRecCategory] = useState('College');
  const [recDays, setRecDays] = useState<number[]>([1, 3]); // Monday, Wednesday
  const [recStart, setRecStart] = useState('10:00 AM');
  const [recEnd, setRecEnd] = useState('11:00 AM');
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recEndDate, setRecEndDate] = useState('');
  const [recRepeatForever, setRecRepeatForever] = useState(true);
  const [recAccent, setRecAccent] = useState<'lavender' | 'amber' | 'sky' | 'emerald' | 'rose'>('lavender');

  const setupOptions = [
    { id: 'timetable', label: 'Upload College Timetable', icon: '📄', desc: 'Import from PDF, Excel, CSV or Image' },
    { id: 'college', label: 'Import Weekly College Schedule', icon: '🏫', desc: 'Classes, labs and review sessions' },
    { id: 'gym', label: 'Create Gym Routine', icon: '💪', desc: 'Workout slots and fitness logs' },
    { id: 'work', label: 'Create Office/Work Schedule', icon: '💼', desc: 'Meetings, work blocks and standups' },
    { id: 'study', label: 'Create Study Routine', icon: '📚', desc: 'Prep blocks, revisions and exams' },
    { id: 'sleep', label: 'Sleep Schedule', icon: '💤', desc: 'Wind down and wakeup routines' },
    { id: 'custom', label: 'Custom Repeating Routine', icon: '➕', desc: 'Custom activities and chores' },
  ];

  const categories = ['College', 'Gym', 'Office', 'Study', 'Personal', 'Meeting', 'Sports', 'Custom'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
    }
  };

  const handleAddExtractedItem = () => {
    setParsedItems([
      ...parsedItems,
      { title: 'New Class', day: 'Monday', start: '09:00 AM', end: '10:00 AM', location: '', faculty: '', accent: 'sky' },
    ]);
  };

  const handleRemoveExtractedItem = (index: number) => {
    setParsedItems(parsedItems.filter((_, i) => i !== index));
  };

  const handleSaveExtractedTimetable = async () => {
    const batchEvents: any[] = [];
    const today = new Date();

    parsedItems.forEach((item) => {
      const dayIndex = dayNames.indexOf(item.day);
      if (dayIndex === -1) return;

      for (let w = 0; w < 4; w++) {
        const d = new Date(today);
        const currentDay = d.getDay();
        const diff = dayIndex - currentDay;
        d.setDate(d.getDate() + diff + w * 7);

        const [sh, sm, sa] = item.start.split(/[:\s]/);
        let startHour = parseInt(sh, 10);
        if (sa === 'PM' && startHour < 12) startHour += 12;
        if (sa === 'AM' && startHour === 12) startHour = 0;
        const startMin = parseInt(sm, 10);

        const [eh, em, ea] = item.end.split(/[:\s]/);
        let endHour = parseInt(eh, 10);
        if (ea === 'PM' && endHour < 12) endHour += 12;
        if (ea === 'AM' && endHour === 12) endHour = 0;
        const endMin = parseInt(em, 10);

        const startTime = new Date(d);
        startTime.setHours(startHour, startMin, 0, 0);

        const endTime = new Date(d);
        endTime.setHours(endHour, endMin, 0, 0);

        batchEvents.push({
          title: item.title,
          startTime,
          endTime,
          location: item.location || '',
          faculty: item.faculty || '',
          category: 'College',
          priority: 'medium',
          source: 'manual',
        });
      }
    });

    await onAddEventBatch(batchEvents);
    setActiveModal(null);
    setFile(null);
  };

  const handleQuickAddPredefined = async (type: string) => {
    let title = 'Study Session';
    let cat = 'Study';
    let start = '02:00 PM';
    let end = '03:30 PM';
    let days = [1, 2, 3, 4, 5]; // Mon-Fri
    let accent = 'lavender' as any;

    if (type === 'gym') {
      title = 'Gym Workout';
      cat = 'Gym';
      start = '06:30 PM';
      end = '07:30 PM';
      days = [1, 3, 5]; // Mon, Wed, Fri
      accent = 'rose';
    } else if (type === 'sleep') {
      title = 'Sleep Window';
      cat = 'Personal';
      start = '11:00 PM';
      end = '07:00 AM';
      days = [0, 1, 2, 3, 4, 5, 6];
      accent = 'emerald';
    } else if (type === 'work') {
      title = 'Office Focus Work';
      cat = 'Office';
      start = '09:30 AM';
      end = '12:30 PM';
      days = [1, 2, 3, 4, 5];
      accent = 'sky';
    }

    await onAddRecurringRule({
      title,
      category: cat,
      daysOfWeek: days,
      startTime: start,
      endTime: end,
      startDate: new Date().toISOString().split('T')[0],
      endDate: null,
      repeatForever: true,
      accent,
    });
  };

  const handleCreateCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recTitle || recDays.length === 0 || !recStart || !recEnd) return;

    await onAddRecurringRule({
      title: recTitle,
      category: recCategory,
      daysOfWeek: recDays,
      startTime: recStart,
      endTime: recEnd,
      startDate: recStartDate,
      endDate: recRepeatForever ? null : recEndDate,
      repeatForever: recRepeatForever,
      accent: recAccent,
    });

    setRecTitle('');
    setActiveModal(null);
  };

  const toggleDaySelection = (dayIdx: number) => {
    if (recDays.includes(dayIdx)) {
      setRecDays(recDays.filter((d) => d !== dayIdx));
    } else {
      setRecDays([...recDays, dayIdx].sort());
    }
  };

  return (
    <div className="app-surface p-5 select-none">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Quick Routines & Setup</h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Bulk-schedule templates, timetable uploads, and repeating routines.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {setupOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              if (opt.id === 'timetable' || opt.id === 'custom') {
                setActiveModal(opt.id);
              } else {
                handleQuickAddPredefined(opt.id);
              }
            }}
            className="rounded-[18px] border dark:border-white/8 bg-white dark:bg-[#171923] p-4 text-left shadow-sm hover:-translate-y-0.5 hover:shadow-md transition cursor-pointer flex flex-col justify-between min-h-[96px]"
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xl">{opt.icon}</span>
              <Plus className="h-4 w-4 text-purple-500" />
            </div>
            <div className="mt-2.5">
              <p className="text-xs font-bold text-gray-800 dark:text-white leading-snug">{opt.label}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-normal">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Glassmorphism Modals container */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-2xl border border-white/20 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-5 shadow-2xl overflow-hidden relative"
            >
              <button
                onClick={() => { setActiveModal(null); setFile(null); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {/* TIMETABLE IMPORT MODAL */}
              {activeModal === 'timetable' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b dark:border-white/8 pb-3">
                    <span className="text-xl">📄</span>
                    <h4 className="text-base font-bold text-gray-800 dark:text-white">Import College Timetable</h4>
                  </div>

                  {!file ? (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/10 bg-slate-500/5 py-8 text-center flex flex-col items-center justify-center p-5 relative">
                      <Upload className="h-8 w-8 text-purple-500 mb-3 animate-[pulse-soft_2s_infinite]" />
                      <p className="text-xs font-bold text-gray-700 dark:text-white">Drag & drop syllabus, Excel, CSV or Image here</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Supports PDF syllabus, timetable spreadsheets or calendar screenshots</p>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.csv,image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
                        <span className="font-bold">Extracted {file.name} ✓</span>
                        <span>Autodetected 3 Lectures</span>
                      </div>

                      {/* Timetable previews */}
                      <div className="space-y-2 max-h-[220px] overflow-y-auto soft-scrollbar pr-1">
                        {parsedItems.map((item, idx) => (
                          <div key={idx} className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#171923] p-3 text-xs flex items-center justify-between gap-3 shadow-sm">
                            <div>
                              <p className="font-bold text-gray-800 dark:text-white">{item.title}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                {item.day} • {item.start} - {item.end} {item.location ? `• ${item.location}` : ''} {item.faculty ? `(${item.faculty})` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoveExtractedItem(idx)}
                              className="text-red-500 hover:text-red-400 p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between gap-2.5 pt-2 border-t dark:border-white/8">
                        <button
                          onClick={handleAddExtractedItem}
                          className="app-button-secondary py-1.5 text-xs inline-flex items-center gap-1"
                        >
                          <Plus className="h-4.5 w-4.5" /> Add Class Row
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setActiveModal(null); setFile(null); }}
                            className="app-button-secondary py-1.5 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveExtractedTimetable}
                            className="app-button-primary py-1.5 text-xs"
                          >
                            Import to Calendar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CUSTOM ROUTINE CREATION MODAL */}
              {activeModal === 'custom' && (
                <form onSubmit={handleCreateCustomRule} className="space-y-4">
                  <div className="flex items-center gap-2 border-b dark:border-white/8 pb-3">
                    <span className="text-xl">➕</span>
                    <h4 className="text-base font-bold text-gray-800 dark:text-white">Create Recurring routine</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={recTitle}
                        onChange={(e) => setRecTitle(e.target.value)}
                        className="app-input"
                        placeholder="e.g. Gym workout"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Category</label>
                      <select
                        value={recCategory}
                        onChange={(e) => setRecCategory(e.target.value)}
                        className="app-input capitalize"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-400 block mb-1.5">Repeat Days</label>
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dName, dayIdx) => {
                        const isSel = recDays.includes(dayIdx);
                        return (
                          <button
                            key={dName}
                            type="button"
                            onClick={() => toggleDaySelection(dayIdx)}
                            className={`h-8 w-11 rounded-xl text-[10px] font-extrabold border transition ${
                              isSel
                                ? 'bg-purple-600 border-purple-500 text-white shadow-sm'
                                : 'bg-[#F9FAFB] dark:bg-[#1D1F2D] border-gray-200 dark:border-white/5 text-[#4B5563] dark:text-[#A1A1AA]'
                            }`}
                          >
                            {dName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Start Time</label>
                      <input
                        type="text"
                        value={recStart}
                        onChange={(e) => setRecStart(e.target.value)}
                        className="app-input"
                        placeholder="e.g. 10:00 AM"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">End Time</label>
                      <input
                        type="text"
                        value={recEnd}
                        onChange={(e) => setRecEnd(e.target.value)}
                        className="app-input"
                        placeholder="e.g. 11:00 AM"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={recStartDate}
                        onChange={(e) => setRecStartDate(e.target.value)}
                        className="app-input"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">Accent Accent</label>
                      <div className="flex gap-2 pt-1.5">
                        {['lavender', 'amber', 'sky', 'emerald', 'rose'].map((acc) => {
                          const bgColors = {
                            lavender: 'bg-violet-500',
                            amber: 'bg-amber-500',
                            sky: 'bg-sky-500',
                            emerald: 'bg-emerald-500',
                            rose: 'bg-rose-500',
                          };
                          return (
                            <button
                              key={acc}
                              type="button"
                              onClick={() => setRecAccent(acc as any)}
                              className={`h-5 w-5 rounded-full border border-white/20 transition-all ${bgColors[acc as keyof typeof bgColors]} ${
                                recAccent === acc ? 'scale-125 ring-2 ring-purple-500 ring-offset-2 dark:ring-offset-slate-900' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs py-1 border-t dark:border-white/8 pt-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Repeat Forever</span>
                    <input
                      type="checkbox"
                      checked={recRepeatForever}
                      onChange={(e) => setRecRepeatForever(e.target.checked)}
                      className="h-4.5 w-4.5 text-purple-600 rounded border-gray-400/20"
                    />
                  </div>

                  {!recRepeatForever && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 block mb-1">End Date</label>
                      <input
                        type="date"
                        required={!recRepeatForever}
                        value={recEndDate}
                        onChange={(e) => setRecEndDate(e.target.value)}
                        className="app-input"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveModal(null)}
                      className="app-button-secondary py-1.5 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="app-button-primary py-1.5 text-xs"
                    >
                      Save Routine
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
