import React, { useState } from 'react';
import { ListChecks, X, PlusCircle, MinusCircle, AlarmClock, Clock } from 'lucide-react';
import { HandoverItem, ExamItem } from '../types';
import StatusIcon from './StatusIcon';

interface Props {
    onClose: () => void;
    handoverList: HandoverItem[];
    setHandoverList: React.Dispatch<React.SetStateAction<HandoverItem[]>>;
    examList: ExamItem[];
    setExamList: React.Dispatch<React.SetStateAction<ExamItem[]>>;
}

const HandoverModal: React.FC<Props> = ({ onClose, handoverList, setHandoverList, examList, setExamList }) => {
    const [newExam, setNewExam] = useState<{ bed: string; name: string; time: string }>({ bed: '', name: '', time: '' });

    const toggleStatus = (id: number, field: 'record' | 'assess' | 'observe' | 'pain') => {
        setHandoverList(prev => prev.map(item => {
            if (item.id === id) {
                const nextStatus = (item[field] + 1) % 3;
                return { ...item, [field]: nextStatus };
            }
            return item;
        }));
    };

    const updateField = (id: number, field: keyof HandoverItem, val: string) => {
        setHandoverList(prev => prev.map(item => item.id === id ? { ...item, [field]: val, alerted: false } : item));
    };

    const addRow = () => setHandoverList([...handoverList, { id: Date.now(), bed: '', record: 0, assess: 0, observe: 0, pain: 0, reminder: '', reminderTime: '', alerted: false }]);
    const removeRow = (id: number) => setHandoverList(prev => prev.filter(item => item.id !== id));

    const addExam = () => {
        if (newExam.bed && newExam.name && newExam.time) {
            setExamList([...examList, { ...newExam, id: Date.now(), alerted: false }]);
            setNewExam({ bed: '', name: '', time: '' });
        }
    };
    const removeExam = (id: number) => setExamList(prev => prev.filter(x => x.id !== id));

    return (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-white/50">
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-4 rounded-t-3xl flex justify-between items-center shrink-0 shadow-lg">
                    <div className="flex items-center gap-3 text-white"><ListChecks size={24} /><h3 className="text-xl font-bold tracking-tight">交班單 & 檢查提醒</h3></div>
                    <button onClick={onClose} className="bg-white/20 p-2 rounded-full hover:bg-white/30 text-white transition-all"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <h4 className="font-bold text-indigo-800 text-lg flex items-center gap-2"><div className="w-1 h-6 bg-indigo-500 rounded-full"></div> 護理作業檢核表</h4>
                            <button onClick={addRow} className="text-sm flex items-center gap-1 bg-indigo-100/50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-200 transition-colors font-bold backdrop-blur-sm"><PlusCircle size={16} /> 新增床位</button>
                        </div>
                        <div className="bg-white/40 border border-white/50 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-white/50 text-slate-600 border-b border-white/50">
                                    <tr>
                                        <th className="p-4 text-left w-20 rounded-tl-2xl">床號</th>
                                        <th className="p-4 text-center w-20">護理紀錄</th>
                                        <th className="p-4 text-center w-20">身心評估</th>
                                        <th className="p-4 text-center w-24">密切觀察單</th>
                                        <th className="p-4 text-center w-20">疼痛評估</th>
                                        <th className="p-4 text-left">提醒/交班事項</th>
                                        <th className="p-4 text-left w-32">提醒(前5分)</th>
                                        <th className="p-4 w-12 rounded-tr-2xl"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {handoverList.map(row => (
                                        <tr key={row.id} className="border-t border-white/40 hover:bg-white/40 transition-colors">
                                            <td className="p-3"><input type="text" value={row.bed} onChange={(e) => updateField(row.id, 'bed', e.target.value)} className="w-full p-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none text-center font-bold text-slate-700 shadow-sm" placeholder="輸入" /></td>
                                            <td className="p-3 text-center"><StatusIcon status={row.record} onClick={() => toggleStatus(row.id, 'record')} /></td>
                                            <td className="p-3 text-center"><StatusIcon status={row.assess} onClick={() => toggleStatus(row.id, 'assess')} /></td>
                                            <td className="p-3 text-center"><StatusIcon status={row.observe} onClick={() => toggleStatus(row.id, 'observe')} /></td>
                                            <td className="p-3 text-center"><StatusIcon status={row.pain} onClick={() => toggleStatus(row.id, 'pain')} /></td>
                                            <td className="p-3"><input type="text" value={row.reminder} onChange={(e) => updateField(row.id, 'reminder', e.target.value)} className="w-full p-2 bg-white/50 border border-white/40 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none text-slate-700" placeholder="輸入交班事項..." /></td>
                                            <td className="p-3"><div className="flex items-center gap-2 bg-white/50 rounded-xl border border-white/40 p-1"><Clock size={16} className="text-slate-400 ml-1" /><input type="time" value={row.reminderTime} onChange={(e) => updateField(row.id, 'reminderTime', e.target.value)} className="w-full bg-transparent outline-none text-slate-700 text-sm font-medium" /></div></td>
                                            <td className="p-3 text-center"><button onClick={() => removeRow(row.id)} className="text-slate-400 hover:text-red-500 transition-colors"><MinusCircle size={20} /></button></td>
                                        </tr>
                                    ))}
                                    {handoverList.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400 italic">尚無資料，請點擊上方按鈕新增</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section>
                        <h4 className="font-bold text-red-800 text-lg flex items-center gap-2 mb-4"><div className="w-1 h-6 bg-red-500 rounded-full"></div> <AlarmClock size={20} className="text-red-600"/> 檢查提醒設定</h4>
                        <div className="bg-white/40 border border-white/50 rounded-2xl p-6 shadow-sm backdrop-blur-sm">
                            <div className="flex gap-3 mb-6">
                                <input type="text" placeholder="床號" value={newExam.bed} onChange={e => setNewExam({ ...newExam, bed: e.target.value })} className="w-24 p-3 bg-white/60 border border-white/50 rounded-xl text-sm font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-red-300" />
                                <input type="text" placeholder="檢查項目" value={newExam.name} onChange={e => setNewExam({ ...newExam, name: e.target.value })} className="flex-grow p-3 bg-white/60 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300 placeholder-slate-400" />
                                <input type="time" value={newExam.time} onChange={e => setNewExam({ ...newExam, time: e.target.value })} className="p-3 bg-white/60 border border-white/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300" />
                                <button onClick={addExam} className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 rounded-xl font-bold shadow-lg hover:shadow-red-500/30 transition-all hover:scale-105 active:scale-95">新增</button>
                            </div>
                            <div className="space-y-3">
                                {examList.map(exam => (
                                    <div key={exam.id} className="flex items-center justify-between bg-red-50/50 p-3 rounded-xl border border-red-100 backdrop-blur-sm hover:bg-red-50 transition-colors">
                                        <div className="flex items-center gap-4"><span className="font-bold text-red-800 bg-white/80 px-3 py-1 rounded-lg border border-red-200 shadow-sm">{exam.bed}</span><span className="text-slate-700 font-bold text-lg">{exam.name}</span><span className="text-slate-500 text-sm flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg"><Clock size={14} /> {exam.time}</span></div>
                                        <button onClick={() => removeExam(exam.id)} className="bg-white/50 p-2 rounded-lg text-red-400 hover:text-red-600 hover:bg-white transition-all"><X size={18} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default HandoverModal;