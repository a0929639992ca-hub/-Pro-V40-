import React, { useState, useEffect } from 'react';
import { Calendar, CheckSquare, Square, ListChecks } from 'lucide-react';
import { WEEKDAY_REMINDERS, SHIFT_SETTINGS } from '../constants';
import { ShiftType } from '../types';

interface Props {
    currentShift: ShiftType;
    setCurrentShift: (shift: ShiftType) => void;
    onOpenHandover: () => void;
}

const DailyReminder: React.FC<Props> = ({ currentShift, setCurrentShift, onOpenHandover }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [checkState, setCheckState] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const dayIndex = currentTime.getDay();
    const dateString = currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    const shortDateString = currentTime.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    const timeString = currentTime.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const reminders = WEEKDAY_REMINDERS[dayIndex] || [];

    const toggleShift = () => {
        const next = currentShift === 'A' ? 'E' : currentShift === 'E' ? 'N' : 'A';
        setCurrentShift(next);
    };

    const shift = SHIFT_SETTINGS[currentShift];

    return (
        <div className="flex items-center gap-3 text-base text-slate-700">
            {/* Clock & Reminder Pill */}
            <div className="flex items-center gap-4 bg-white/40 px-4 py-2 rounded-2xl border border-white/50 backdrop-blur-sm shadow-sm overflow-hidden max-w-[200px] md:max-w-none transition-all">
                <div className="flex flex-col shrink-0">
                    <div className="flex items-center gap-2 font-bold whitespace-nowrap leading-tight text-slate-600">
                        <Calendar size={16} className="text-indigo-500" />
                        <span className="hidden xl:inline">{dateString}</span>
                        <span className="xl:hidden">{shortDateString}</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-indigo-500 md:ml-6 ml-0 leading-none mt-1 md:mt-0">
                        {timeString}
                    </div>
                </div>
                
                {/* Vertical Divider */}
                <div className="h-8 w-px bg-slate-300/50 hidden md:block shrink-0"></div>
                
                {/* Reminders - Hidden on small screens to prevent overflow */}
                <div className="hidden lg:flex flex-wrap gap-2 items-center overflow-hidden h-8">
                    {reminders.length > 0 ? reminders.slice(0, 1).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 bg-white/60 px-3 py-1 rounded-lg border border-white/60 shadow-sm backdrop-blur-md whitespace-nowrap">
                            {item.type === 'check' ? (
                                <button onClick={() => setCheckState(!checkState)} className={`flex items-center gap-1.5 transition-all ${checkState ? 'text-green-600 font-bold line-through opacity-50' : 'text-slate-700'}`}>
                                    {checkState ? <CheckSquare size={16} /> : <Square size={16} />} {item.content}
                                </button>
                            ) : <span className="text-slate-700 font-medium truncate max-w-[150px]">{item.content}</span>}
                        </div>
                    )) : <span className="text-slate-400 italic text-sm whitespace-nowrap">無提醒</span>}
                </div>
            </div>

            {/* Buttons Group */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={toggleShift}
                    className={`glass-button flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 rounded-xl text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${shift.color.replace('bg-', 'bg-opacity-20 ')}`}
                    title={`目前班別: ${shift.label} (點擊切換)`}
                    style={{ background: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.6)' }}
                >
                    {shift.icon} <span className="text-slate-700 hidden md:inline">{shift.label}</span>
                </button>
                <button
                    onClick={onOpenHandover}
                    className="bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-700 text-white w-10 h-10 md:w-auto md:h-auto md:px-5 md:py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/30 whitespace-nowrap active:scale-95"
                    title="交班單"
                >
                    <ListChecks size={18} /> <span className="hidden md:inline">交班單</span>
                </button>
            </div>
        </div>
    );
};

export default DailyReminder;