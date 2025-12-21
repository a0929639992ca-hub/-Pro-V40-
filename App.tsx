
import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, Trash2, Brain, Layers, Activity, ChevronDown, ChevronUp, FileText, Stethoscope, User, Lock, Ambulance, LogIn, Bell, X, Calendar, CheckSquare, Square, AlertTriangle, Sparkles, Loader2, Moon, ClipboardCheck, Minimize2, Maximize2, ListChecks, Clock, PlusCircle, MinusCircle, AlarmClock, Sun, Sunset, Moon as MoonIcon, Copy, Syringe, Pill, LocateFixed, MoreHorizontal, Download, Upload, FileJson, LogOut } from 'lucide-react';
import DailyReminder from './components/DailyReminder';
import ChecklistModal from './components/ChecklistModal';
import HandoverModal from './components/HandoverModal';
import ShiftHandoverCheckModal from './components/ShiftHandoverCheckModal';
import WarningModal from './components/WarningModal';
import { WEEKDAY_REMINDERS, SHIFT_SETTINGS, COMMON_A_OPTIONS, COMMON_R_OPTIONS, COMMON_D_OBSERVATIONS, NANDA_FOCUS_DATA, MSE_COMMON_DATA, RELATION_OPTIONS, OTHER_SYMPTOM_SUBTYPES } from './constants';
import { ShiftType, ExamItem, HandoverItem } from './types';
import { polishNursingNote, suggestNursingActions } from './services/geminiService';

const PsychNursingProV42_0 = () => {
  const [selectedFocus, setSelectedFocus] = useState('discharge_planning');
  const [selectedMSE, setSelectedMSE] = useState<string[]>([]);
  const [selectedSubjective, setSelectedSubjective] = useState<string[]>([]);
  const [visitorName, setVisitorName] = useState(''); 
  const [restraintReason, setRestraintReason] = useState('預防跌倒'); 
  const [restraintType, setRestraintType] = useState('自願性');
  const [restraintScope, setRestraintScope] = useState('四肢約束');
  const [medicalTeamType, setMedicalTeamType] = useState('值班醫療團隊'); 
  const [record, setRecord] = useState({ D: '', A: '', R: '', T: '' });
  
  const [otherSymptomType, setOtherSymptomType] = useState<keyof typeof OTHER_SYMPTOM_SUBTYPES>('esketamine');
  const [esketamineTime, setEsketamineTime] = useState('');
  const [colonoscopyDate, setColonoscopyDate] = useState('');
  const [colonoscopyTime, setColonoscopyTime] = useState('');
  const [injectionSite, setInjectionSite] = useState('');

  const [customSleepTime, setCustomSleepTime] = useState('22:00');
  const [customWakeTime, setCustomWakeTime] = useState('06:30');

  const [activeMseCategory, setActiveMseCategory] = useState<string>('affect');
  const [warningModal, setWarningModal] = useState<any>(null); 
  const [checklistType, setChecklistType] = useState<'admission' | 'discharge' | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showShiftHandoverModal, setShowShiftHandoverModal] = useState(false); 
  
  const [currentShift, setCurrentShift] = useState<ShiftType>('A');
  const [handoverList, setHandoverList] = useState<HandoverItem[]>([
      { id: 1, bed: '', record: 0, assess: 0, observe: 0, pain: 0, painValue: '', reminder: '', reminderTime: '', alerted: false },
      { id: 2, bed: '', record: 0, assess: 0, observe: 0, pain: 0, painValue: '', reminder: '', reminderTime: '', alerted: false },
      { id: 3, bed: '', record: 0, assess: 0, observe: 0, pain: 0, painValue: '', reminder: '', reminderTime: '', alerted: false },
  ]);
  const [examList, setExamList] = useState<ExamItem[]>([]);

  const [fallsD, setFallsD] = useState<string[]>([]); 
  const [sleepD, setSleepD] = useState<string[]>([]); 
  const [sendExamD, setSendExamD] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState({ d: false, a: false });
  const [customSubjective, setCustomSubjective] = useState('');

  const handoverListRef = useRef(handoverList);
  const examListRef = useRef(examList);
  const currentShiftRef = useRef(currentShift);
  const showShiftHandoverModalRef = useRef(showShiftHandoverModal);
  const lastTriggeredRef = useRef<{type: string, time: string}>({ type: '', time: '' });

  // 分頁標題閃爍邏輯
  useEffect(() => {
    let interval: any = null;
    const originalTitle = "精神科護理通 Pro V42.0 れんと";
    const alertTitle = "⚠️【重要提醒】⚠️";
    let showOriginal = true;

    if (warningModal) {
        interval = setInterval(() => {
            document.title = showOriginal ? originalTitle : alertTitle;
            showOriginal = !showOriginal;
        }, 500);
    } else {
        document.title = originalTitle;
        if (interval) clearInterval(interval);
    }

    return () => {
        document.title = originalTitle;
        if (interval) clearInterval(interval);
    };
  }, [warningModal]);

  useEffect(() => {
    const savedData = localStorage.getItem('psych_nursing_pro_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (parsed.handoverList) setHandoverList(parsed.handoverList);
            if (parsed.examList) setExamList(parsed.examList);
            if (parsed.record) setRecord(parsed.record);
            if (parsed.visitorName) setVisitorName(parsed.visitorName);
            if (parsed.currentShift) setCurrentShift(parsed.currentShift);
        } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('psych_nursing_pro_data', JSON.stringify({ handoverList, examList, record, visitorName, currentShift }));
  }, [handoverList, examList, record, visitorName, currentShift]);

  const handleExportData = () => {
    const data = { timestamp: new Date().toISOString(), handoverList, examList, record, visitorName, currentShift, selectedFocus, customSubjective };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NursingPro_Backup_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const parsed = JSON.parse(event.target?.result as string);
            if (window.confirm("確定要匯入資料嗎？目前的內容將被覆蓋。")) {
                if (parsed.handoverList) setHandoverList(parsed.handoverList);
                if (parsed.examList) setExamList(parsed.examList);
                if (parsed.record) setRecord(parsed.record);
                if (parsed.visitorName) setVisitorName(parsed.visitorName);
                if (parsed.currentShift) setCurrentShift(parsed.currentShift);
                alert("資料匯入成功！");
            }
        } catch (err) { alert("檔案格式錯誤。"); }
        e.target.value = '';
    };
    reader.readAsText(file);
  };

  useEffect(() => { handoverListRef.current = handoverList; }, [handoverList]);
  useEffect(() => { examListRef.current = examList; }, [examList]);
  useEffect(() => { currentShiftRef.current = currentShift; }, [currentShift]);
  useEffect(() => { showShiftHandoverModalRef.current = showShiftHandoverModal; }, [showShiftHandoverModal]);

  useEffect(() => {
      const interval = setInterval(() => {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const currentTimeStr = `${h}:${m}`;
        const totalMin = h * 60 + m;
        
        let detectedShift: ShiftType = 'A';
        if (totalMin >= 481 && totalMin <= 960) detectedShift = 'A';
        else if (totalMin >= 961 || totalMin === 0) detectedShift = 'E';
        else detectedShift = 'N';

        if (detectedShift !== currentShiftRef.current) setCurrentShift(detectedShift);

        const future = new Date(now.getTime() + 5 * 60000);
        const fTimeStr = `${future.getHours().toString().padStart(2, '0')}:${future.getMinutes().toString().padStart(2, '0')}`;
        const schedule = SHIFT_SETTINGS[currentShiftRef.current];

        if (h === schedule.checkTime && m === 0) {
            const hasIncomplete = handoverListRef.current.some(i => i.record === 1 || i.assess === 1 || i.observe === 1 || i.pain === 1);
            if (hasIncomplete && !showShiftHandoverModalRef.current && lastTriggeredRef.current.time !== `handover-${currentTimeStr}`) {
                setShowShiftHandoverModal(true);
                lastTriggeredRef.current = { type: 'handover', time: `handover-${currentTimeStr}` };
            }
        }

        if (h === schedule.clockOutTime && m === 0 && lastTriggeredRef.current.time !== `clockout-${currentTimeStr}`) {
            setWarningModal({ title: '下班提醒', message: '記得電子簽章及下班打卡', type: 'alarm' });
            lastTriggeredRef.current = { type: 'clockout', time: `clockout-${currentTimeStr}` };
        }

        const itemsToAlert = handoverListRef.current.filter(item => item.reminderTime && item.reminderTime.startsWith(fTimeStr) && !item.alerted && item.reminder);
        if (itemsToAlert.length > 0) {
            setWarningModal({ title: '交班事項提醒', message: `床號 ${itemsToAlert[0].bed||'?'}: ${itemsToAlert[0].reminder}`, type: 'info' });
            setHandoverList(prev => prev.map(i => itemsToAlert.some(a => a.id === i.id) ? { ...i, alerted: true } : i));
        }

        const examsToAlert = examListRef.current.filter(item => item.time && item.time.startsWith(fTimeStr) && !item.alerted);
        if (examsToAlert.length > 0) {
            setWarningModal({ title: '檢查前提醒', message: `床號 ${examsToAlert[0].bed} ${examsToAlert[0].name} 檢查時間 ${examsToAlert[0].time} 即將到達`, type: 'alarm' });
            setExamList(prev => prev.map(i => examsToAlert.some(a => a.id === i.id) ? { ...i, alerted: true } : i));
        }
      }, 2000); 
      return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setSelectedSubjective([]); setSelectedMSE([]); setFallsD([]); setSleepD([]); setSendExamD([]); setVisitorName(''); setCustomSubjective(''); setMedicalTeamType('值班醫療團隊');
    setRecord({ D: '', A: '', R: '', T: '' });
    setEsketamineTime(''); setColonoscopyDate(''); setColonoscopyTime(''); setInjectionSite('');
    setCustomSleepTime('22:00'); setCustomWakeTime('06:30');
    
    if (selectedFocus === 'admission_care') setChecklistType('admission');
  }, [selectedFocus]);

  const formatTimeForDoc = (time: string) => time.replace(':', '：');

  useEffect(() => {
    let baseD = "";
    
    if (selectedFocus === 'visitation') { 
        baseD = `病人之${visitorName||'○○'}與前來會客，互動可。`;
    } else if (selectedFocus === 'leave_absence') { 
        baseD = `病人之${visitorName || '○○'}來訪要求帶外出，予告知${medicalTeamType}，經評估後，囑同意請假外出四小時。`;
    } else if (selectedFocus === 'send_exam') {
        baseD = sendExamD.length > 0 ? sendExamD.map(s => s.replace(/○○/g, visitorName || '○○')).join('，') + "。" : "";
    } else if (selectedFocus === 'other_symptoms') {
        const subtypeData = OTHER_SYMPTOM_SUBTYPES[otherSymptomType];
        if (otherSymptomType === 'esketamine') baseD = `病人今於${esketamineTime ? formatTimeForDoc(esketamineTime) : '○○：○○'}使用Esketamine Nasal Spray 28mg/Bot，使用前生命徵象：BP:   /   mmHg, PR:   /min, RR:   /min。`;
        else if (otherSymptomType === 'rtms') baseD = `疾病需求，現由${visitorName || '○○'}帶病人至5樓門診區做rTMS。`;
        else if (otherSymptomType === 'colonoscopy') baseD = `病人預計${colonoscopyDate ? colonoscopyDate.split('-').slice(1).join('月') + '日' : '○○月○○日'}${colonoscopyTime ? formatTimeForDoc(colonoscopyTime) : '○○：○○'}做大腸內視鏡檢查。`;
        else baseD = subtypeData?.d_template || "";
    } else if (['admission_care', 'restraint_limbs'].includes(selectedFocus)) {
        return; 
    } else {
        let dSegments: string[] = [];
        let obsPart = "予以觀察下，病人";
        
        if (selectedFocus === 'risk_falls' && fallsD.length > 0) {
            obsPart += fallsD.join('，');
        } else if (selectedFocus === 'sleep_pattern' && sleepD.length > 0) {
            const processedD = sleepD.map(d => {
                if (d.startsWith('病人於')) return d.replace(/○○：○○/g, formatTimeForDoc(customSleepTime));
                if (d.includes('晨醒') || d.includes('早醒')) return d.replace(/○○：○○/g, formatTimeForDoc(customWakeTime));
                return d;
            });
            obsPart += processedD.join('，');
        } else {
            if (selectedFocus !== 'risk_falls' && selectedFocus !== 'sleep_pattern') {
                let obs: string[] = [];
                ['affect','appearance','behavior','speech','nutrition','social'].forEach(k => {
                    const items = MSE_COMMON_DATA[k].tags.filter(t => selectedMSE.includes(t.id)).map(t => t.text);
                    if(items.length) obs.push(items.join('，'));
                });
                obsPart += obs.length ? obs.join('，') : "精神狀況尚屬穩定";
            }
        }
        dSegments.push(obsPart);
        
        const subItems = NANDA_FOCUS_DATA[selectedFocus]?.subjective_tags?.filter(t => selectedSubjective.includes(t.id)).map(t => t.text) || [];
        const commonSub = COMMON_D_OBSERVATIONS.filter(t => selectedSubjective.includes(t.id)).map(t => t.text);
        let quoteItems = [...subItems];
        if (customSubjective) quoteItems.push(customSubjective);

        if (commonSub.length > 0 || quoteItems.length > 0) {
            let subPart = "予以探視及關心時";
            let subSegments: string[] = [];
            if (commonSub.length > 0) subSegments.push(commonSub.join('，'));
            if (quoteItems.length > 0) subSegments.push(`病人表示：「${quoteItems.join('，')}」`);
            subPart += "，" + subSegments.join('，');
            dSegments.push(subPart);
        }
        
        baseD = dSegments.join('，').replace(/，，/g, '，').trim();
        if (baseD && !baseD.endsWith('。')) baseD += "。";
    }
    
    setRecord(prev => ({ ...prev, D: baseD }));
  }, [selectedMSE, selectedSubjective, selectedFocus, visitorName, fallsD, sleepD, sendExamD, customSubjective, medicalTeamType, otherSymptomType, esketamineTime, colonoscopyDate, colonoscopyTime, injectionSite, customSleepTime, customWakeTime]);

  const toggle = (id: string, list: string[], setFn: (l: string[]) => void) => setFn(list.includes(id) ? list.filter(x=>x!==id) : [...list, id]);
  
  const addText = (f: 'D'|'A'|'R'|'T', t: string) => {
    setRecord(prev => {
      let content = prev[f] || '';
      let text = t.replace(/○○○○/g, injectionSite || '______').replace(/○○/g, visitorName.trim() || '○○');
      if (selectedFocus === 'restraint_limbs') text = text.replace(/○○/g, restraintReason).replace(/△△/g, restraintType).replace(/□□/g, restraintScope);

      if (f === 'A') {
          let lines = content.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0);
          let rawTextToAdd = text.replace(/^\d+\.\s*/, '').trim();
          if (rawTextToAdd && !rawTextToAdd.endsWith('。')) rawTextToAdd += '。';
          if (lines.includes(rawTextToAdd)) lines = lines.filter(l => l !== rawTextToAdd);
          else lines.push(rawTextToAdd);
          return { ...prev, A: lines.map((l, i) => `${i + 1}. ${l}`).join('\n') };
      }

      if (f === 'R') {
          let cleanContent = content.trim().replace(/[。，]$/, '');
          let cleanText = text.trim().replace(/[激躁]$/, '').replace(/[。，]$/, '');
          if (cleanContent.includes(cleanText)) return prev;
          const newContent = cleanContent ? `${cleanContent}，${cleanText}。` : `${cleanText}。`;
          return { ...prev, R: newContent };
      }

      if (f === 'T') return { ...prev, T: content.includes(text) ? content : (content ? `${content}\n${text}` : text) };
      
      if (f === 'D') {
          if (selectedFocus === 'restraint_limbs') {
              let cleanContent = content.replace(/。$/, '').trim();
              let cleanText = text.replace(/。$/, '').trim();
              if (cleanContent.includes(cleanText)) {
                  let newContent = cleanContent.replace(new RegExp(`${cleanText}[，]?`, 'g'), '').replace(/，$/g, '').trim();
                  return { ...prev, D: newContent ? newContent + "。" : "" };
              } else {
                  let newContent = cleanContent ? `${cleanContent}，${cleanText}` : cleanText;
                  return { ...prev, D: newContent + "。" };
              }
          }
          if (selectedFocus === 'admission_care') return { ...prev, D: content === text ? '' : text }; 
          
          let cleanContent = content.replace(/[。]$/, '').trim();
          let cleanText = text.replace(/[。]$/, '').trim();
          if (cleanContent.includes(cleanText)) return prev;
          let newContent = cleanContent ? `${cleanContent}，${cleanText}` : cleanText;
          return { ...prev, D: newContent + "。" };
      }
      return { ...prev, [f]: content.includes(text) ? content : `${content}\n${text}` };
    });
  };

  const copyAll = () => {
    const txt = `${NANDA_FOCUS_DATA[selectedFocus].label}\nD:\n${record.D}\n\nA:\n${record.A}\n\nR:\n${record.R}\n\nT:\n${record.T}`;
    navigator.clipboard.writeText(txt).then(() => alert("已複製全文"));
  };

  const copySingle = (text: string, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => alert(`已複製 ${label} 資料`));
  };

  const handleAiPolishD = async () => {
    if (!record.D) return;
    setIsAiLoading(prev => ({ ...prev, d: true }));
    try {
        const text = await polishNursingNote(record.D, 'D');
        if(text) setRecord(prev => ({ ...prev, D: text }));
    } catch(e) { console.error(e); }
    setIsAiLoading(prev => ({ ...prev, d: false }));
  };

  const handleAiSuggestA = async () => {
    if (!record.D) return alert("請先產生 D 資料");
    setIsAiLoading(prev => ({ ...prev, a: true }));
    try {
        const suggestions = await suggestNursingActions(NANDA_FOCUS_DATA[selectedFocus].label, record.D);
        if (suggestions.length > 0) {
            setRecord(prev => ({ ...prev, A: (prev.A ? prev.A + '\n' : '') + suggestions.join('\n') + "\n(AI 建議)", R: (prev.R ? prev.R.replace(/[。]$/, '') + "，" : "") + "(請參考 AI 建議)。" }));
        }
    } catch (e) { alert("AI 連線失敗"); }
    setIsAiLoading(prev => ({ ...prev, a: false }));
  };

  const activeFocusData = selectedFocus === 'other_symptoms' ? OTHER_SYMPTOM_SUBTYPES[otherSymptomType] : NANDA_FOCUS_DATA[selectedFocus];
  const showInputBox = ['leave_absence', 'visitation', 'send_exam', 'admission_care', 'other_symptoms'].includes(selectedFocus);

  return (
    <div className="flex flex-col h-screen text-slate-800 font-sans relative overflow-hidden">
      {/* 全域警報閃爍光暈 */}
      {warningModal && warningModal.type === 'alarm' && <div className="animate-alarm-flash"></div>}
      
      {warningModal && <WarningModal onClose={() => setWarningModal(null)} title={warningModal.title} message={warningModal.message} type={warningModal.type} />}
      {checklistType && <ChecklistModal onClose={() => setChecklistType(null)} type={checklistType} />}
      {showHandoverModal && <HandoverModal onClose={() => setShowHandoverModal(false)} handoverList={handoverList} setHandoverList={setHandoverList} examList={examList} setExamList={setExamList} />}
      {showShiftHandoverModal && <ShiftHandoverCheckModal onClose={() => setShowShiftHandoverModal(false)} handoverList={handoverList} setHandoverList={setHandoverList} />}

      <div className="mx-4 mt-4 mb-2 z-20 glass-panel rounded-2xl shrink-0">
          <div className="px-6 py-3 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 shrink-0">
                <div className="bg-gradient-to-tr from-green-400 to-teal-500 p-2 rounded-xl shadow-lg shadow-green-500/20"><Stethoscope className="text-white w-6 h-6" /></div>
                <div><h1 className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 hidden md:block">精神科護理通</h1><span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 hidden md:block">Pro V42.0 れんと</span></div>
            </div>
            <div className="flex items-center gap-3 flex-grow max-w-2xl min-w-0">
                <div className="relative flex-grow">
                  <select value={selectedFocus} onChange={(e) => setSelectedFocus(e.target.value)} className="glass-input w-full pl-5 pr-12 py-3 rounded-xl text-base font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate">
                    {Object.entries(NANDA_FOCUS_DATA).map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 bg-white/50 p-1 rounded-full"><ChevronDown size={16} /></div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleExportData} className="glass-button p-3 text-indigo-600 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0" title="匯出"><Download size={20}/></button>
                    <label className="glass-button p-3 text-indigo-600 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer" title="匯入"><Upload size={20}/><input type="file" onChange={handleImportData} className="hidden" accept=".json"/></label>
                    <button onClick={() => setRecord({D:'',A:'',R:'',T:''})} className="glass-button p-3 text-red-500 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0" title="清空"><Trash2 size={20}/></button>
                </div>
            </div>
            <div className="flex-shrink-0"><DailyReminder currentShift={currentShift} setCurrentShift={setCurrentShift} onOpenHandover={() => setShowHandoverModal(true)} /></div>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden w-full px-4 pb-4 gap-4">
        {/* 左側：評估面板 */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
             {showInputBox ? (
                 <div className="p-6 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
                     <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2 px-1"><User size={20} className="text-blue-500"/> 基本資料與處置</h3>
                     {/* ... (其餘 UI 維持不變) */}
                     {['leave_absence', 'visitation', 'send_exam', 'admission_care'].includes(selectedFocus) || (selectedFocus === 'other_symptoms' && otherSymptomType === 'rtms') ? (
                         <div className="space-y-4 bg-white/30 p-4 rounded-2xl border border-white/40">
                             <input value={visitorName} onChange={e=>setVisitorName(e.target.value)} className="glass-input p-3 rounded-xl text-base w-full font-bold" placeholder="稱謂 (媽媽、哥哥)..."/>
                             <div className="flex flex-wrap gap-2">{RELATION_OPTIONS.map(r => <button key={r} onClick={() => setVisitorName(prev => prev.includes(r) ? prev.replace(r, '').replace(/、+/, '、').trim() : (prev ? `${prev}、${r}` : r))} className={`text-sm px-4 py-1.5 rounded-full border transition-all ${visitorName.includes(r) ? 'bg-blue-500 text-white border-blue-400' : 'bg-white/40 text-slate-600 border-white/40'}`}>{r}</button>)}</div>
                         </div>
                     ) : null}
                     {selectedFocus === 'other_symptoms' && (
                         <div className="flex flex-col gap-4 bg-white/30 p-4 rounded-2xl border border-white/40">
                             <h4 className="font-bold text-slate-600 flex items-center gap-2"><ListChecks size={18}/> 處置項目選擇</h4>
                             <select value={otherSymptomType} onChange={(e) => setOtherSymptomType(e.target.value as any)} className="glass-input w-full p-3 rounded-xl appearance-none font-bold text-slate-700">{Object.entries(OTHER_SYMPTOM_SUBTYPES).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}</select>
                             {otherSymptomType === 'esketamine' && <input type="time" value={esketamineTime} onChange={e => setEsketamineTime(e.target.value)} className="glass-input w-full p-2 rounded-lg font-bold text-slate-700"/>}
                         </div>
                     )}
                 </div>
             ) : (
                <div className="flex flex-col flex-1 min-h-0">
                    {/* ... (評估面板內容) */}
                    <div className="p-4 shrink-0 pb-0">
                        {selectedFocus === 'discharge_planning' && (
                           <div className="mb-4 bg-violet-50/80 p-4 rounded-2xl border border-violet-200 flex items-center justify-between shadow-sm animate-fade-in">
                               <div className="flex items-center gap-3">
                                   <div className="bg-violet-500 p-2.5 rounded-xl text-white shadow-md"><LogOut size={20}/></div>
                                   <div>
                                       <h4 className="font-bold text-violet-800 text-sm">出院行政核對</h4>
                                       <p className="text-[10px] text-violet-600 font-bold uppercase tracking-tight">Discharge Checklist</p>
                                   </div>
                               </div>
                               <button 
                                   onClick={() => setChecklistType('discharge')}
                                   className="bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg hover:bg-violet-700 transition-all active:scale-95 flex items-center gap-2 border border-violet-400/50"
                               >
                                   <ClipboardCheck size={16}/> 開啟檢核表
                               </button>
                           </div>
                        )}
                        <h3 className="font-bold text-lg text-blue-700 flex items-center gap-2 mb-3"><Brain size={22} className="text-blue-500"/> 精神狀況評估 (MSE)</h3>
                        <div className="border-b border-white/20 bg-white/10 overflow-x-auto pb-2 pt-2 px-2 rounded-xl custom-scrollbar">
                            <div className="flex flex-nowrap gap-2">{Object.entries(MSE_COMMON_DATA).map(([k, d]) => <button key={k} onClick={() => setActiveMseCategory(k)} className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeMseCategory === k ? 'bg-blue-600 text-white shadow-lg border-blue-400' : 'bg-white/40 text-slate-600 hover:bg-white/70'}`}>{d.title}</button>)}</div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 flex flex-wrap gap-2 content-start custom-scrollbar">{MSE_COMMON_DATA[activeMseCategory]?.tags.map(t => <button key={t.id} onClick={() => toggle(t.id, selectedMSE, setSelectedMSE)} className={`text-sm px-4 py-2 rounded-full border transition-all font-medium ${selectedMSE.includes(t.id)?'bg-blue-600 text-white shadow-md border-blue-400':'bg-white/40 text-slate-700 hover:bg-white/60'}`}>{t.text}</button>)}</div>
                    <div className="shrink-0 flex flex-col border-t border-white/30 bg-indigo-50/30 p-4 space-y-4 rounded-b-3xl">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm uppercase tracking-wider"><FileText size={16}/> 病人主訴與通用觀察</div>
                        <textarea value={customSubjective} onChange={e=>setCustomSubjective(e.target.value)} className="glass-input w-full p-3 rounded-xl text-lg h-24 resize-none outline-none font-medium text-slate-700" placeholder="輸入病人主訴原文..."/>
                        <div className="flex flex-wrap gap-2">{COMMON_D_OBSERVATIONS.map(t=><button key={t.id} onClick={() => toggle(t.id, selectedSubjective, setSelectedSubjective)} className={`text-xs px-3 py-1.5 rounded-xl border transition-all font-medium ${selectedSubjective.includes(t.id)?'bg-indigo-600 text-white shadow-sm border-indigo-400':'bg-white/40 text-slate-600 hover:bg-white/60'}`}>{t.text}</button>)}</div>
                    </div>
                </div>
             )}
        </div>

        {/* 中間：處置建議 */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="p-4 bg-white/30 border-b font-bold text-slate-700 flex items-center gap-2"><Activity size={18} className="text-pink-500"/> 處置建議 (A/R)</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                <div className="glass-card rounded-2xl overflow-hidden"><div className="px-4 py-2 bg-pink-500/10 flex justify-between items-center"><span className="text-sm font-bold text-pink-700">A (措施與介入)</span><button onClick={handleAiSuggestA} disabled={isAiLoading.a} className="glass-button flex items-center gap-1 px-3 py-1 rounded-full text-xs text-pink-700 font-bold border-pink-200/50">{isAiLoading.a ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} AI 建議</button></div><div className="p-3 flex flex-col gap-1.5">{COMMON_A_OPTIONS.map((t,i)=><button key={i} onClick={()=>addText('A',t)} className="text-sm text-left px-3 py-2 hover:bg-pink-50 rounded-lg text-slate-600 border border-transparent hover:border-pink-100 transition-all">+ {t}</button>)}{activeFocusData?.actions?.map((t,i)=><button key={i} onClick={()=>addText('A',t)} className="text-sm text-left px-3 py-2 hover:bg-pink-50 rounded-lg text-slate-700 leading-snug border border-transparent hover:border-pink-100 transition-all">+ {t}</button>)}</div></div>
                <div className="glass-card rounded-2xl overflow-hidden"><div className="px-4 py-2 bg-emerald-500/10"><span className="text-sm font-bold text-emerald-700">R (治療反應與評值)</span></div><div className="p-3 flex flex-col gap-1.5">{COMMON_R_OPTIONS.map((t,i)=><button key={i} onClick={()=>addText('R',t)} className="text-sm bg-white/40 border border-emerald-100/50 px-3 py-1 rounded-full hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all">• {t}</button>)}{activeFocusData?.responses?.map((t,i)=><button key={i} onClick={()=>addText('R',t)} className="text-sm text-left px-3 py-2 hover:bg-emerald-50 rounded-lg text-slate-700 leading-snug border border-transparent hover:border-emerald-100 transition-all">+ {t}</button>)}</div></div>
            </div>
        </div>

        {/* 右側：紀錄預覽 */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="p-4 bg-slate-800/95 text-white font-bold flex justify-between items-center z-10 shrink-0"><span className="flex items-center gap-2"><FileText size={18}/> 護理紀錄預覽</span><button onClick={copyAll} className="glass-button bg-green-500/20 text-green-300 px-5 py-2 rounded-full hover:bg-green-500/40 text-sm flex items-center gap-2 border-green-500/30 transition-all"><Copy size={14}/> 複製全文</button></div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar flex flex-col bg-slate-50/30">
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-[2] min-h-[140px] border-blue-100 shadow-lg">
                    <div className="flex justify-between px-1 mb-2 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-600 bg-blue-100/50 px-3 py-1 rounded-lg border border-blue-200/50 uppercase tracking-tighter">D: Data</span>
                            <button onClick={() => copySingle(record.D, 'D')} className="text-blue-500 hover:text-blue-700 transition-all p-1.5 hover:bg-blue-100 rounded-lg" title="單獨複製 D"><Copy size={14}/></button>
                        </div>
                        <button onClick={handleAiPolishD} disabled={isAiLoading.d} className="text-xs text-blue-600 font-bold flex items-center gap-1.5 hover:bg-blue-100/80 rounded-full px-4 py-1.5 border border-blue-200 transition-all">{isAiLoading.d ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} AI 修飾語句</button>
                    </div>
                    <textarea value={record.D} onChange={e=>setRecord({...record,D:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 bg-transparent font-medium leading-relaxed" placeholder="產生的資料將顯示於此..."/>
                </div>
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-1 min-h-[110px] border-pink-100">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-pink-600 bg-pink-100/50 px-3 py-1 rounded-lg border border-pink-200/50 uppercase tracking-tighter">A: Action</span>
                        <button onClick={() => copySingle(record.A, 'A')} className="text-pink-500 hover:text-pink-700 transition-all p-1.5 hover:bg-pink-100 rounded-lg" title="單獨複製 A"><Copy size={14}/></button>
                    </div>
                    <textarea value={record.A} onChange={e=>setRecord({...record,A:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 bg-transparent font-medium leading-relaxed" placeholder="採取的措施..."/>
                </div>
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-1 min-h-[110px] border-emerald-100">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-3 py-1 rounded-lg border border-emerald-200/50 uppercase tracking-tighter">R: Response</span>
                        <button onClick={() => copySingle(record.R, 'R')} className="text-emerald-500 hover:text-emerald-700 transition-all p-1.5 hover:bg-emerald-100 rounded-lg" title="單獨複製 R"><Copy size={14}/></button>
                    </div>
                    <textarea value={record.R} onChange={e=>setRecord({...record,R:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 bg-transparent font-medium leading-relaxed" placeholder="病人的反應..."/>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PsychNursingProV42_0;
