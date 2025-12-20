import React, { useState } from 'react';
import { ClipboardCheck, Minimize2, CheckSquare, Square, AlertTriangle, LogOut } from 'lucide-react';
import { ADMISSION_CHECKLIST, DISCHARGE_CHECKLIST } from '../constants';

interface Props {
    onClose: () => void;
    type: 'admission' | 'discharge' | null;
}

const ChecklistModal: React.FC<Props> = ({ onClose, type }) => {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [isMinimized, setIsMinimized] = useState(false);
    const [highlightItem, setHighlightItem] = useState<string | null>(null);

    const checklistData = type === 'discharge' ? DISCHARGE_CHECKLIST : ADMISSION_CHECKLIST;

    const allItems = [
        ...checklistData.before.map((text, i) => ({ id: `before-${i}`, text, type: 'before' })),
        ...checklistData.after.map((text, i) => ({ id: `after-${i}`, text, type: 'after' }))
    ];

    const totalCount = allItems.length;
    const checkedCount = Object.values(checkedItems).filter(Boolean).length;
    const progress = Math.round((checkedCount / totalCount) * 100);

    const toggleCheck = (id: string) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
        if (highlightItem === id) setHighlightItem(null);
    };

    const handleComplete = () => {
        const firstUnchecked = allItems.find(item => !checkedItems[item.id]);
        if (firstUnchecked) {
            setHighlightItem(firstUnchecked.id);
            const element = document.getElementById(firstUnchecked.id);
            if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            onClose();
        }
    };

    const isDischarge = type === 'discharge';
    const title = isDischarge ? '出院護理檢核表' : '入院護理檢核表';
    const colorTheme = isDischarge 
        ? { 
            header: 'from-violet-600 to-fuchsia-500', 
            step1: { text: 'text-violet-800', bg: 'bg-violet-100', border: 'border-violet-200' },
            step2: { text: 'text-fuchsia-800', bg: 'bg-fuchsia-100', border: 'border-fuchsia-200' }
          } 
        : { 
            header: 'from-blue-600 to-cyan-500', 
            step1: { text: 'text-blue-800', bg: 'bg-blue-100', border: 'border-blue-200' },
            step2: { text: 'text-emerald-800', bg: 'bg-emerald-100', border: 'border-emerald-200' }
          };

    if (isMinimized) {
        return (
            <div className="fixed bottom-6 right-6 z-50 animate-pulse cursor-pointer" onClick={() => setIsMinimized(false)}>
                <div className={`text-white p-4 rounded-full border-4 border-white/50 backdrop-blur-md flex items-center gap-2 hover:scale-110 transition-transform ${isDischarge ? 'bg-fuchsia-500/90 shadow-[0_0_20px_rgba(217,70,239,0.6)]' : 'bg-yellow-400/90 text-yellow-900 shadow-[0_0_20px_rgba(250,204,21,0.6)]'}`}>
                    {isDischarge ? <LogOut size={32} /> : <ClipboardCheck size={32} />}
                    <span className="font-bold text-sm">{isDischarge ? '出院中...' : '入院中...'}<br />({progress}%)</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-white/50">
                <div className={`bg-gradient-to-r ${colorTheme.header} p-5 rounded-t-3xl flex justify-between items-center shrink-0 shadow-lg relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/10 opacity-50 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/30 to-transparent"></div>
                    <div className="flex items-center gap-4 text-white relative z-10">
                        <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">{isDischarge ? <LogOut size={28}/> : <ClipboardCheck size={28} />}</div>
                        <div><h3 className="text-xl font-bold leading-none tracking-tight">{title}</h3><span className="text-xs text-white/80 mt-1 block font-medium opacity-80">完成度: {checkedCount} / {totalCount}</span></div>
                    </div>
                    <button onClick={() => setIsMinimized(true)} className="text-white bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all relative z-10" title="縮小"><Minimize2 size={20} /></button>
                </div>
                <div className="h-2 w-full bg-slate-100/50"><div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(34,197,94,0.5)]" style={{ width: `${progress}%` }}></div></div>
                <div className="overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section>
                        <h4 className={`${colorTheme.step1.text} font-bold text-lg mb-4 flex items-center gap-3 sticky top-0 bg-white/80 backdrop-blur-xl p-2 rounded-xl z-10 shadow-sm border border-white/50`}>
                            <span className={`${colorTheme.step1.bg} px-3 py-1 rounded-lg text-xs uppercase tracking-wider`}>Step 1</span> {isDischarge ? '行政與準備' : '入院前準備'}
                        </h4>
                        <div className="space-y-3">
                            {checklistData.before.map((text, idx) => {
                                const id = `before-${idx}`;
                                const isHighlighted = highlightItem === id;
                                return (
                                    <div key={id} id={id} onClick={() => toggleCheck(id)} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all border duration-300 ${isHighlighted ? 'bg-red-50/80 border-red-400 shadow-[0_0_15px_rgba(248,113,113,0.4)] scale-105' : checkedItems[id] ? `${colorTheme.step1.bg} ${colorTheme.step1.border}` : 'bg-white/60 border-white/60 hover:bg-white/80 hover:shadow-md'}`}>
                                        <div className={`mt-0.5 shrink-0 transition-all ${checkedItems[id] ? 'text-indigo-500' : isHighlighted ? 'text-red-500' : 'text-slate-300'}`}>{checkedItems[id] ? <CheckSquare size={22} className="drop-shadow-sm" /> : <Square size={22} />}</div>
                                        <div className="flex-grow"><span className={`text-base leading-relaxed block transition-colors ${checkedItems[id] ? 'text-slate-400 line-through' : isHighlighted ? 'text-red-700 font-bold' : 'text-slate-700 font-medium'}`}>{text}</span>{isHighlighted && <span className="text-xs text-red-500 font-bold mt-2 block bg-red-100 inline-block px-2 py-1 rounded">← 請確認此項目！</span>}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                    <section>
                        <h4 className={`${colorTheme.step2.text} font-bold text-lg mb-4 flex items-center gap-3 sticky top-0 bg-white/80 backdrop-blur-xl p-2 rounded-xl z-10 shadow-sm border border-white/50`}>
                            <span className={`${colorTheme.step2.bg} px-3 py-1 rounded-lg text-xs uppercase tracking-wider`}>Step 2</span> {isDischarge ? '關帳與紀錄' : '入院後執行'}
                        </h4>
                        <div className="space-y-3">
                            {checklistData.after.map((text, idx) => {
                                const id = `after-${idx}`;
                                const isHighlighted = highlightItem === id;
                                return (
                                    <div key={id} id={id} onClick={() => toggleCheck(id)} className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all border duration-300 ${isHighlighted ? 'bg-red-50/80 border-red-400 shadow-[0_0_15px_rgba(248,113,113,0.4)] scale-105' : checkedItems[id] ? `${colorTheme.step2.bg} ${colorTheme.step2.border}` : 'bg-white/60 border-white/60 hover:bg-white/80 hover:shadow-md'}`}>
                                        <div className={`mt-0.5 shrink-0 transition-all ${checkedItems[id] ? 'text-emerald-500' : isHighlighted ? 'text-red-500' : 'text-slate-300'}`}>{checkedItems[id] ? <CheckSquare size={22} className="drop-shadow-sm" /> : <Square size={22} />}</div>
                                        <div className="flex-grow"><span className={`text-base leading-relaxed block transition-colors ${checkedItems[id] ? 'text-slate-400 line-through' : isHighlighted ? 'text-red-700 font-bold' : 'text-slate-700 font-medium'}`}>{text}</span>{isHighlighted && <span className="text-xs text-red-500 font-bold mt-2 block bg-red-100 inline-block px-2 py-1 rounded">← 請確認此項目！</span>}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
                <div className="p-5 border-t border-white/40 bg-white/30 backdrop-blur-md flex justify-between shrink-0 items-center">
                    <button onClick={() => setIsMinimized(true)} className="text-slate-600 hover:text-slate-800 text-sm flex items-center gap-2 px-4 py-2 hover:bg-white/50 rounded-xl transition-colors font-bold"><Minimize2 size={16} /> 縮小視窗</button>
                    <button onClick={handleComplete} className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${progress === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white scale-105' : 'bg-slate-200/50 text-slate-400 cursor-not-allowed border border-white/50'}`}>{progress === 100 ? <CheckSquare size={20} /> : <AlertTriangle size={20} />} {progress === 100 ? '已完成' : '未完成'}</button>
                </div>
            </div>
        </div>
    );
};

export default ChecklistModal;