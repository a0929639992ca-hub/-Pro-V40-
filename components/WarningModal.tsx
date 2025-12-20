import React from 'react';
import { Bell, X } from 'lucide-react';

interface WarningModalProps {
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'info' | 'alarm';
}

const WarningModal: React.FC<WarningModalProps> = ({ onClose, title, message, type = 'info' }) => (
  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-in">
    <div className={`bg-white/80 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] max-w-sm w-full border border-white/50 relative overflow-hidden group`}>
      <div className={`absolute top-0 left-0 w-full h-2 ${type === 'alarm' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]'}`}></div>
      
      <div className="flex justify-between items-start mb-6">
        <div className={`flex items-center gap-3 ${type === 'alarm' ? 'text-red-600' : 'text-amber-600'}`}>
          <div className={`p-3 rounded-2xl ${type === 'alarm' ? 'bg-red-100' : 'bg-amber-100'}`}>
            <Bell className="animate-bounce" size={28} />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">{title || '重要提醒'}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white/50 p-2 rounded-full hover:bg-white transition-all"><X size={20}/></button>
      </div>
      
      <p className="text-slate-700 font-bold text-xl mb-8 leading-relaxed tracking-wide bg-white/40 p-4 rounded-2xl border border-white/50">
        {message}
      </p>
      
      <button onClick={onClose} className={`w-full py-4 font-bold rounded-2xl transition-all text-white shadow-lg text-lg active:scale-95 ${type === 'alarm' ? 'bg-gradient-to-r from-red-500 to-pink-600 hover:shadow-red-500/40' : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:shadow-amber-500/40'}`}>
        收到確認
      </button>
    </div>
  </div>
);

export default WarningModal;