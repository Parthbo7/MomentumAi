import React, { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Minus,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle,
  Sparkles,
  BookOpen,
  FileText,
  Activity,
  MapPin,
  Upload,
  Info
} from 'lucide-react';

export interface TaskDraft {
  title: string;
  description: string;
  category: string;
  customCategory: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'cancelled' | 'overdue';
  dueDate: string;
  dueTime: string;
  durationMinutes: string;
  progress: string;
  tags: string;
  reminder: boolean;
  reminderMinutesBefore: string;
  repeatRule: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom' | '';
  subject: string;
  faculty: string;
  marksWeightage: string;
  attachments: string;
  notes: string;
  projectName: string;
  team: string;
  estimatedHours: string;
  linkedCalendarEvent: boolean;
  
  // Custom context fields
  location?: string;
  guests?: string;
  repeatFrequency?: string;
  goal?: string;
  streak?: string;
  endTime?: string;

  // AI scheduler fields
  scheduleInCalendar?: boolean;
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime';
  earliestStartDate?: string;
  latestFinishTime?: string;
  fixedTime?: string;
  flexibleScheduling?: boolean;
  breakAfterTask?: boolean;
}

interface TaskEditorModalProps {
  taskFormMode: 'create' | 'edit';
  editingTaskId: string | null;
  taskDraft: TaskDraft;
  setTaskDraft: React.Dispatch<React.SetStateAction<TaskDraft>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}

export default function TaskEditorModal({
  taskFormMode,
  editingTaskId,
  taskDraft,
  setTaskDraft,
  onClose,
  onSubmit,
}: TaskEditorModalProps) {
  // UI states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAcademic, setShowAcademic] = useState(true);
  
  // Tag creation state
  const [tagInput, setTagInput] = useState('');
  // Attachment drop simulation state
  const [dragOver, setDragOver] = useState(false);
  
  // Validation state
  const [submitted, setSubmitted] = useState(false);
  const [titleError, setTitleError] = useState('');

  // Dropdown reference refs
  const datePickerRef = useRef<HTMLDivElement>(null);
  const startTimePickerRef = useRef<HTMLDivElement>(null);
  const endTimePickerRef = useRef<HTMLDivElement>(null);
  const durationPickerRef = useRef<HTMLDivElement>(null);

  // Calendar Date State
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
      if (startTimePickerRef.current && !startTimePickerRef.current.contains(event.target as Node)) {
        setShowStartTimePicker(false);
      }
      if (endTimePickerRef.current && !endTimePickerRef.current.contains(event.target as Node)) {
        setShowEndTimePicker(false);
      }
      if (durationPickerRef.current && !durationPickerRef.current.contains(event.target as Node)) {
        setShowDurationPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Title validation
  useEffect(() => {
    if (submitted) {
      if (!taskDraft.title.trim()) {
        setTitleError('Task title is required');
      } else {
        setTitleError('');
      }
    }
  }, [taskDraft.title, submitted]);

  // Handle Form Submission
  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (!taskDraft.title.trim()) {
      setTitleError('Task title is required');
      return;
    }
    await onSubmit(e);
  };

  // Handle Save Draft (Saves task as not_started status)
  const handleSaveDraft = async () => {
    setSubmitted(true);
    if (!taskDraft.title.trim()) {
      setTitleError('Task title is required');
      return;
    }
    // Update status to not_started for drafts
    setTaskDraft(prev => ({ ...prev, status: 'not_started' }));
    
    // Simulate submission after state updates
    setTimeout(async () => {
      const mockEvent = {
        preventDefault: () => {}
      } as FormEvent<HTMLFormElement>;
      await onSubmit(mockEvent);
    }, 50);
  };

  // Add Tag
  const handleAddTag = (newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    
    const existingTags = taskDraft.tags.split(',')
      .map(t => t.trim())
      .filter(Boolean);
      
    if (!existingTags.includes(trimmed)) {
      const updated = [...existingTags, trimmed].join(', ');
      setTaskDraft(prev => ({ ...prev, tags: updated }));
    }
    setTagInput('');
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove: string) => {
    const updated = taskDraft.tags.split(',')
      .map(t => t.trim())
      .filter(t => t !== tagToRemove && t !== '')
      .join(', ');
    setTaskDraft(prev => ({ ...prev, tags: updated }));
  };

  // Add Attachment
  const handleAddAttachment = (fileName: string) => {
    const existing = taskDraft.attachments.split(',')
      .map(a => a.trim())
      .filter(Boolean);
    if (!existing.includes(fileName)) {
      const updated = [...existing, fileName].join(', ');
      setTaskDraft(prev => ({ ...prev, attachments: updated }));
    }
  };

  // Remove Attachment
  const handleRemoveAttachment = (fileToRemove: string) => {
    const updated = taskDraft.attachments.split(',')
      .map(a => a.trim())
      .filter(a => a !== fileToRemove && a !== '')
      .join(', ');
    setTaskDraft(prev => ({ ...prev, attachments: updated }));
  };

  // Simulate file drops
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        handleAddAttachment(file.name);
      });
    }
  };

  // Format Helper for Date Header
  const getFormattedDateString = (dateStr: string) => {
    return dateStr; // Falls back to state string
  };

  // Generate calendar days
  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Previous month empty buffer spaces
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const handleSelectCalendarDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${months[date.getMonth()]} ${date.getDate()}`;
    setTaskDraft(prev => ({ ...prev, dueDate: formatted }));
    setShowDatePicker(false);
  };

  const handleQuickDate = (type: 'today' | 'tomorrow' | 'next_week' | 'weekend') => {
    const now = new Date();
    let target = new Date();
    
    if (type === 'today') {
      // Keep today
    } else if (type === 'tomorrow') {
      target.setDate(now.getDate() + 1);
    } else if (type === 'next_week') {
      target.setDate(now.getDate() + 7);
    } else if (type === 'weekend') {
      // Find Saturday
      const day = now.getDay();
      const dist = day === 6 ? 0 : 6 - day;
      target.setDate(now.getDate() + dist);
    }
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formatted = `${months[target.getMonth()]} ${target.getDate()}`;
    setTaskDraft(prev => ({ ...prev, dueDate: formatted }));
    setShowDatePicker(false);
  };

  // Time conversion helpers
  const timeToMinutes = (timeStr: string) => {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 720; // Default to noon 12:00 PM
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const minutesToTimeStr = (minutesTotal: number) => {
    let hours = Math.floor(minutesTotal / 60) % 24;
    const minutes = minutesTotal % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minsStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minsStr} ${ampm}`;
  };

  const generateTimes = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min of [0, 15, 30, 45]) {
        let ampm = hour >= 12 ? 'PM' : 'AM';
        let h12 = hour % 12;
        h12 = h12 ? h12 : 12;
        let mStr = min < 10 ? '0' + min : min;
        times.push(`${h12}:${mStr} ${ampm}`);
      }
    }
    return times;
  };

  // SVG Circular Ring properties
  const progressPercent = Math.min(100, Math.max(0, parseInt(taskDraft.progress) || 0));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const currentCategory = taskDraft.category || 'Other';
  const isAssignment = currentCategory === 'Assignments' || currentCategory === '📚 Assignments';
  const isEvent = currentCategory === 'Event' || currentCategory === '📅 Event';
  const isHabit = currentCategory === 'Habit' || currentCategory === '🏋 Habit';
  const isPersonal = currentCategory === 'Personal' || currentCategory === '🎯 Personal' || isHabit;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-md px-4 sm:p-6 overflow-y-auto">
      {/* Modal Animation Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative bg-white dark:bg-[#121420] border border-gray-200 dark:border-white/10 shadow-2xl flex flex-col
          w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[24px] overflow-hidden
          md:max-w-[960px] sm:max-w-[700px]"
      >
        
        {/* Sticky Header */}
        <div className="flex items-center justify-between border-b border-gray-150 dark:border-white/8 px-6 py-5 bg-gray-50/50 dark:bg-[#161928]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#6D4AFF] animate-ping" />
              <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                {taskFormMode === 'edit' ? 'Edit Task Record' : 'Create New Task'}
              </h3>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Formulate details, weights, reminders and place the record in your workspace grid.
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-white/8 bg-white dark:bg-[#1a1d2d] text-gray-400 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto soft-scrollbar px-6 sm:px-8 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            
            {/* LEFT COLUMN: Primary details (60% equivalent) */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Section 1: Task Title & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`app-input w-full rounded-xl px-4 py-3 text-[15px] font-medium transition-all ${
                        titleError ? 'border-red-500 ring-2 ring-red-500/10' : ''
                      }`}
                      placeholder="e.g., Finalize project architecture & endpoints"
                      value={taskDraft.title}
                      onChange={(e) => {
                        setTaskDraft(prev => ({ ...prev, title: e.target.value }));
                        if (e.target.value.trim()) setTitleError('');
                      }}
                    />
                    {titleError && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-500 font-medium">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {titleError}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Description & Scope
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {(taskDraft.description || '').length} chars
                    </span>
                  </div>
                  <textarea
                    className="app-input w-full rounded-xl px-4 py-3 text-sm h-28 resize-none soft-scrollbar"
                    placeholder="Provide a clear, brief statement of deliverables or context..."
                    value={taskDraft.description}
                    onChange={(e) => setTaskDraft(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>

              {/* Section 3: Progress Slider & Ring */}
              <div className="bg-gray-50/50 dark:bg-white/2 border border-gray-100 dark:border-white/5 rounded-2xl p-4.5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Completion Status
                  </span>
                  <div className="flex items-center gap-3">
                    {/* Circle Ring Progress */}
                    <div className="relative h-9 w-9">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle
                          className="text-gray-200 dark:text-white/10"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="transparent"
                          r={radius}
                          cx="18"
                          cy="18"
                        />
                        <motion.circle
                          className="text-[#6D4AFF]"
                          strokeWidth="3.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r={radius}
                          cx="18"
                          cy="18"
                          transition={{ duration: 0.3 }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800 dark:text-gray-200">
                        {progressPercent}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#6D4AFF]"
                    value={taskDraft.progress}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTaskDraft(prev => ({
                        ...prev,
                        progress: val,
                        status: parseInt(val) === 100 ? 'completed' : parseInt(val) > 0 ? 'in_progress' : 'not_started'
                      }));
                    }}
                  />
                </div>
              </div>

              {/* Section 6: Large Notes Textarea */}
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Task Notes (Supports Markdown / Checklists)
                </label>
                <textarea
                  className="app-input w-full rounded-xl px-4 py-3 text-sm h-32 font-mono text-gray-800 dark:text-gray-200 resize-none soft-scrollbar"
                  placeholder="## Deliverables&#10;- [ ] Task A&#10;- [ ] Task B&#10;&#10;Links: [Figma](https://figma.com)"
                  value={taskDraft.notes}
                  onChange={(e) => setTaskDraft(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              {/* Section 7: Drag & Drop Attachments */}
              <div>
                <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Attachments & Files
                </label>
                <div
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                    dragOver
                      ? 'border-[#6D4AFF] bg-[#6D4AFF]/5'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => {
                    const mockFileName = prompt('Enter a mock file name to attach (e.g. syllabus.pdf, mockup.png):');
                    if (mockFileName) handleAddAttachment(mockFileName);
                  }}
                >
                  <Upload className="h-7 w-7 text-gray-400 dark:text-gray-500 mb-2" />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Drag & drop files here or <span className="text-[#6D4AFF]">click to upload</span>
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1">Supports PDF, Image, Zip up to 10MB</span>
                </div>

                {/* Attachment chips */}
                {taskDraft.attachments.split(',').map(a => a.trim()).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {taskDraft.attachments.split(',').map(a => a.trim()).filter(Boolean).map((file, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-150 dark:border-white/5 rounded-lg pl-3 pr-2 py-1.5 text-xs text-gray-700 dark:text-gray-300"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium max-w-[150px] truncate">{file}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(file); }}
                          className="text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 8: Interactive Tags Chips */}
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Tags & Metadata Labels
                </label>
                <div className="border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center gap-2 bg-white dark:bg-transparent">
                  {taskDraft.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-[#6D4AFF]/10 text-[#6D4AFF] dark:text-[#A78BFA] text-xs px-2.5 py-1 rounded-lg font-medium"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-[#6D4AFF] dark:text-[#A78BFA] hover:text-red-500 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="flex-1 min-w-[120px] bg-transparent outline-none border-none text-sm text-gray-800 dark:text-gray-100"
                    placeholder="Press enter to add..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                  />
                </div>

                {/* Predefined Tag Suggestions */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Suggestions:</span>
                  {['Exam', 'Assignment', 'Urgent', 'College', 'Hackathon', 'AI', 'Personal'].map((sug, idx) => {
                    const activeTags = taskDraft.tags.split(',').map(t => t.trim()).filter(Boolean);
                    if (activeTags.includes(sug)) return null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddTag(sug)}
                        className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-2 py-0.5 rounded-md transition"
                      >
                        + {sug}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Settings, Category, Scheduling (40% equivalent) */}
            <div className="md:col-span-5 space-y-6">
              
              {/* Category selector grid */}
              <div>
                <label className="block mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'Assignments', label: 'Assignment', icon: '📚', desc: 'Academics & coursework' },
                    { key: 'Notes to Self', label: 'Notes', icon: '📝', desc: 'Thoughts & records' },
                    { key: 'Work', label: 'Project', icon: '💻', desc: 'Work deliverables' },
                    { key: 'Event', label: 'Event', icon: '📅', desc: 'Time block blocks' },
                    { key: 'Personal', label: 'Goal', icon: '🎯', desc: 'Personal milestones' },
                    { key: 'Habit', label: 'Habit', icon: '🏋', desc: 'Daily consistency' },
                  ].map((cat) => {
                    const isSelected = currentCategory.toLowerCase().includes(cat.key.toLowerCase());
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          setTaskDraft(prev => ({
                            ...prev,
                            category: cat.key,
                            customCategory: cat.key
                          }));
                          if (cat.key === 'Assignments') setShowAcademic(true);
                        }}
                        className={`text-left rounded-xl p-3 border transition-all hover:scale-[1.02] flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#6D4AFF]/10 border-[#6D4AFF] text-[#6D4AFF] dark:text-[#A78BFA] ring-2 ring-[#6D4AFF]/15'
                            : 'bg-white dark:bg-[#171923] border-gray-200 dark:border-white/8 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="text-xl mb-1">{cat.icon}</span>
                        <div>
                          <span className="block text-xs font-bold">{cat.label}</span>
                          <span className="block text-[9px] text-gray-400 font-medium truncate">{cat.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Segmented Control */}
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </label>
                <div className="grid grid-cols-4 gap-1 bg-gray-100 dark:bg-[#1a1d2c] p-1 rounded-xl">
                  {[
                    { key: 'not_started', label: 'Todo' },
                    { key: 'in_progress', label: 'Active' },
                    { key: 'completed', label: 'Done' },
                    { key: 'waiting', label: 'Blocked' },
                  ].map((st) => {
                    const isSelected = taskDraft.status === st.key;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setTaskDraft(prev => ({ ...prev, status: st.key as any }))}
                        className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white dark:bg-[#6D4AFF] text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector Pills */}
              <div>
                <label className="block mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Priority level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'low', label: 'Low', color: '🟢', bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-emerald-200 text-emerald-700 dark:text-emerald-400', active: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/10' },
                    { key: 'medium', label: 'Medium', color: '🟡', bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 text-amber-700 dark:text-amber-400', active: 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/10' },
                    { key: 'high', label: 'High', color: '🟠', bg: 'hover:bg-orange-50 dark:hover:bg-orange-950/20 border-orange-200 text-orange-700 dark:text-orange-400', active: 'bg-orange-50 dark:bg-orange-950/40 border-orange-500 ring-2 ring-orange-500/10' },
                    { key: 'critical', label: 'Critical', color: '🔴', bg: 'hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400', active: 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/10' },
                  ].map((prio) => {
                    const isSelected = taskDraft.priority === prio.key;
                    return (
                      <button
                        key={prio.key}
                        type="button"
                        onClick={() => setTaskDraft(prev => ({ ...prev, priority: prio.key as any }))}
                        className={`py-2 px-1 border rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? prio.active
                            : 'bg-white dark:bg-[#171923] border-gray-200 dark:border-white/8 text-gray-600 dark:text-gray-400 ' + prio.bg
                        }`}
                      >
                        <span>{prio.color}</span>
                        <span>{prio.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 📅 AI Calendar Scheduling Auto Planner Toggle */}
              <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 dark:border-purple-500/10 rounded-2xl p-4.5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                    <div>
                      <span className="block text-xs font-bold text-gray-800 dark:text-gray-200">
                        📅 Schedule in Calendar
                      </span>
                      <span className="block text-[9px] text-gray-400 dark:text-gray-500 font-medium">
                        AI will find the optimal slot based on availability & priorities
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={taskDraft.scheduleInCalendar || false}
                      onChange={(e) => setTaskDraft(prev => ({ ...prev, scheduleInCalendar: e.target.checked }))}
                    />
                    <div className="w-9 h-5 bg-gray-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <AnimatePresence>
                  {taskDraft.scheduleInCalendar && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 overflow-hidden border-t border-purple-500/10 pt-4"
                    >
                      {/* Preferred Time Grid */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Preferred Time Window
                        </label>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[
                            { key: 'morning', label: 'Morning', icon: '🌅' },
                            { key: 'afternoon', label: 'Afternoon', icon: '☀️' },
                            { key: 'evening', label: 'Evening', icon: '🌇' },
                            { key: 'night', label: 'Night', icon: '🌌' },
                            { key: 'anytime', label: 'Anytime', icon: '⏱️' },
                          ].map((timeOpt) => {
                            const isSelected = (taskDraft.preferredTime || 'anytime') === timeOpt.key;
                            return (
                              <button
                                key={timeOpt.key}
                                type="button"
                                onClick={() => setTaskDraft(prev => ({ ...prev, preferredTime: timeOpt.key as any }))}
                                className={`py-2 border rounded-xl text-[10px] font-bold text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500/20'
                                    : 'bg-white dark:bg-[#171923] border-gray-200 dark:border-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                <span className="text-sm">{timeOpt.icon}</span>
                                <span>{timeOpt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Estimated Duration presets */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Estimated Duration
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: '15m', val: '15' },
                            { label: '30m', val: '30' },
                            { label: '45m', val: '45' },
                            { label: '1 hr', val: '60' },
                            { label: '2 hr', val: '120' },
                          ].map((dur) => {
                            const isSelected = taskDraft.durationMinutes === dur.val;
                            return (
                              <button
                                key={dur.val}
                                type="button"
                                onClick={() => setTaskDraft(prev => ({ ...prev, durationMinutes: dur.val }))}
                                className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-bold cursor-pointer transition ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                    : 'bg-white dark:bg-[#171923] border-gray-200 dark:border-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                                }`}
                              >
                                {dur.label}
                              </button>
                            );
                          })}
                          
                          {/* Custom input */}
                          <div className="flex items-center gap-1 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-lg px-2 py-0.5">
                            <input
                              type="number"
                              min="5"
                              max="480"
                              placeholder="Custom"
                              value={['15','30','45','60','120'].includes(taskDraft.durationMinutes) ? '' : taskDraft.durationMinutes}
                              onChange={(e) => setTaskDraft(prev => ({ ...prev, durationMinutes: e.target.value }))}
                              className="w-12 text-[10px] font-bold bg-transparent text-gray-800 dark:text-gray-200 outline-none border-none p-0 text-center"
                            />
                            <span className="text-[9px] text-gray-400 font-bold">m</span>
                          </div>
                        </div>
                      </div>

                      {/* Scheduling Boundaries */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                            Earliest Start Date
                          </label>
                          <input
                            type="date"
                            value={taskDraft.earliestStartDate || ''}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, earliestStartDate: e.target.value }))}
                            className="w-full text-xs bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                            Latest Finish Time
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 11:00 PM"
                            value={taskDraft.latestFinishTime || ''}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, latestFinishTime: e.target.value }))}
                            className="w-full text-xs bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 font-medium"
                          />
                        </div>
                      </div>

                      {/* Fixed Specific Slot & Break Toggles */}
                      <div className="grid grid-cols-2 gap-3 border-t border-purple-500/5 pt-3 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={!(taskDraft.flexibleScheduling ?? true)}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, flexibleScheduling: !e.target.checked }))}
                          />
                          <span>Lock / Fixed Time Slot</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            checked={taskDraft.breakAfterTask || false}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, breakAfterTask: e.target.checked }))}
                          />
                          <span>Add Break Buffer (10m)</span>
                        </label>
                      </div>

                      {!(taskDraft.flexibleScheduling ?? true) && (
                        <div className="space-y-1.5 animate-fadeIn">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Fixed Start Time
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 10:00 AM"
                            value={taskDraft.fixedTime || ''}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, fixedTime: e.target.value }))}
                            className="w-full text-xs bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl px-3 py-2 text-gray-800 dark:text-gray-200 outline-none focus:border-purple-500 font-medium"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Section 2: Schedule Row (Date | Start | End | Duration) */}
              <div className="bg-gray-50/50 dark:bg-white/2 border border-gray-100 dark:border-white/5 rounded-2xl p-4.5 space-y-3">
                <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Schedule Grid
                </span>
                
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {/* Date Pick Trigger */}
                  <div className="relative" ref={datePickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="w-full flex flex-col justify-center items-center py-2 px-1 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl transition hover:border-[#6D4AFF] h-14"
                    >
                      <CalendarIcon className="h-4 w-4 text-[#6D4AFF] mb-1" />
                      <span className="font-bold text-gray-800 dark:text-gray-200 truncate w-full px-1">
                        {getFormattedDateString(taskDraft.dueDate)}
                      </span>
                    </button>

                    {/* Date Picker Custom Popover */}
                    <AnimatePresence>
                      {showDatePicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 sm:left-0 mt-2 z-50 bg-white dark:bg-[#181a28] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl p-4 w-[280px]"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                            >
                              &lt;
                            </button>
                            <span className="font-bold text-xs text-gray-800 dark:text-gray-200">
                              {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                            >
                              &gt;
                            </button>
                          </div>

                          {/* Grid for Calendar days */}
                          <div className="grid grid-cols-7 gap-1 text-center mb-3">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                              <span key={idx} className="text-[10px] font-bold text-gray-400">{day}</span>
                            ))}
                            {getCalendarDays().map((day, idx) => {
                              if (!day) return <div key={idx} />;
                              const isToday = new Date().toDateString() === day.toDateString();
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectCalendarDate(day)}
                                  className={`h-7 w-7 rounded-lg text-xs font-medium flex items-center justify-center cursor-pointer ${
                                    isToday
                                      ? 'bg-[#6D4AFF] text-white'
                                      : 'hover:bg-gray-150 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {day.getDate()}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick selection options */}
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-gray-100 dark:border-white/5 text-[11px]">
                            <button
                              type="button"
                              onClick={() => handleQuickDate('today')}
                              className="py-1 px-2 text-left bg-gray-50 dark:bg-white/5 rounded text-gray-600 dark:text-gray-400 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF]"
                            >
                              📅 Today
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDate('tomorrow')}
                              className="py-1 px-2 text-left bg-gray-50 dark:bg-white/5 rounded text-gray-600 dark:text-gray-400 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF]"
                            >
                              🌅 Tomorrow
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDate('weekend')}
                              className="py-1 px-2 text-left bg-gray-50 dark:bg-white/5 rounded text-gray-600 dark:text-gray-400 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF]"
                            >
                              🏕️ Weekend
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDate('next_week')}
                              className="py-1 px-2 text-left bg-gray-50 dark:bg-white/5 rounded text-gray-600 dark:text-gray-400 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF]"
                            >
                              🚀 Next Week
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Start time */}
                  <div className="relative" ref={startTimePickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowStartTimePicker(!showStartTimePicker)}
                      className="w-full flex flex-col justify-center items-center py-2 px-1 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl transition hover:border-[#6D4AFF] h-14"
                    >
                      <Clock className="h-4 w-4 text-[#8B5CF6] mb-1" />
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {taskDraft.dueTime || '12:00 PM'}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showStartTimePicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 mt-2 z-50 bg-white dark:bg-[#181a28] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl w-[140px] max-h-[200px] overflow-y-auto soft-scrollbar py-2"
                        >
                          {generateTimes().map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const oldStart = timeToMinutes(taskDraft.dueTime || '12:00 PM');
                                const newStart = timeToMinutes(t);
                                const diff = newStart - oldStart;
                                const curEnd = timeToMinutes(taskDraft.endTime || minutesToTimeStr(oldStart + parseInt(taskDraft.durationMinutes || '30')));
                                
                                setTaskDraft(prev => ({
                                  ...prev,
                                  dueTime: t,
                                  endTime: minutesToTimeStr(curEnd + diff)
                                }));
                                setShowStartTimePicker(false);
                              }}
                              className="w-full py-1.5 px-3 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF] font-medium"
                            >
                              {t}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* End time */}
                  <div className="relative" ref={endTimePickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowEndTimePicker(!showEndTimePicker)}
                      className="w-full flex flex-col justify-center items-center py-2 px-1 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl transition hover:border-[#6D4AFF] h-14"
                    >
                      <Clock className="h-4 w-4 text-orange-400 mb-1" />
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {taskDraft.endTime || minutesToTimeStr(timeToMinutes(taskDraft.dueTime || '12:00 PM') + parseInt(taskDraft.durationMinutes || '30'))}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showEndTimePicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute left-0 mt-2 z-50 bg-white dark:bg-[#181a28] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl w-[140px] max-h-[200px] overflow-y-auto soft-scrollbar py-2"
                        >
                          {generateTimes().map((t, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const start = timeToMinutes(taskDraft.dueTime || '12:00 PM');
                                const newEnd = timeToMinutes(t);
                                const duration = newEnd >= start ? newEnd - start : (newEnd + 1440) - start;
                                
                                setTaskDraft(prev => ({
                                  ...prev,
                                  endTime: t,
                                  durationMinutes: String(duration)
                                }));
                                setShowEndTimePicker(false);
                              }}
                              className="w-full py-1.5 px-3 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF] font-medium"
                            >
                              {t}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Duration input */}
                  <div className="relative" ref={durationPickerRef}>
                    <button
                      type="button"
                      onClick={() => setShowDurationPicker(!showDurationPicker)}
                      className="w-full flex flex-col justify-center items-center py-2 px-1 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl transition hover:border-[#6D4AFF] h-14"
                    >
                      <Clock className="h-4 w-4 text-emerald-400 mb-1" />
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {parseInt(taskDraft.durationMinutes || '30') >= 60
                          ? `${Math.floor(parseInt(taskDraft.durationMinutes || '30') / 60)}h ${parseInt(taskDraft.durationMinutes || '30') % 60}m`
                          : `${taskDraft.durationMinutes || '30'} mins`}
                      </span>
                    </button>

                    <AnimatePresence>
                      {showDurationPicker && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 z-50 bg-white dark:bg-[#181a28] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl w-[140px] py-2"
                        >
                          {[15, 30, 45, 60, 90, 120, 180, 240].map((mins) => (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => {
                                const start = timeToMinutes(taskDraft.dueTime || '12:00 PM');
                                const newEnd = start + mins;
                                setTaskDraft(prev => ({
                                  ...prev,
                                  durationMinutes: String(mins),
                                  endTime: minutesToTimeStr(newEnd)
                                }));
                                setShowDurationPicker(false);
                              }}
                              className="w-full py-1.5 px-3 text-left text-xs text-gray-700 dark:text-gray-300 hover:bg-[#6D4AFF]/10 hover:text-[#6D4AFF] font-medium"
                            >
                              {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Contextual Event Fields */}
              {isEvent && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-sky-500/5 dark:bg-sky-500/10 border border-sky-400/20 rounded-2xl p-4.5 space-y-4"
                >
                  <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 text-xs font-bold uppercase tracking-wider">
                    <MapPin className="h-4 w-4" />
                    <span>Event Details</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        Event Location
                      </label>
                      <input
                        type="text"
                        className="app-input rounded-xl text-xs py-2"
                        placeholder="Zoom link, meeting room, or address"
                        value={taskDraft.location || ''}
                        onChange={(e) => setTaskDraft(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        Guests (Email / Usernames)
                      </label>
                      <input
                        type="text"
                        className="app-input rounded-xl text-xs py-2"
                        placeholder="john@example.com, sara@example.com"
                        value={taskDraft.guests || ''}
                        onChange={(e) => setTaskDraft(prev => ({ ...prev, guests: e.target.value }))}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Contextual Habit Fields */}
              {isHabit && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-4.5 space-y-4"
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Activity className="h-4 w-4" />
                    <span>Habit Tracker Parameters</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        Frequency
                      </label>
                      <select
                        className="app-input rounded-xl text-xs py-2 animate-none"
                        value={taskDraft.repeatFrequency || 'Daily'}
                        onChange={(e) => setTaskDraft(prev => ({ ...prev, repeatFrequency: e.target.value }))}
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Monthly">Monthly</option>
                      </select>
                    </div>

                    <div>
                      <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                        Goal Target / Streak
                      </label>
                      <div className="flex items-center gap-2 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl px-2 py-1 h-9">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(taskDraft.streak || '0');
                            if (cur > 0) setTaskDraft(prev => ({ ...prev, streak: String(cur - 1) }));
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="flex-1 text-center font-bold text-xs text-gray-800 dark:text-gray-200">
                          {taskDraft.streak || '0'} streak
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(taskDraft.streak || '0');
                            setTaskDraft(prev => ({ ...prev, streak: String(cur + 1) }));
                          }}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      Habit Goal Statement
                    </label>
                    <input
                      type="text"
                      className="app-input rounded-xl text-xs py-2"
                      placeholder="e.g. Code for at least 30 minutes every day"
                      value={taskDraft.goal || ''}
                      onChange={(e) => setTaskDraft(prev => ({ ...prev, goal: e.target.value }))}
                    />
                  </div>
                </motion.div>
              )}

              {/* Section 5: Academic Details (Visible if Assignment selected) */}
              {isAssignment && !isPersonal && (
                <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
                  <button
                    type="button"
                    onClick={() => setShowAcademic(!showAcademic)}
                    className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-white/2 hover:bg-gray-100 dark:hover:bg-white/5 border-b border-gray-200 dark:border-white/8 transition"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4.5 w-4.5 text-[#6D4AFF]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        Academic details
                      </span>
                    </div>
                    {showAcademic ? (
                      <ChevronUp className="h-4.5 w-4.5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4.5 w-4.5 text-gray-500" />
                    )}
                  </button>

                  <AnimatePresence initial={false}>
                    {showAcademic && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4.5 space-y-4 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block mb-1 font-semibold text-gray-500 dark:text-gray-400">
                                Subject
                              </label>
                              <input
                                type="text"
                                className="app-input rounded-xl text-xs py-2"
                                placeholder="DBMS, Math, Physics..."
                                value={taskDraft.subject}
                                onChange={(e) => setTaskDraft(prev => ({ ...prev, subject: e.target.value }))}
                              />
                            </div>
                            <div>
                              <label className="block mb-1 font-semibold text-gray-500 dark:text-gray-400">
                                Faculty
                              </label>
                              <input
                                type="text"
                                className="app-input rounded-xl text-xs py-2"
                                placeholder="Professor Name"
                                value={taskDraft.faculty}
                                onChange={(e) => setTaskDraft(prev => ({ ...prev, faculty: e.target.value }))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            {/* Project Field */}
                            <div>
                              <label className="block mb-1 font-semibold text-gray-500 dark:text-gray-400">
                                Project Link
                              </label>
                              <input
                                type="text"
                                className="app-input rounded-xl text-xs py-2"
                                placeholder="e.g. Capstone, DBMS Lab"
                                value={taskDraft.projectName}
                                onChange={(e) => setTaskDraft(prev => ({ ...prev, projectName: e.target.value }))}
                              />
                            </div>

                            {/* Estimated Hours Stepper */}
                            <div>
                              <label className="block mb-1 font-semibold text-gray-500 dark:text-gray-400">
                                Est. Hours
                              </label>
                              <div className="flex items-center gap-2 bg-white dark:bg-[#171923] border border-gray-200 dark:border-white/8 rounded-xl px-2 py-1 h-9">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(taskDraft.estimatedHours || '1');
                                    if (cur > 0.5) setTaskDraft(prev => ({ ...prev, estimatedHours: String(cur - 0.5) }));
                                  }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="flex-1 text-center font-bold text-xs text-gray-800 dark:text-gray-200">
                                  {taskDraft.estimatedHours || '1'} hrs
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = parseFloat(taskDraft.estimatedHours || '1');
                                    setTaskDraft(prev => ({ ...prev, estimatedHours: String(cur + 0.5) }));
                                  }}
                                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded text-gray-600 dark:text-gray-400"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Marks Weightage Slider */}
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="font-semibold text-gray-500 dark:text-gray-400">
                                Marks Weightage
                              </label>
                              <span className="font-bold text-gray-800 dark:text-gray-200">
                                {taskDraft.marksWeightage || '0'}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#8B5CF6]"
                              value={taskDraft.marksWeightage}
                              onChange={(e) => setTaskDraft(prev => ({ ...prev, marksWeightage: e.target.value }))}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Advanced Settings Collapsible Card */}
              <div className="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-transparent">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-50 dark:bg-white/2 hover:bg-gray-100 dark:hover:bg-white/5 border-b border-gray-200 dark:border-white/8 transition"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-[#8B5CF6]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Advanced settings
                    </span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="h-4.5 w-4.5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4.5 w-4.5 text-gray-500" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4.5 space-y-4 text-xs">
                        
                        {/* Repeat rule */}
                        <div>
                          <label className="block mb-1.5 font-semibold text-gray-500 dark:text-gray-400">
                            Repeat Rule
                          </label>
                          <select
                            className="app-input rounded-xl text-xs py-2 cursor-pointer"
                            value={taskDraft.repeatRule}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, repeatRule: e.target.value as any }))}
                          >
                            <option value="">Does not repeat</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        {/* Reminder & Notification Group */}
                        <div className="bg-gray-50 dark:bg-white/2 p-3 rounded-xl space-y-3.5">
                          <div className="flex items-center justify-between">
                            <label className="inline-flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-[#6D4AFF] focus:ring-[#6D4AFF]"
                                checked={taskDraft.reminder}
                                onChange={(e) => setTaskDraft(prev => ({ ...prev, reminder: e.target.checked }))}
                              />
                              Enable Reminders
                            </label>
                          </div>
                          
                          {taskDraft.reminder && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="pt-2 border-t border-gray-150 dark:border-white/5"
                            >
                              <label className="block mb-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                Send Notification
                              </label>
                              <select
                                className="app-input rounded-xl text-xs py-1.5 cursor-pointer"
                                value={taskDraft.reminderMinutesBefore}
                                onChange={(e) => setTaskDraft(prev => ({ ...prev, reminderMinutesBefore: e.target.value }))}
                              >
                                <option value="0">At time of event</option>
                                <option value="5">5 minutes before</option>
                                <option value="15">15 minutes before</option>
                                <option value="30">30 minutes before</option>
                                <option value="60">1 hour before</option>
                                <option value="1440">1 day before</option>
                              </select>
                            </motion.div>
                          )}
                        </div>

                        {/* Link Calendar Event */}
                        <label className="inline-flex items-center gap-2 font-medium text-gray-700 dark:text-gray-300 mt-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-[#6D4AFF] focus:ring-[#6D4AFF]"
                            checked={taskDraft.linkedCalendarEvent}
                            onChange={(e) => setTaskDraft(prev => ({ ...prev, linkedCalendarEvent: e.target.checked }))}
                          />
                          Automatically sync to Weekly Planner Calendar
                        </label>

                        {/* Metadata display */}
                        <div className="pt-2 border-t border-gray-150 dark:border-white/5 flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                          <Info className="h-3 w-3" />
                          <span>
                            {taskFormMode === 'edit'
                              ? `Editing existing record ID: ${editingTaskId}`
                              : 'Brand new record, initialized now'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>
        </form>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 border-t border-gray-150 dark:border-white/8 bg-white dark:bg-[#121420] px-6 py-4.5 flex justify-between items-center z-10">
          <div>
            <button
              type="button"
              onClick={onClose}
              className="app-button-secondary py-2.5 px-4 font-bold text-xs"
            >
              Cancel
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {taskFormMode === 'create' && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-white/8 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
              >
                Save Draft
              </button>
            )}
            
            <button
              type="button"
              onClick={(e) => {
                // Manually trigger form submit
                const form = (e.target as HTMLElement).closest('form') || document.querySelector('form');
                if (form) {
                  const event = new Event('submit', { cancelable: true, bubbles: true });
                  form.dispatchEvent(event);
                }
              }}
              className="app-button-primary py-2.5 px-6 font-bold text-xs shadow-lg shadow-[#6D4AFF]/20 hover:shadow-[#6D4AFF]/30
                bg-gradient-to-r from-[#6D4AFF] to-[#8B5CF6] relative overflow-hidden"
            >
              {taskFormMode === 'edit' ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
