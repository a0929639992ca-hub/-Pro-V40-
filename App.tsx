import React, { useState, useEffect, useRef } from 'react';
import { Clipboard, Trash2, Brain, Layers, Activity, ChevronDown, ChevronUp, FileText, Stethoscope, User, Lock, Ambulance, LogIn, Bell, X, Calendar, CheckSquare, Square, AlertTriangle, Sparkles, Loader2, Moon, ClipboardCheck, Minimize2, Maximize2, ListChecks, Clock, PlusCircle, MinusCircle, AlarmClock, Sun, Sunset, Moon as MoonIcon, Copy, Syringe, Pill, LocateFixed, MoreHorizontal, Download, Upload, FileJson, LogOut } from 'lucide-react';
import DailyReminder from './components/DailyReminder';
import ChecklistModal from './components/ChecklistModal';
import HandoverModal from './components/HandoverModal';
import ShiftHandoverCheckModal from './components/ShiftHandoverCheckModal';
import WarningModal from './components/WarningModal';
import { WEEKDAY_REMINDERS, SHIFT_SETTINGS, COMMON_A_OPTIONS, COMMON_R_OPTIONS, COMMON_D_OBSERVATIONS, NANDA_FOCUS_DATA, MSE_COMMON_DATA, RELATION_OPTIONS, OTHER_SYMPTOM_SUBTYPES } from './constants';
import { ShiftType, ExamItem } from './types';
import { polishNursingNote, suggestNursingActions } from './services/geminiService';

const PsychNursingProV39 = () => {
  const [selectedFocus, setSelectedFocus] = useState('discharge_planning');
  const [selectedMSE, setSelectedMSE] = useState<string[]>([]);
  const [selectedSubjective, setSelectedSubjective] = useState<string[]>([]);
  const [visitorName, setVisitorName] = useState(''); 
  const [restraintReason, setRestraintReason] = useState('預防跌倒'); 
  const [restraintType, setRestraintType] = useState('自願性');
  const [restraintScope, setRestraintScope] = useState('四肢約束');
  const [medicalTeamType, setMedicalTeamType] = useState('值班醫療團隊'); 
  const [record, setRecord] = useState({ D: '', A: '', R: '', T: '' });
  
  // New States for Other Symptoms
  const [otherSymptomType, setOtherSymptomType] = useState<keyof typeof OTHER_SYMPTOM_SUBTYPES>('esketamine');
  const [esketamineTime, setEsketamineTime] = useState('');
  const [colonoscopyDate, setColonoscopyDate] = useState('');
  const [colonoscopyTime, setColonoscopyTime] = useState('');
  const [injectionSite, setInjectionSite] = useState('');

  // Sleep Pattern Times
  const [customSleepTime, setCustomSleepTime] = useState('22:00');
  const [customWakeTime, setCustomWakeTime] = useState('06:30');

  // UI State
  const [activeMseCategory, setActiveMseCategory] = useState<string>('affect');

  const [warningModal, setWarningModal] = useState<any>(null); 
  // Changed showChecklistModal boolean to checklistType string state
  const [checklistType, setChecklistType] = useState<'admission' | 'discharge' | null>(null);
  
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showShiftHandoverModal, setShowShiftHandoverModal] = useState(false); 
  
  const [currentShift, setCurrentShift] = useState<ShiftType>('A');
  const [handoverList, setHandoverList] = useState([
      { id: 1, bed: '', record: 0, assess: 0, observe: 0, pain: 0, reminder: '', reminderTime: '', alerted: false },
      { id: 2, bed: '', record: 0, assess: 0, observe: 0, pain: 0, reminder: '', reminderTime: '', alerted: false },
      { id: 3, bed: '', record: 0, assess: 0, observe: 0, pain: 0, reminder: '', reminderTime: '', alerted: false },
  ]);
  const [examList, setExamList] = useState<ExamItem[]>([]);

  const [fallsD, setFallsD] = useState<string[]>([]); 
  const [sleepD, setSleepD] = useState<string[]>([]); 
  const [sendExamD, setSendExamD] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState({ d: false, a: false });
  const [customSubjective, setCustomSubjective] = useState('');

  // Refs for timer to access latest state without resetting interval
  const handoverListRef = useRef(handoverList);
  const examListRef = useRef(examList);
  const currentShiftRef = useRef(currentShift);
  const showShiftHandoverModalRef = useRef(showShiftHandoverModal);
  
  // Track last triggered alerts to prevent spamming within the same minute
  const lastTriggeredRef = useRef<{type: string, time: string}>({ type: '', time: '' });

  // --- System Save/Load Logic ---

  // 1. Auto-Load from LocalStorage on Mount
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
        } catch (e) {
            console.error("Failed to load local data", e);
        }
    }
  }, []);

  // 2. Auto-Save to LocalStorage on Change
  useEffect(() => {
    const dataToSave = {
        handoverList,
        examList,
        record,
        visitorName,
        currentShift
    };
    localStorage.setItem('psych_nursing_pro_data', JSON.stringify(dataToSave));
  }, [handoverList, examList, record, visitorName, currentShift]);

  // 3. Manual Export to File
  const handleExportData = () => {
    const data = {
        timestamp: new Date().toISOString(),
        handoverList,
        examList,
        record,
        visitorName,
        currentShift,
        selectedFocus,
        customSubjective
    };
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

  // 4. Manual Import from File
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const parsed = JSON.parse(content);
            
            if (window.confirm(`確定要匯入 ${parsed.timestamp ? new Date(parsed.timestamp).toLocaleString() : '此檔案'} 的資料嗎？目前的內容將被覆蓋。`)) {
                if (parsed.handoverList) setHandoverList(parsed.handoverList);
                if (parsed.examList) setExamList(parsed.examList);
                if (parsed.record) setRecord(parsed.record);
                if (parsed.visitorName) setVisitorName(parsed.visitorName);
                if (parsed.currentShift) setCurrentShift(parsed.currentShift);
                if (parsed.selectedFocus) setSelectedFocus(parsed.selectedFocus);
                if (parsed.customSubjective) setCustomSubjective(parsed.customSubjective);
                
                alert("資料匯入成功！");
            }
        } catch (err) {
            alert("檔案格式錯誤，無法讀取。");
            console.error(err);
        }
        // Reset input value to allow re-importing same file if needed
        e.target.value = '';
    };
    reader.readAsText(file);
  };

  // --- End System Save/Load Logic ---

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
        
        // 5 mins later string for warnings (Handover items & Exams)
        const future = new Date(now.getTime() + 5 * 60000);
        const fTimeStr = `${future.getHours().toString().padStart(2, '0')}:${future.getMinutes().toString().padStart(2, '0')}`;

        const schedule = SHIFT_SETTINGS[currentShiftRef.current];

        // 1. Shift Handover Check (End of Shift - Incomplete Items)
        if (h === schedule.checkTime && m === 0) {
            const hasIncomplete = handoverListRef.current.some(i => i.record === 1 || i.assess === 1 || i.observe === 1 || i.pain === 1);
            const triggerKey = `handover-${currentTimeStr}`;
            
            if (hasIncomplete && !showShiftHandoverModalRef.current && lastTriggeredRef.current.time !== triggerKey) {
                setShowShiftHandoverModal(true);
                lastTriggeredRef.current = { type: 'handover', time: triggerKey };
            }
        }

        // 2. Clock Out Reminder (End of Shift - Mandatory)
        if (h === schedule.clockOutTime && m === 0) {
            const triggerKey = `clockout-${currentTimeStr}`;
            if (lastTriggeredRef.current.time !== triggerKey) {
                setWarningModal({
                    title: '下班提醒',
                    message: '記得電子簽章及下班打卡',
                    type: 'alarm'
                });
                lastTriggeredRef.current = { type: 'clockout', time: triggerKey };
            }
        }

        // 3. Handover Item Reminders (5 mins before specific task time)
        const itemsToAlert = handoverListRef.current.filter(item => 
            item.reminderTime && item.reminderTime.startsWith(fTimeStr) && !item.alerted && item.reminder
        );

        if (itemsToAlert.length > 0) {
            const item = itemsToAlert[0];
            setWarningModal({
                title: '交班事項提醒',
                message: `床號 ${item.bed||'?'}: ${item.reminder}`,
                type: 'info'
            });

            setHandoverList(prev => prev.map(i => {
                if (itemsToAlert.some(alertItem => alertItem.id === i.id)) {
                    return { ...i, alerted: true };
                }
                return i;
            }));
        }

        // 4. Exam Reminders (5 mins before)
        const examsToAlert = examListRef.current.filter(item => 
            item.time && item.time.startsWith(fTimeStr) && !item.alerted
        );

        if (examsToAlert.length > 0) {
            const item = examsToAlert[0];
            setWarningModal({
                title: '檢查前提醒',
                message: `床號 ${item.bed} ${item.name} 檢查時間 ${item.time} 即將到達`,
                type: 'alarm'
            });

            setExamList(prev => prev.map(i => {
                 if (examsToAlert.some(alertItem => alertItem.id === i.id)) {
                    return { ...i, alerted: true };
                }
                return i;
            }));
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
    if (selectedFocus === 'send_exam') {
        setWarningModal({
            title: '送檢查提醒',
            message: '記得交接班送出及接班',
            type: 'info'
        });
    }
  }, [selectedFocus]);

  // Helper to ensure 24h format with full-width colon for text output
  const formatTimeForDoc = (time: string) => time.replace(':', '：');

  // Main Record Generation Logic
  useEffect(() => {
    if (selectedFocus === 'visitation') {
        const t = `病人之${visitorName||'○○'}與前來會客，互動可。`;
        setRecord(prev => ({ ...prev, D: t })); return;
    }
    if (selectedFocus === 'leave_absence') {
        const visitor = visitorName || '○○';
        const team = medicalTeamType;
        const t = `病人之${visitor}來訪要求帶外出，予告知${team}，經${team}評估後，囑同意請假外出四小時。`;
        setRecord(prev => ({ ...prev, D: t }));
        return;
    }
    if (selectedFocus === 'send_exam') {
        if (sendExamD.length > 0) {
            const allOptions = NANDA_FOCUS_DATA.send_exam.d_options || [];
            const sortedSelections = allOptions.filter(opt => sendExamD.includes(opt));
            const t = sortedSelections.map(s => s.replace(/○○/g, visitorName || '○○')).join('，') + "。";
            setRecord(prev => ({ ...prev, D: t }));
        } else {
             setRecord(prev => ({ ...prev, D: '' }));
        }
        return;
    }
    
    if (selectedFocus === 'other_symptoms') {
        const subtypeData = OTHER_SYMPTOM_SUBTYPES[otherSymptomType];
        if (!subtypeData) return;

        if (otherSymptomType === 'esketamine') {
            const timeStr = esketamineTime ? formatTimeForDoc(esketamineTime) : '○○：○○';
            const t = `病人今於${timeStr}使用Esketamine Nasal Spray 28mg/Bot，使用前生命徵象：BP:   /   mmHg, PR:   /min, RR:   /min。`;
            setRecord(prev => ({ ...prev, D: t }));
        } else if (otherSymptomType === 'fall') {
             setRecord(prev => ({ ...prev, D: '病人於...發生跌倒(請補充詳情)。' }));
        } else if (otherSymptomType === 'rtms') {
            const t = `疾病需求，現由${visitorName || '○○'}帶病人至5樓門診區做rTMS。`;
            setRecord(prev => ({ ...prev, D: t }));
        } else if (otherSymptomType === 'constipation') {
            setRecord(prev => ({ ...prev, D: subtypeData.d_template || '' }));
        } else if (otherSymptomType === 'colonoscopy') {
            let formattedDate = '○○月○○日○○：○○';
            if (colonoscopyDate && colonoscopyTime) {
                const [y, m, d] = colonoscopyDate.split('-');
                const [h, min] = colonoscopyTime.split(':');
                if (m && d && h && min) {
                     formattedDate = `${m}月${d}日${h}：${min}`;
                }
            }
            const t = `病人預計${formattedDate}做大腸內視鏡檢查。`;
            setRecord(prev => ({ ...prev, D: t }));
        } else if (otherSymptomType === 'long_acting_injection') {
             setRecord(prev => ({ ...prev, D: subtypeData.d_template || '' }));
        }
        return;
    }

    if (['admission_care', 'restraint_limbs'].includes(selectedFocus)) return;

    let baseD = "予以觀察下，";
    if (selectedFocus === 'risk_falls' && fallsD.length > 0) baseD += fallsD.join('，') + "。";
    else if (selectedFocus === 'sleep_pattern' && sleepD.length > 0) {
        const processedD = sleepD.map(d => {
            if (d.startsWith('病人於')) return d.replace(/○○：○○/g, formatTimeForDoc(customSleepTime));
            if (d.includes('晨醒') || d.includes('早醒')) return d.replace(/○○：○○/g, formatTimeForDoc(customWakeTime));
            return d;
        });
        baseD += processedD.join('，') + "。";
    }
    else baseD += "病人";

    if (selectedFocus !== 'risk_falls' && selectedFocus !== 'sleep_pattern') {
        let obs: string[] = [];
        ['affect','appearance','behavior','speech','nutrition','social'].forEach(k => {
            const items = MSE_COMMON_DATA[k].tags.filter(t => selectedMSE.includes(t.id)).map(t => t.text);
            if(items.length) obs.push(items.join('、'));
        });
        baseD += obs.length ? obs.join('，') + "。" : "精神狀況尚屬穩定。";
    }
    
    const subItems = NANDA_FOCUS_DATA[selectedFocus]?.subjective_tags?.filter(t => selectedSubjective.includes(t.id)).map(t => t.text) || [];
    const commonSub = COMMON_D_OBSERVATIONS.filter(t => selectedSubjective.includes(t.id)).map(t => t.text);
    
    let quoteItems = [...subItems];
    if (customSubjective) quoteItems.push(customSubjective);

    if (commonSub.length > 0 || quoteItems.length > 0) {
        baseD += "予以探視及關心時，";
        if (commonSub.length > 0) baseD += commonSub.join('，') + "。";
        if (quoteItems.length > 0) baseD += `病人表示：「${quoteItems.join('，')}」。`;
    }
    
    setRecord(prev => ({ ...prev, D: baseD }));
  }, [selectedMSE, selectedSubjective, selectedFocus, visitorName, fallsD, sleepD, sendExamD, customSubjective, medicalTeamType, otherSymptomType, esketamineTime, colonoscopyDate, colonoscopyTime, injectionSite, customSleepTime, customWakeTime]);

  const toggle = (id: string, list: string[], setFn: (l: string[]) => void) => setFn(list.includes(id) ? list.filter(x=>x!==id) : [...list, id]);
  
  const addText = (f: 'D'|'A'|'R'|'T', t: string) => {
    setRecord(prev => {
      let content = prev[f] || '';
      let text = t.replace(/○○○○/g, injectionSite || '______').replace(/○○/g, visitorName.trim() || '○○');
      
      if (selectedFocus === 'restraint_limbs') {
           text = text.replace(/○○/g, restraintReason).replace(/△△/g, restraintType).replace(/□□/g, restraintScope);
      }

      if (f === 'A') {
          let lines = content.split('\n').map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(l => l.length > 0);
          let rawTextToAdd = text.replace(/^\d+\.\s*/, '').trim();
          
          if (rawTextToAdd && !rawTextToAdd.endsWith('。') && !rawTextToAdd.endsWith('.')) {
              rawTextToAdd += '。';
          }

          if (lines.includes(rawTextToAdd)) lines = lines.filter(l => l !== rawTextToAdd);
          else lines.push(rawTextToAdd);

          if (lines.length ===0) return { ...prev, A: '' };
          const newContent = lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
          return { ...prev, A: newContent };
      }

      if (f === 'R') {
          if (content.includes(text)) return prev;
          return { ...prev, R: content ? `${content}，${text}` : text };
      }

      if (f === 'T') {
          if (content.includes(text)) return prev;
          return { ...prev, T: content ? `${content}\n${text}` : text };
      }
      
      if (f === 'D' && selectedFocus === 'restraint_limbs') {
           if (content.includes(text)) {
               let newContent = content.replace(text, '');
               newContent = newContent.replace(/，，/g, '，').trim();
               if (newContent.startsWith('，')) newContent = newContent.substring(1);
               if (newContent.endsWith('，')) newContent = newContent.substring(0, newContent.length - 1);
               return { ...prev, D: newContent };
           }
           return { ...prev, D: content ? `${content}，${text}` : text };
      }

      if (f === 'D' && selectedFocus === 'admission_care') { 
          return { ...prev, D: content === text ? '' : text }; 
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
            const aiText = suggestions.join('\n');
            setRecord(prev => ({ 
                ...prev, 
                A: (prev.A ? prev.A + '\n' : '') + aiText + "\n(AI 建議)", 
                R: (prev.R ? prev.R + '，' : '') + " (請參考 AI 建議)" 
            }));
        }
    } catch (e) { console.error(e); alert("AI 連線失敗"); }
    setIsAiLoading(prev => ({ ...prev, a: false }));
  };

  const toggleVisitor = (relation: string) => {
      let parts = visitorName ? visitorName.split(/[、\s]+/).filter(Boolean) : [];
      if (parts.includes(relation)) {
          parts = parts.filter(p => p !== relation);
      } else {
          parts.push(relation);
      }
      setVisitorName(parts.join('、'));
  };

  const getActiveFocusData = () => {
      if (selectedFocus === 'other_symptoms') {
          return OTHER_SYMPTOM_SUBTYPES[otherSymptomType];
      }
      return NANDA_FOCUS_DATA[selectedFocus];
  };
  const activeFocusData = getActiveFocusData();

  const showInputBox = ['leave_absence', 'visitation', 'send_exam', 'admission_care', 'other_symptoms'].includes(selectedFocus);
  const showRestraintBox = selectedFocus === 'restraint_limbs';
  const showFallsBox = selectedFocus === 'risk_falls';
  const showSleepBox = selectedFocus === 'sleep_pattern';

  return (
    <div className="flex flex-col h-screen text-slate-800 font-sans relative overflow-hidden">
      {warningModal && <WarningModal onClose={() => setWarningModal(null)} title={warningModal.title} message={warningModal.message} type={warningModal.type} />}
      {checklistType && <ChecklistModal onClose={() => setChecklistType(null)} type={checklistType} />}
      {showHandoverModal && <HandoverModal onClose={() => setShowHandoverModal(false)} handoverList={handoverList} setHandoverList={setHandoverList} examList={examList} setExamList={setExamList} />}
      {showShiftHandoverModal && <ShiftHandoverCheckModal onClose={() => setShowShiftHandoverModal(false)} handoverList={handoverList} setHandoverList={setHandoverList} />}

      {/* Header Panel */}
      <div className="mx-4 mt-4 mb-2 z-20 glass-panel rounded-2xl shrink-0">
          <div className="px-6 py-3 flex items-center justify-between gap-6">
            <div className="flex items-center gap-3 shrink-0">
                <div className="bg-gradient-to-tr from-green-400 to-teal-500 p-2 rounded-xl shadow-lg shadow-green-500/20">
                    <Stethoscope className="text-white w-6 h-6" />
                </div>
                <div>
                    <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 hidden md:block">Psych Nursing Pro</h1>
                    <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400 hidden md:block">Liquid Glass OS</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3 flex-grow max-w-2xl min-w-0">
                <div className="relative flex-grow group">
                  <select value={selectedFocus} onChange={(e) => setSelectedFocus(e.target.value)} className="glass-input w-full pl-5 pr-12 py-3 rounded-xl text-base font-bold text-slate-700 outline-none appearance-none cursor-pointer truncate">
                    {Object.entries(NANDA_FOCUS_DATA).map(([key, data]) => <option key={key} value={key}>{data.label}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 bg-white/50 p-1 rounded-full">
                    <ChevronDown size={16} />
                  </div>
                </div>
                
                {/* System Action Buttons */}
                <div className="flex items-center gap-2">
                    <button onClick={handleExportData} className="glass-button p-3 text-indigo-600 hover:text-indigo-800 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0" title="匯出系統存檔 (JSON)"><Download size={20}/></button>
                    <label className="glass-button p-3 text-indigo-600 hover:text-indigo-800 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer" title="匯入系統存檔 (JSON)">
                        <Upload size={20}/>
                        <input type="file" onChange={handleImportData} className="hidden" accept=".json"/>
                    </label>
                    <button onClick={() => setRecord({D:'',A:'',R:'',T:''})} className="glass-button p-3 text-red-500 hover:text-red-600 rounded-xl transition-all hover:scale-105 active:scale-95 shrink-0" title="清空當前紀錄"><Trash2 size={20}/></button>
                </div>
            </div>
            
            <div className="flex-shrink-0">
                 <DailyReminder currentShift={currentShift} setCurrentShift={setCurrentShift} onOpenHandover={() => setShowHandoverModal(true)} />
            </div>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden w-full px-4 pb-4 gap-4">
        {/* Left Column: Input / Context */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
             {showInputBox ? (
                 <div className="p-6 flex flex-col gap-5 h-full overflow-y-auto custom-scrollbar">
                     
                     {['leave_absence', 'visitation', 'send_exam', 'admission_care'].includes(selectedFocus) || (selectedFocus === 'other_symptoms' && ['rtms'].includes(otherSymptomType)) ? (
                         <>
                             <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2 px-1"><User size={20} className="text-blue-500"/> 基本資料</h3>
                             <input value={visitorName} onChange={e=>setVisitorName(e.target.value)} className="glass-input p-3 rounded-xl text-base w-full" placeholder="輸入稱謂 (如: 媽媽、哥哥)..."/>
                             <div className="flex flex-wrap gap-2">
                                {RELATION_OPTIONS.map(r => (
                                    <button 
                                        key={r} 
                                        onClick={() => toggleVisitor(r)}
                                        className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-md ${
                                            (visitorName || '').split(/[、\s]+/).includes(r)
                                            ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                                            : 'bg-white/40 text-slate-600 border-white/40 hover:bg-white/60'
                                        }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                         </>
                     ) : null}

                     {selectedFocus === 'other_symptoms' && (
                         <div className="flex flex-col gap-4">
                             <h3 className="font-bold text-lg text-slate-700 flex items-center gap-2 px-1"><ListChecks size={20} className="text-indigo-500"/> 症狀處置項目</h3>
                             <div className="relative">
                                <select 
                                    value={otherSymptomType} 
                                    onChange={(e) => setOtherSymptomType(e.target.value as keyof typeof OTHER_SYMPTOM_SUBTYPES)}
                                    className="glass-input w-full p-3 rounded-xl appearance-none font-bold text-slate-700 cursor-pointer"
                                >
                                    {Object.entries(OTHER_SYMPTOM_SUBTYPES).map(([key, data]) => (
                                        <option key={key} value={key}>{data.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                             </div>
                             
                             {otherSymptomType === 'esketamine' && (
                                 <div className="glass-card p-4 rounded-xl">
                                     <label className="block text-sm font-bold text-indigo-700 mb-2">使用時間</label>
                                     <input type="time" value={esketamineTime} onChange={e => setEsketamineTime(e.target.value)} className="glass-input w-full p-2 rounded-lg"/>
                                 </div>
                             )}

                             {otherSymptomType === 'colonoscopy' && (
                                 <div className="glass-card p-4 rounded-xl space-y-3">
                                     <div>
                                         <label className="block text-sm font-bold text-indigo-700 mb-1">檢查日期</label>
                                         <input type="date" value={colonoscopyDate} onChange={e => setColonoscopyDate(e.target.value)} className="glass-input w-full p-2 rounded-lg"/>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-bold text-indigo-700 mb-1">檢查時間 (24小時制)</label>
                                         <input type="time" value={colonoscopyTime} onChange={e => setColonoscopyTime(e.target.value)} className="glass-input w-full p-2 rounded-lg"/>
                                     </div>
                                 </div>
                             )}

                             {otherSymptomType === 'long_acting_injection' && (
                                 <div className="glass-card p-4 rounded-xl">
                                     <label className="block text-sm font-bold text-indigo-700 mb-2">施打部位</label>
                                     <div className="flex flex-wrap gap-2">
                                         {OTHER_SYMPTOM_SUBTYPES.long_acting_injection.sites?.map(s => (
                                             <button 
                                                 key={s} 
                                                 onClick={() => setInjectionSite(s)}
                                                 className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${injectionSite === s ? 'bg-indigo-600 text-white shadow-md border-indigo-500' : 'bg-white/40 border-white/40 hover:bg-white/60 text-slate-700'}`}
                                             >
                                                 {s}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}

                     {selectedFocus === 'send_exam' && (
                         <div className="mt-2">
                             <h3 className="font-bold text-lg text-slate-700 mb-3 px-1">D (資料) 選項</h3>
                             <div className="flex flex-col gap-2">
                                 {NANDA_FOCUS_DATA.send_exam.d_options?.map(option => (
                                     <button
                                         key={option}
                                         onClick={() => toggle(option, sendExamD, setSendExamD)}
                                         className={`text-sm text-left w-full p-3 rounded-xl border transition-all duration-300 ${sendExamD.includes(option) ? 'bg-indigo-500 text-white border-indigo-400 shadow-lg' : 'bg-white/40 border-white/40 hover:bg-white/60 text-slate-700'}`}
                                     >
                                         {option.replace(/○○/g, visitorName || '○○')}
                                     </button>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>
             ) : showRestraintBox ? (
                 <div className="p-6 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                     <h3 className="font-bold text-lg text-orange-700 flex items-center"><Lock size={18} className="mr-2"/> 約束原因</h3>
                     <div className="flex flex-wrap gap-2">{NANDA_FOCUS_DATA.restraint_limbs.reasons?.map(r=><button key={r} onClick={()=>setRestraintReason(r)} className={`text-sm px-4 py-1.5 rounded-full border transition-all ${restraintReason===r?'bg-orange-500 text-white shadow-lg border-orange-400':'bg-white/40 border-white/40 hover:bg-white/60'}`}>{r}</button>)}</div>
                     
                     <h3 className="font-bold text-lg text-orange-700 mt-2 flex items-center"><Activity size={18} className="mr-2"/> 約束類別</h3>
                     <div className="flex flex-wrap gap-2">{NANDA_FOCUS_DATA.restraint_limbs.types?.map(t=><button key={t} onClick={()=>setRestraintType(t)} className={`text-sm px-4 py-1.5 rounded-full border transition-all ${restraintType===t?'bg-orange-500 text-white shadow-lg border-orange-400':'bg-white/40 border-white/40 hover:bg-white/60'}`}>{t}</button>)}</div>

                     <h3 className="font-bold text-lg text-orange-700 mt-2 flex items-center"><Layers size={18} className="mr-2"/> 約束部位</h3>
                     <div className="flex flex-wrap gap-2">{NANDA_FOCUS_DATA.restraint_limbs.scopes?.map(s=><button key={s} onClick={()=>setRestraintScope(s)} className={`text-sm px-4 py-1.5 rounded-full border transition-all ${restraintScope===s?'bg-orange-500 text-white shadow-lg border-orange-400':'bg-white/40 border-white/40 hover:bg-white/60'}`}>{s}</button>)}</div>

                     <div className="flex-1 space-y-2 mt-2">
                         {NANDA_FOCUS_DATA.restraint_limbs.d_templates?.map((t,i)=><button key={i} onClick={()=>addText('D',t)} className="text-sm text-left w-full p-3 bg-white/30 border border-white/40 rounded-xl hover:bg-white/60 transition-colors">{t.replace(/○○/g, restraintReason).replace(/△△/g, restraintType).replace(/□□/g, restraintScope)}</button>)}
                     </div>
                 </div>
             ) : showFallsBox || showSleepBox ? (
                 <div className="p-6 flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar">
                     <h3 className={`font-bold text-lg flex items-center gap-2 ${showFallsBox?'text-red-700':'text-indigo-700'}`}>{showFallsBox?<AlertTriangle size={20}/>:<Moon size={20}/>} {showFallsBox?'跌倒風險':'睡眠資料'}</h3>
                     
                     {showSleepBox && (
                         <div className="grid grid-cols-2 gap-3 mb-1">
                             <div className="bg-white/40 p-3 rounded-xl border border-white/40">
                                 <label className="text-xs font-bold text-indigo-800 block mb-1">入睡時間</label>
                                 <input type="time" value={customSleepTime} onChange={e=>setCustomSleepTime(e.target.value)} className="glass-input w-full p-1.5 rounded-lg text-sm font-bold text-indigo-900"/>
                             </div>
                             <div className="bg-white/40 p-3 rounded-xl border border-white/40">
                                 <label className="text-xs font-bold text-indigo-800 block mb-1">清醒時間</label>
                                 <input type="time" value={customWakeTime} onChange={e=>setCustomWakeTime(e.target.value)} className="glass-input w-full p-1.5 rounded-lg text-sm font-bold text-indigo-900"/>
                             </div>
                         </div>
                     )}

                     <div className="flex-1 space-y-2">
                        {(showFallsBox ? NANDA_FOCUS_DATA.risk_falls : NANDA_FOCUS_DATA.sleep_pattern).d_options?.map(o => {
                            let displayText = o;
                            if (showSleepBox) {
                                if (o.startsWith('病人於')) displayText = o.replace(/○○：○○/g, formatTimeForDoc(customSleepTime));
                                else if (o.includes('晨醒') || o.includes('早醒')) displayText = o.replace(/○○：○○/g, formatTimeForDoc(customWakeTime));
                            }
                            return (
                                <button key={o} onClick={()=>toggle(o, showFallsBox?fallsD:sleepD, showFallsBox?setFallsD:setSleepD)} className={`text-sm text-left w-full p-3 rounded-xl border transition-all ${ (showFallsBox?fallsD:sleepD).includes(o) ? 'bg-slate-700 text-white shadow-lg' : 'bg-white/40 border-white/40 hover:bg-white/60 text-slate-700'}`}>{displayText}</button>
                            );
                        })}
                     </div>
                 </div>
             ) : (
                 <>
                    {/* Check if discharge_planning, show button at the top */}
                    {selectedFocus === 'discharge_planning' && (
                         <div className="px-4 pt-4 pb-2 shrink-0">
                             <button 
                                onClick={() => setChecklistType('discharge')}
                                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-xl shadow-lg hover:shadow-fuchsia-500/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
                            >
                                <ListChecks size={18} />
                                開啟出院檢核表
                            </button>
                         </div>
                    )}

                    {/* MSE Tabs */}
                    <div className="flex flex-col flex-1 min-h-0">
                        <div className="shrink-0 border-b border-white/20 bg-white/10 backdrop-blur-md">
                            <div className="w-full overflow-x-auto pb-2 pt-2 px-2 custom-scrollbar">
                                <div className="flex flex-nowrap gap-2">
                                {Object.entries(MSE_COMMON_DATA).map(([key, data]) => (
                                    <button 
                                        key={key} 
                                        onClick={() => setActiveMseCategory(key)}
                                        className={`px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0 ${activeMseCategory === key ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400' : 'bg-white/30 text-slate-600 hover:bg-white/50 hover:text-slate-800'}`}
                                    >
                                        {data.title}
                                    </button>
                                ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                             {MSE_COMMON_DATA[activeMseCategory] && (
                                 <div className="flex flex-wrap gap-2 animate-fade-in">
                                     {MSE_COMMON_DATA[activeMseCategory].tags.map(t => (
                                         <button 
                                             key={t.id} 
                                             onClick={() => toggle(t.id, selectedMSE, setSelectedMSE)} 
                                             className={`text-sm px-4 py-1.5 rounded-full border transition-all duration-300 backdrop-blur-sm ${selectedMSE.includes(t.id)?'bg-blue-600 text-white border-blue-500 shadow-lg':'bg-white/40 text-slate-700 border-white/40 hover:bg-white/60'}`}
                                         >
                                             {t.text}
                                         </button>
                                     ))}
                                 </div>
                             )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col border-t border-white/30 bg-indigo-50/20 backdrop-blur-sm">
                        <div className="p-3 bg-white/20 font-bold text-base text-indigo-900 flex items-center gap-2 shrink-0 backdrop-blur-md"><Brain size={18}/> 主訴/補充</div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                            <textarea value={customSubjective} onChange={e=>setCustomSubjective(e.target.value)} className="glass-input w-full p-3 rounded-xl text-lg h-24 resize-none outline-none" placeholder="輸入自訂主訴..."/>
                            <div>
                                <div className="text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider pl-1">通用選項</div>
                                <div className="flex flex-wrap gap-2">{COMMON_D_OBSERVATIONS.map(t=><button key={t.id} onClick={()=>toggle(t.id, selectedSubjective, setSelectedSubjective)} className={`text-sm px-3 py-1.5 rounded-xl border transition-all ${selectedSubjective.includes(t.id)?'bg-indigo-600 text-white shadow-lg':'bg-white/40 hover:bg-white/60 border-white/40'}`}>{t.text}</button>)}</div>
                            </div>
                        </div>
                    </div>
                 </>
             )}
        </div>

        {/* Middle: Suggestions (Stacked) */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="p-4 bg-white/30 backdrop-blur-md border-b border-white/30 font-bold text-base text-slate-700 flex items-center gap-2"><Activity size={18} className="text-pink-500"/> 處置建議</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                
                {/* A Section */}
                <div className="glass-card rounded-2xl overflow-hidden group">
                    <div className="px-4 py-2 bg-gradient-to-r from-pink-500/10 to-transparent border-b border-white/30 flex justify-between items-center">
                        <span className="text-sm font-bold text-pink-700">A (措施)</span>
                        <button onClick={handleAiSuggestA} disabled={isAiLoading.a} className="glass-button flex items-center gap-1 px-3 py-1 rounded-full text-xs text-pink-700 font-bold hover:bg-white/50">
                            {isAiLoading.a ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} AI 建議
                        </button>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                         <div className="pb-2 mb-1 border-b border-white/30"><div className="grid grid-cols-1 gap-1">{COMMON_A_OPTIONS.map((t,i)=><button key={i} onClick={()=>addText('A',t)} className="text-sm text-left px-3 py-2 hover:bg-white/50 rounded-lg truncate transition-colors text-slate-600">+ {t}</button>)}</div></div>
                         {activeFocusData?.actions?.map((t,i)=><button key={i} onClick={()=>addText('A',t)} className="text-sm text-left px-3 py-2 hover:bg-white/50 rounded-lg text-slate-700 leading-snug transition-colors">+ {t.replace(/○○○○/g, injectionSite||'______').replace(/○○/g, visitorName||'○○')}</button>)}
                    </div>
                </div>

                {/* R Section */}
                <div className="glass-card rounded-2xl overflow-hidden group">
                    <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-transparent border-b border-white/30">
                        <span className="text-sm font-bold text-emerald-700">R (評值)</span>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5">
                        <div className="pb-2 mb-1 border-b border-white/30 flex flex-wrap gap-2">{COMMON_R_OPTIONS.map((t,i)=><button key={i} onClick={()=>addText('R',t)} className="text-sm bg-white/40 border border-white/40 px-3 py-1 rounded-full hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors truncate max-w-full">• {t}</button>)}</div>
                        {activeFocusData?.responses?.map((t,i)=><button key={i} onClick={()=>addText('R',t)} className="text-sm text-left px-3 py-2 hover:bg-white/50 rounded-lg text-slate-700 leading-snug transition-colors">+ {t.replace(/○○○○/g, injectionSite||'______').replace(/○○/g, visitorName||'○○')}</button>)}
                    </div>
                </div>

                {/* T Section */}
                {activeFocusData?.teachings && activeFocusData.teachings!.length > 0 && (
                    <div className="glass-card rounded-2xl overflow-hidden group">
                        <div className="px-4 py-2 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-white/30">
                            <span className="text-sm font-bold text-amber-700">T (衛教)</span>
                        </div>
                        <div className="p-3 flex flex-col gap-1.5">
                            {activeFocusData.teachings!.map((t,i)=><button key={i} onClick={()=>addText('T',t)} className="text-sm text-left px-3 py-2 hover:bg-white/50 rounded-lg text-slate-700 leading-snug transition-colors">+ {t}</button>)}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Right: Output (Stacked) */}
        <div className="flex-1 min-w-0 glass-panel rounded-3xl flex flex-col min-h-0 overflow-hidden transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
            <div className="p-4 bg-slate-800/90 backdrop-blur-md text-white font-bold text-base flex justify-between items-center shadow-lg z-10 shrink-0">
                <span className="flex items-center gap-2"><FileText size={18}/> 紀錄預覽</span>
                <button onClick={copyAll} className="glass-button bg-green-500/20 text-green-300 border-green-500/50 px-4 py-1.5 rounded-full hover:bg-green-500/40 text-sm flex items-center gap-2 transition-all"><Copy size={14}/> 複製</button>
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar flex flex-col bg-white/20">
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-[2] min-h-[140px] transition-all focus-within:ring-2 ring-blue-400/30">
                    <div className="flex justify-between px-1 mb-2 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-blue-600 bg-blue-100/50 px-2 py-1 rounded-md backdrop-blur-md">D: Data</span>
                            <button onClick={() => copySingle(record.D, 'D')} className="text-blue-500 hover:text-blue-700 transition-colors p-1 hover:bg-blue-100/50 rounded-md" title="複製內容"><Copy size={14}/></button>
                        </div>
                        <button onClick={handleAiPolishD} disabled={isAiLoading.d} className="text-xs text-blue-500 flex items-center gap-1 hover:bg-blue-50 rounded-full px-3 py-1 transition-colors border border-blue-200/50">
                            {isAiLoading.d ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} 修飾
                        </button>
                    </div>
                    <textarea value={record.D} onChange={e=>setRecord({...record,D:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 leading-relaxed bg-transparent placeholder-slate-400/70" placeholder="輸入資料..."/>
                </div>
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-1 min-h-[110px] transition-all focus-within:ring-2 ring-pink-400/30">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-pink-600 bg-pink-100/50 px-2 py-1 rounded-md backdrop-blur-md">A: Action</span>
                        <button onClick={() => copySingle(record.A, 'A')} className="text-pink-500 hover:text-pink-700 transition-colors p-1 hover:bg-pink-100/50 rounded-md" title="複製內容"><Copy size={14}/></button>
                    </div>
                    <textarea value={record.A} onChange={e=>setRecord({...record,A:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 leading-relaxed bg-transparent placeholder-slate-400/70" placeholder="輸入措施..."/>
                </div>
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-1 min-h-[110px] transition-all focus-within:ring-2 ring-emerald-400/30">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-100/50 px-2 py-1 rounded-md backdrop-blur-md">R: Response</span>
                        <button onClick={() => copySingle(record.R, 'R')} className="text-emerald-500 hover:text-emerald-700 transition-colors p-1 hover:bg-emerald-100/50 rounded-md" title="複製內容"><Copy size={14}/></button>
                    </div>
                    <textarea value={record.R} onChange={e=>setRecord({...record,R:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 leading-relaxed bg-transparent placeholder-slate-400/70" placeholder="輸入評值..."/>
                </div>
                <div className="glass-card rounded-2xl p-3 flex flex-col flex-1 min-h-[110px] transition-all focus-within:ring-2 ring-amber-400/30">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 bg-amber-100/50 px-2 py-1 rounded-md backdrop-blur-md">T: Teaching</span>
                        <button onClick={() => copySingle(record.T, 'T')} className="text-amber-500 hover:text-amber-700 transition-colors p-1 hover:bg-amber-100/50 rounded-md" title="複製內容"><Copy size={14}/></button>
                    </div>
                    <textarea value={record.T} onChange={e=>setRecord({...record,T:e.target.value})} className="w-full flex-1 text-base outline-none resize-none p-2 text-slate-700 leading-relaxed bg-transparent placeholder-slate-400/70" placeholder="輸入衛教..."/>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PsychNursingProV39;