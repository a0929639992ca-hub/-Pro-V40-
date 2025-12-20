import React from 'react';
import { ClipboardCheck } from 'lucide-react';

interface StatusIconProps {
    status: number;
    onClick?: () => void;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status, onClick }) => {
    let content = <div className="w-6 h-6 rounded-full border-2 border-slate-200 bg-slate-50"></div>;
    if (status === 1) content = <div className="w-6 h-6 rounded bg-red-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">待</div>;
    if (status === 2) content = <div className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center shadow-sm"><ClipboardCheck size={16} /></div>;
    
    return (
        <div onClick={onClick} className={`flex justify-center ${onClick ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}>
            {content}
        </div>
    );
};

export default StatusIcon;