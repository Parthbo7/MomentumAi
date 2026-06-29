import React, { useState } from 'react';
import { ClipboardList, Plus, Sparkles, Upload, Loader2 } from 'lucide-react';

export interface Assignment {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // hh:mm AM/PM
  priority: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  description?: string;
  completed: boolean;
}

interface AssignmentManagerProps {
  assignments: Assignment[];
  onAddAssignment: (assignment: Omit<Assignment, 'id' | 'completed'>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onToggleAssignmentComplete: (id: string, comp: boolean) => Promise<void>;
  onAddStudySession: (event: { title: string; date: string; start: string; end: string; category: string; accent: 'emerald' }) => Promise<void>;
}

export const AssignmentManager: React.FC<AssignmentManagerProps> = ({
  assignments,
  onAddAssignment,
  onDeleteAssignment,
  onToggleAssignmentComplete,
  onAddStudySession,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  // New assignment form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('11:59 PM');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [description, setDescription] = useState('');
  const [autoScheduleStudy, setAutoScheduleStudy] = useState(true);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !dueDate) return;

    await onAddAssignment({
      title,
      subject,
      dueDate,
      dueTime,
      priority,
      description,
    });

    if (autoScheduleStudy) {
      const [y, m, d] = dueDate.split('-').map(Number);
      
      const date1 = new Date(y, m - 1, d);
      date1.setDate(date1.getDate() - 1);
      const dateKey1 = date1.toISOString().split('T')[0];

      const date2 = new Date(y, m - 1, d);
      date2.setDate(date2.getDate() - 2);
      const dateKey2 = date2.toISOString().split('T')[0];

      await onAddStudySession({
        title: `Prep: ${title}`,
        date: dateKey1,
        start: '04:00 PM',
        end: '05:30 PM',
        category: 'Study',
        accent: 'emerald',
      });

      await onAddStudySession({
        title: `Prep: ${title}`,
        date: dateKey2,
        start: '04:00 PM',
        end: '05:30 PM',
        category: 'Study',
        accent: 'emerald',
      });
    }

    // Reset Form
    setTitle('');
    setSubject('');
    setDueDate('');
    setDescription('');
    setIsOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsParsing(true);
      setTimeout(() => {
        setIsParsing(false);
        setTitle('DBMS Course Project Stage 2');
        setSubject('Database Systems');
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 5);
        setDueDate(nextWeek.toISOString().split('T')[0]);
        setPriority('high');
        setDescription('Extracted from syllabus PDF: Implement physical design & indexing, submit DDL script and query optimization plan.');
        setIsOpen(true);
      }, 1500);
    }
  };

  return (
    <div className="app-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">Assignments</h3>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs text-purple-500 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Assignment
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleManualAdd} className="rounded-2xl border dark:border-white/8 bg-slate-900/10 dark:bg-black/10 p-4 mb-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b dark:border-white/8">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200">New Assignment Entry</h4>
            <div className="relative cursor-pointer flex items-center gap-1 text-[10px] font-bold text-[#6D4AFF] bg-purple-500/10 px-2.5 py-1 rounded-lg">
              {isParsing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Parsing Syllabus...
                </>
              ) : (
                <>
                  <Upload className="h-3 w-3" /> Upload Syllabus PDF
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="app-input"
              placeholder="e.g. DBMS Assignment 3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="app-input"
                placeholder="e.g. Computer Science"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e: any) => setPriority(e.target.value)}
                className="app-input capitalize"
              >
                {['low', 'medium', 'high', 'critical'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="app-input"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 block mb-1">Due Time</label>
              <input
                type="text"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="app-input"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1">Description / Syllabus Extract</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="app-input text-xs"
              placeholder="Task instructions..."
            />
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Auto-schedule Study Sessions
            </span>
            <input
              type="checkbox"
              checked={autoScheduleStudy}
              onChange={(e) => setAutoScheduleStudy(e.target.checked)}
              className="h-4.5 w-4.5 text-purple-600 rounded border-gray-400/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="app-button-secondary py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="app-button-primary py-1.5 text-xs"
            >
              Add Assignment
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2.5">
        {assignments.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-[#D6DAE3] dark:border-white/8 px-4 py-6 text-center text-xs text-gray-500">
            No assignments added yet.
          </div>
        ) : (
          assignments.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border dark:border-white/8 bg-white dark:bg-[#171923] p-3.5 flex items-start justify-between gap-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={(e) => onToggleAssignmentComplete(item.id, e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 text-purple-600 rounded border-gray-400/20"
                />
                <div>
                  <p className={`text-xs font-bold text-gray-800 dark:text-white ${item.completed ? 'line-through opacity-70' : ''}`}>
                    {item.title}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.subject} • Due: <strong className="text-gray-700 dark:text-gray-200">{item.dueDate}</strong> @ {item.dueTime}
                  </p>
                  {item.description && (
                    <p className="text-[10px] italic text-purple-500 dark:text-purple-400 mt-1">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-purple-500/5 text-purple-500">
                  {item.priority}
                </span>
                <button
                  onClick={() => onDeleteAssignment(item.id)}
                  className="text-red-500 hover:text-red-400"
                >
                  <Plus className="h-4.5 w-4.5 rotate-45" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
