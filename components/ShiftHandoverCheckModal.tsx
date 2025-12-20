import React, { useState } from 'react';
import { ListChecks, AlertTriangle, Minimize2, CheckSquare, Square } from 'lucide-react';
import { HandoverItem } from '../types';

interface Props {
    onClose: () => void;
    handoverList: HandoverItem[];
    setHandoverList: React.Dispatch<React.SetStateAction<HandoverItem[]>>;
}

const ShiftHandoverCheckModal: React.FC<Props> = ({ onClose, handoverList, setHandoverList }) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const incompleteItems = handoverList.filter(i => i.record === 1 || i.assess === 1 || i.observe === 1 || i.pain === 1);
    const isAllDone = incompleteItems.length === 0;

    const toggleStatus = (id: number, field: 'record' | 'assess' | 'observe' | 'pain') => {
        setHandoverList(prev => prev.map(item => {
            if (item.id === id) {
                if (item[field] === 1) return { ...item, [field]: 2 };
                if (item[field] === 2) return { ...item, [field]: 1 };
            }
            return item;
        }));
    };

    if (isMinimized) {
        return (
            <div className="fixed bottom-20 right-6 z-[70] animate-pulse cursor-pointer" onClick={() => setIsMinimized(false)}>
                <div className="bg-red-500/90 text-white p-4 rounded-full shadow-[0_0_25px_rgba(239,68,68,0.6)] border-4 border-white/40 flex items-center gap-2 hover:scale-110 transition-transform backdrop-blur-md">
                    <ListChecks size={32} />
                    <span className="font-bold text-xs text-center leading-tight">交班<br/>未完</span>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border-t-8 border-red-500 ring-1 ring-white/50">
                <div className="p-5 border-b border-white/50 flex justify-between items-center bg-red-50/30">
                     <div className="flex items-center gap-3 text-red-600">
                        <div className="bg-red-100 p-2 rounded-xl"><AlertTriangle size={24} /></div>
                        <h3 className="text-xl font-bold tracking-tight">交班事項未完成提醒</h3>
                     </div>
                     <button onClick={() => setIsMinimized(true)} className="text-slate-400 hover:text-slate-600 bg-white/50 p-2 rounded-full hover:bg-white transition-all"><Minimize2 size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isAllDone ? (
                        <div className="text-center py-10 text-emerald-600 flex flex-col items-center gap-4">
                            <div className="bg-emerald-100 p-4 rounded-full shadow-lg shadow-emerald-200"><CheckSquare size={64} /></div>
                            <span className="text-2xl font-bold">太棒了！所有事項已完成。</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-slate-600 font-bold text-lg bg-white/40 p-3 rounded-xl inline-block border border-white/50">以下床號仍有未完成事項，請點擊確認完成：</p>
                            {incompleteItems.map(item => (
                                <div key={item.id} className="bg-red-50/80 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm backdrop-blur-sm">
                                    <span className="font-bold text-xl text-red-800 bg-white/80 px-4 py-2 rounded-xl shadow-sm">床 {item.bed || '?'}</span>
                                    <div className="flex gap-3 flex-wrap">
                                        {item.record === 1 && <button onClick={() => toggleStatus(item.id, 'record')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-red-600 hover:bg-red-50 hover:shadow-md transition-all font-bold"><Square size={18}/> 護理紀錄</button>}
                                        {item.assess === 1 && <button onClick={() => toggleStatus(item.id, 'assess')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-red-600 hover:bg-red-50 hover:shadow-md transition-all font-bold"><Square size={18}/> 身心評估</button>}
                                        {item.observe === 1 && <button onClick={() => toggleStatus(item.id, 'observe')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-red-600 hover:bg-red-50 hover:shadow-md transition-all font-bold"><Square size={18}/> 密觀單</button>}
                                        {item.pain === 1 && <button onClick={() => toggleStatus(item.id, 'pain')} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-100 rounded-xl text-red-600 hover:bg-red-50 hover:shadow-md transition-all font-bold"><Square size={18}/> 疼痛評估</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-white/50 bg-white/40 backdrop-blur-md flex gap-4 justify-end rounded-b-3xl">
                    <button onClick={() => setIsMinimized(true)} className="px-6 py-3 text-slate-600 hover:bg-white/60 rounded-xl font-bold transition-colors">稍後處理 (縮小)</button>
                    <button onClick={isAllDone ? onClose : undefined} className={`px-8 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${isAllDone ? 'bg-emerald-500 hover:bg-emerald-600 hover:scale-105' : 'bg-slate-300 cursor-not-allowed'}`}>已全部完成</button>
                </div>
            </div>
        </div>
    );
};

export default ShiftHandoverCheckModal;