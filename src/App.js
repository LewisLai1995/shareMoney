import { useState, useRef, useEffect, useCallback } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, onSnapshot,
  setDoc, addDoc, updateDoc, deleteDoc, getDoc, getDocs,
  query, orderBy, serverTimestamp
} from "firebase/firestore";

// -- Firebase -------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCvMPTbuuoT3vtPHZ-rGVGlxHy__Q0WvbQ",
  authDomain: "sharemoney-3cf22.firebaseapp.com",
  projectId: "sharemoney-3cf22",
  storageBucket: "sharemoney-3cf22.firebasestorage.app",
  messagingSenderId: "311495146563",
  appId: "1:311495146563:web:995568a85d2ec62d14e8f6",
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

// -- Constants ------------------------------------------------------------------
const MEMBER_COLORS = ["#2563EB","#7C3AED","#DC2626","#059669","#D97706","#DB2777","#0891B2","#64748B"];
const BOOK_COLORS   = ["#2563EB","#7C3AED","#DC2626","#059669","#D97706","#DB2777","#0891B2","#374151"];
const BOOK_EMOJIS   = ["💳","✈️","🏖️","🍜","🎮","🎉","🏕️","🛒","🎵","⚽","🐶","🌸"];
const USER_EMOJIS   = ["🐱","🐶","🐼","🦊","🐸","🐯","🦁","🐨","🐮","🐷","🐻","🐺","🦝","🐹","🐰","🦄","🐙","🐧","🦋","🦊"];
const CURRENCIES    = [
  { code:"TWD", symbol:"NT$", rate:1 },
  { code:"USD", symbol:"$",   rate:32 },
  { code:"JPY", symbol:"¥",   rate:0.22 },
  { code:"EUR", symbol:"€",   rate:34.5 },
  { code:"KRW", symbol:"₩",   rate:0.024 },
  { code:"HKD", symbol:"HK$", rate:4.1 },
];
const CATEGORIES = [
  { id:"food",      label:"餐飲",    emoji:"🍜", color:"#F97316" },
  { id:"transport", label:"交通",    emoji:"🚗", color:"#3B82F6" },
  { id:"stay",      label:"住宿",    emoji:"🏠", color:"#8B5CF6" },
  { id:"fun",       label:"娛樂",    emoji:"🎮", color:"#EC4899" },
  { id:"shopping",  label:"購物",    emoji:"🛒", color:"#10B981" },
  { id:"medical",   label:"醫療",    emoji:"💊", color:"#EF4444" },
  { id:"proxy",     label:"代購",    emoji:"📦", color:"#64748B" },
  { id:"other",     label:"其他",    emoji:"📌", color:"#94A3B8" },
];
const PAYMENT_APPS = [
  { id:"linepay", label:"LINE Pay", emoji:"💚", appScheme:"line://pay", iosStore:"https://apps.apple.com/tw/app/line/id443904275", androidStore:"https://play.google.com/store/apps/details?id=jp.naver.line.android" },
  { id:"jkopay",  label:"街口支付", emoji:"🟠", appScheme:"jkopay://", iosStore:"https://apps.apple.com/tw/app/%E8%A1%97%E5%8F%A3%E6%94%AF%E4%BB%98/id1198002009", androidStore:"https://play.google.com/store/apps/details?id=com.jkopay.app" },
  { id:"allpay",  label:"全支付",   emoji:"🔵", appScheme:"allpay://", iosStore:"https://apps.apple.com/tw/app/%E5%85%A8%E6%94%AF%E4%BB%98/id1609540474", androidStore:"https://play.google.com/store/apps/details?id=com.allpay.wallet" },
  { id:"esun",    label:"玉山銀行", emoji:"🏔️", appScheme:"esunbank://", iosStore:"https://apps.apple.com/tw/app/%E7%8E%89%E5%B1%B1%E9%8A%80%E8%A1%8C/id382006912", androidStore:"https://play.google.com/store/apps/details?id=com.esunbank.mobile" },
  { id:"ctbc",    label:"中國信託", emoji:"🏦", appScheme:"ctbcbank://", iosStore:"https://apps.apple.com/tw/app/%E4%B8%AD%E5%9C%8B%E4%BF%A1%E8%A8%97/id370486914", androidStore:"https://play.google.com/store/apps/details?id=com.chinatrust.mobilebank" },
  { id:"taishin", label:"台新銀行", emoji:"🔴", appScheme:"taishinbank://", iosStore:"https://apps.apple.com/tw/app/%E5%8F%B0%E6%96%B0%E9%8A%80%E8%A1%8C/id476439722", androidStore:"https://play.google.com/store/apps/details?id=com.taishinbank.mobile" },
  { id:"land",    label:"土地銀行", emoji:"🟢", appScheme:"landbank://", iosStore:"https://apps.apple.com/tw/app/%E5%9C%9F%E9%8A%80%E8%A1%8C/id1439401022", androidStore:"https://play.google.com/store/apps/details?id=com.landbank.mobile" },
  { id:"sinopac", label:"永豐銀行", emoji:"🟡", appScheme:"sinopacbank://", iosStore:"https://apps.apple.com/tw/app/%E6%B0%B8%E8%B1%90%E9%8A%80%E8%A1%8C/id465573698", androidStore:"https://play.google.com/store/apps/details?id=com.banksinopac.mobilebank" },
  { id:"custom",  label:"自訂",     emoji:"✏️", appScheme:"", iosStore:"", androidStore:"" },
];
const DAYS_ZH  = ["日","一","二","三","四","五","六"];
const todayStr = () => new Date().toISOString().slice(0,10);
const toTWD    = (amt, code) => Number(amt) * (CURRENCIES.find(c=>c.code===code)?.rate||1);
const fmtAmt   = (amt, code) => `${CURRENCIES.find(c=>c.code===code)?.symbol||"NT$"}${Number(amt).toLocaleString()}`;
const getMColor= (name, members) => MEMBER_COLORS[Math.max(0,members.findIndex(m=>m.name===name)) % MEMBER_COLORS.length];
const randCode = () => Math.random().toString(36).slice(2,8).toUpperCase();
const hashPw   = async pw => { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); };

// -- useThemeColor hook --------------------------------------------------------
function useThemeColor(color) {
  useEffect(()=>{
    const meta = document.querySelector("meta[name='theme-color']");
    if(meta) meta.setAttribute("content", color);
    document.body.style.background = color;
    return ()=>{
      if(meta) meta.setAttribute("content","#2563EB");
      document.body.style.background = "#1D4ED8";
    };
  },[color]);
}

// -- Donut Chart ----------------------------------------------------------------
function DonutChart({ data, total, size=160 }) {
  const r = 54, cx = 80, cy = 80, stroke = 20;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.filter(d=>d.value>0).map(d=>{
    const pct = d.value / total;
    const dash = pct * circ;
    const slice = { ...d, offset, dash, pct };
    offset += dash;
    return slice;
  });
  return (
    <svg width={size} height={size} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EFF6FF" strokeWidth={stroke}/>
      {slices.map((s,i)=>(
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ-s.dash}`}
          strokeDashoffset={circ/4 - s.offset}
          style={{ transition:"stroke-dasharray .5s ease" }}/>
      ))}
      <text x={cx} y={cy-8} textAnchor="middle" fontSize={11} fill="#64748B" fontFamily="'Noto Sans TC',sans-serif">總計</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={13} fontWeight="800" fill="#1E3A5F" fontFamily="'Noto Sans TC',sans-serif">NT${Math.round(total).toLocaleString()}</text>
    </svg>
  );
}

// -- Spinner --------------------------------------------------------------------
function Spinner({ fullscreen }) {
  const el = <div style={{ width:36,height:36,borderRadius:"50%",border:"3px solid #EFF6FF",borderTopColor:"#2563EB",animation:"spin .7s linear infinite" }}/>;
  if(!fullscreen) return <div style={{ display:"flex",justifyContent:"center",padding:32 }}>{el}</div>;
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans TC',sans-serif" }}>
      <div style={{ fontSize:48,marginBottom:20 }}>💳</div>{el}
      <div style={{ color:"rgba(255,255,255,.7)",marginTop:12,fontSize:14 }}>連線中…</div>
    </div>
  );
}

// -- Toast ----------------------------------------------------------------------
function Toast({ msg }) {
  return msg ? <div style={{ position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:"#1E3A5F",color:"#fff",borderRadius:14,padding:"10px 22px",fontWeight:700,fontSize:14,zIndex:9999,whiteSpace:"nowrap",boxShadow:"0 8px 24px rgba(30,58,95,.25)",animation:"fadeUp .2s ease" }}>{msg}</div> : null;
}

// -- Modal ----------------------------------------------------------------------
function Modal({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(15,23,42,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:400,boxShadow:"0 24px 64px rgba(37,99,235,.18)",maxHeight:"90vh",overflowY:"auto" }}>{children}</div>
    </div>
  );
}

// -- Avatar ---------------------------------------------------------------------
function Avatar({ name, emoji, members, size=36 }) {
  const bg = getMColor(name||"?", members||[]);
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",flexShrink:0,background:emoji?"transparent":bg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:emoji?size*.55:size*.4,color:"#fff",boxShadow:emoji?"none":"0 2px 6px rgba(0,0,0,.18)" }}>
      {emoji || (name||"?")[0]}
    </div>
  );
}

// -- Chip -----------------------------------------------------------------------
function Chip({ label, active, color, onClick, small }) {
  return (
    <button onClick={onClick} style={{ border:"none",cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",borderRadius:20,padding:small?"4px 9px":"6px 13px",fontSize:small?11:12,fontWeight:700,flexShrink:0,transition:"all .15s",background:active?(color||"#2563EB"):"#EFF6FF",color:active?"#fff":"#334155" }}>{label}</button>
  );
}

// -- WeekPicker -----------------------------------------------------------------
function WeekPicker({ selected, onChange, datesWithData=[], datesFlagged=[] }) {
  const [offset,setOffset]     = useState(0);
  const [showPicker,setShowPicker] = useState(false);
  const [animDir,setAnimDir]   = useState(null);
  const touchX = useRef(null);
  const today  = todayStr();

  const weekDays = (() => {
    const base=new Date(); base.setDate(base.getDate()+offset*7);
    const sun=new Date(base); sun.setDate(base.getDate()-base.getDay());
    return Array.from({length:7},(_,i)=>{ const d=new Date(sun); d.setDate(sun.getDate()+i); return d.toISOString().slice(0,10); });
  })();

  const weekLabel = offset===0?"本週":offset===-1?"上週":offset===1?"下週"
    :`${new Date(weekDays[0]+"T12:00").getMonth()+1}/${new Date(weekDays[0]+"T12:00").getDate()} – ${new Date(weekDays[6]+"T12:00").getMonth()+1}/${new Date(weekDays[6]+"T12:00").getDate()}`;

  const go = dir => { setAnimDir(dir); setOffset(o=>o+(dir==="left"?1:-1)); };
  const jumpTo = d => { const diff=Math.floor((new Date(d)-new Date(today))/(7*86400000)); setAnimDir(diff>offset?"left":"right"); setOffset(diff); onChange(d); setShowPicker(false); };

  return (
    <div onTouchStart={e=>{touchX.current=e.touches[0].clientX;}} onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-(touchX.current||0); if(Math.abs(dx)>40) go(dx<0?"left":"right"); touchX.current=null; }}
      style={{ background:"#fff",borderRadius:14,padding:"10px 10px 8px",marginBottom:12,boxShadow:"0 2px 10px rgba(37,99,235,.07)",touchAction:"pan-y",userSelect:"none" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6 }}>
        <span style={{ fontSize:12,fontWeight:700,color:"#64748B" }}>{weekLabel}</span>
        <div style={{ display:"flex",gap:5 }}>
          <button onClick={()=>{ setAnimDir("right"); setOffset(0); onChange(today); }} style={wkBtn}>回到今日</button>
          <button onClick={()=>setShowPicker(v=>!v)} style={wkBtn}>指定日期</button>
        </div>
      </div>
      {showPicker&&(
        <div style={{ overflow:"hidden",borderRadius:9,border:"1.5px solid #BFDBFE",background:"#F8FBFF",marginBottom:6 }}>
          <input type="date" defaultValue={selected} autoFocus onChange={e=>e.target.value&&jumpTo(e.target.value)}
            onBlur={()=>setShowPicker(false)} style={{ width:"100%",padding:"7px 10px",border:"none",fontSize:13,fontFamily:"inherit",boxSizing:"border-box",background:"transparent",color:"#1E3A5F",WebkitAppearance:"none",appearance:"none" }}/>
        </div>
      )}
      <div style={{ display:"flex",alignItems:"center" }}>
        <button onClick={()=>go("right")} style={arrowBtn}>‹</button>
        <div key={offset} style={{ flex:1,display:"flex",animation:animDir?(animDir==="left"?"slideLeft .22s ease":"slideRight .22s ease"):"none" }} onAnimationEnd={()=>setAnimDir(null)}>
          {weekDays.map(d=>{
            const dt=new Date(d+"T12:00"),isSel=d===selected,isTdy=d===today,hasDot=datesWithData.includes(d);
            return (
              <button key={d} onClick={()=>onChange(d)} style={{ flex:1,border:"none",cursor:"pointer",borderRadius:10,padding:"5px 1px",background:isSel?"#2563EB":isTdy?"#EFF6FF":"transparent",fontFamily:"inherit",transition:"all .15s" }}>
                <div style={{ fontSize:11,fontWeight:600,color:isSel?"rgba(255,255,255,.75)":isTdy?"#2563EB":"#94A3B8" }}>{DAYS_ZH[dt.getDay()]}</div>
                <div style={{ fontSize:15,fontWeight:800,color:isSel?"#fff":isTdy?"#2563EB":"#334155",marginTop:1 }}>{dt.getDate()}</div>
                <div style={{ height:5,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1 }}>
                  {datesFlagged.includes(d)
                    ? <div style={{ fontSize:8,fontWeight:800,color:isSel?"rgba(255,255,255,.9)":"#EF4444",lineHeight:1 }}>!</div>
                    : hasDot&&<div style={{ width:4,height:4,borderRadius:"50%",background:isSel?"rgba(255,255,255,.7)":isTdy?"#2563EB":"#94A3B8" }}/>
                  }
                </div>
              </button>
            );
          })}
        </div>
        <button onClick={()=>go("left")} style={arrowBtn}>›</button>
      </div>
    </div>
  );
}

// -- ExpenseForm ----------------------------------------------------------------
function ExpenseForm({ members, initialData, onSave, onCancel, saveLabel="確認新增", loading, bookColor="#2563EB" }) {
  const init = { desc:"",amount:"",currency:"TWD",paidBy:members[0]?.name||"",category:CATEGORIES[0].id,splitWith:members.map(m=>m.name),plusOnes:{},date:todayStr(),...(initialData||{}) };
  const [form,setForm] = useState(init);
  const [errors,setErrors] = useState({});
  const [shake,setShake]   = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleSplit = n => set("splitWith",form.splitWith.includes(n)?form.splitWith.filter(x=>x!==n):[...form.splitWith,n]);
  const togglePO    = n => { const po={...form.plusOnes}; po[n]?delete po[n]:(po[n]=true); set("plusOnes",po); };
  const sc     = form.splitWith.reduce((s,n)=>s+1+(form.plusOnes[n]?1:0),0);
  const twdAmt = form.amount?toTWD(parseFloat(form.amount)||0,form.currency):0;
  const perTWD = sc>0&&twdAmt?twdAmt/sc:0;
  // Rounding: who pays extra $1
  const base   = Math.floor(perTWD), extra = Math.round(twdAmt - base*sc);
  const isWF = false;
  const saveBg = isWF?"#16A34A":bookColor;

  const validate = () => {
    const e={};
    if(!form.desc.trim())                            e.desc=true;
    if(!form.amount||isNaN(parseFloat(form.amount))) e.amount=true;
    if(!form.paidBy)                                 e.paidBy=true;
    if(!form.splitWith.length)                       e.split=true;
    return e;
  };
  const handleSave = () => {
    const e=validate();
    if(Object.keys(e).length){ setErrors(e); setShake(true); setTimeout(()=>setShake(false),500); return; }
    setErrors({}); onSave({...form,amount:parseFloat(form.amount),id:form.id||Date.now()});
  };

  const inputStyle = (field) => ({
    ...fld,
    ...(errors[field]?{ borderColor:"#EF4444",background:"#FFF5F5" }:{}),
    ...(shake&&errors[field]?{ animation:"shake .4s ease" }:{})
  });

  return (
    <div style={{ background:"#fff",borderRadius:18,boxShadow:"0 4px 20px rgba(37,99,235,.10)",overflow:"hidden" }}>
      <div style={{ display:"flex",minHeight:0 }}>
        {/* LEFT */}
        <div style={{ flex:"0 0 50%",width:0,minWidth:0,padding:"12px 6px 10px 12px",borderRight:"1px solid #EFF6FF",boxSizing:"border-box",overflow:"hidden" }}>
          <div style={{ marginBottom:8 }}>
            <div style={lbl}>📅 日期</div>
            <div style={{ overflow:"hidden",borderRadius:9,border:`1.5px solid ${errors.date?"#EF4444":"#BFDBFE"}`,background:"#F8FBFF" }}>
              <input type="date" value={form.date} onChange={e=>set("date",e.target.value)}
                style={{ width:"100%",padding:"8px 10px",border:"none",fontSize:14,fontFamily:"inherit",background:"transparent",color:"#1E3A5F",boxSizing:"border-box",display:"block",WebkitAppearance:"none",appearance:"none" }}/>
            </div>
          </div>
          <div style={{ marginBottom:8 }}>
            <div style={lbl}>📝 品項</div>
            <input placeholder="說明" value={form.desc} onChange={e=>{ set("desc",e.target.value); setErrors(p=>({...p,desc:false})); }}
              style={inputStyle("desc")}/>
          </div>
          <div>
            <div style={lbl}>💵 金額</div>
            <div style={{ display:"flex",gap:4 }}>
              <select value={form.currency} onChange={e=>set("currency",e.target.value)}
                style={{ ...fld,width:64,flex:"none",padding:"8px 4px",minWidth:0 }}>
                {CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <input type="number" placeholder="0" value={form.amount}
                onChange={e=>{ set("amount",e.target.value); setErrors(p=>({...p,amount:false})); }}
                style={{ ...inputStyle("amount"),flex:1,minWidth:0 }}/>
            </div>
            {form.currency!=="TWD"&&form.amount&&<div style={{ fontSize:10,color:bookColor,fontWeight:600,marginTop:3 }}>≈ NT${Math.round(twdAmt).toLocaleString()}</div>}
          </div>
        </div>
        {/* RIGHT */}
        <div style={{ flex:"0 0 50%",width:0,minWidth:0,padding:"12px 12px 10px 8px",boxSizing:"border-box",overflow:"hidden" }}>
          <div style={{ marginBottom:10 }}>
            <div style={lbl}>👤 誰付錢？</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
              {members.map(m=><Chip key={m.name} label={m.nickname||m.name} active={form.paidBy===m.name} color={getMColor(m.name,members)} onClick={()=>set("paidBy",m.name)} small/>)}
            </div>
          </div>
          <div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4 }}>
              <div style={lbl}>👥 分攤成員</div>
              <button onClick={()=>set("splitWith",form.splitWith.length===members.length?[]:members.map(m=>m.name))}
                style={{ fontSize:10,color:bookColor,background:"none",border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit" }}>
                {form.splitWith.length===members.length?"全取消":"全選"}
              </button>
            </div>
            {errors.split&&<div style={{ fontSize:11,color:"#EF4444",marginBottom:4 }}>請選擇至少一位</div>}
            {members.map(m=>{
              const inSplit=form.splitWith.includes(m.name),col=getMColor(m.name,members),poOn=form.plusOnes[m.name];
              return (
                <div key={m.name} style={{ display:"flex",alignItems:"center",gap:4,marginBottom:5,minHeight:34 }}>
                  <button onClick={()=>toggleSplit(m.name)} style={{ flex:1,display:"flex",alignItems:"center",gap:5,border:"none",cursor:"pointer",borderRadius:9,padding:"5px 7px",fontFamily:"inherit",minWidth:0,background:inSplit?col+"1A":"#F8FAFC",outline:inSplit?`1.5px solid ${col}`:"1.5px solid #E2E8F0" }}>
                    <Avatar name={m.name} emoji={m.emoji} members={members} size={20}/>
                    <span style={{ fontSize:12,fontWeight:700,color:inSplit?col:"#94A3B8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.nickname||m.name}</span>
                    <span style={{ marginLeft:"auto",fontSize:13,color:inSplit?col:"#CBD5E1",flexShrink:0 }}>{inSplit?"✓":"○"}</span>
                  </button>
                  {m.hasPlusOne&&inSplit&&(
                    <button onClick={()=>togglePO(m.name)} style={{ border:"none",borderRadius:7,padding:"4px 7px",cursor:"pointer",fontFamily:"inherit",background:poOn?bookColor:"#EFF6FF",color:poOn?"#fff":bookColor,fontSize:11,fontWeight:800,flexShrink:0 }}>+1</button>
                  )}
                </div>
              );
            })}
            {perTWD>0&&(
              <div style={{ fontSize:11,color:isWF?"#16A34A":bookColor,fontWeight:700,background:isWF?"#F0FDF4":"#EFF6FF",borderRadius:7,padding:"4px 8px",marginTop:4 }}>
                每人 NT${base}{extra>0&&<span style={{ color:"#94A3B8",fontWeight:400 }}> (1人多付 NT$1)</span>}
                {form.currency!=="TWD"&&" (換算)"}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Category */}
      <div style={{ padding:"10px 12px 8px",borderTop:"1px solid #EFF6FF" }}>
        <div style={lbl}>🏷️ 類別</div>
        <div style={{ display:"flex",gap:5,overflowX:"auto",paddingBottom:2,scrollbarWidth:"none" }}>
          {CATEGORIES.map(cat=>(
            <button key={cat.id} onClick={()=>set("category",cat.id)} style={{ flexShrink:0,border:"none",borderRadius:20,padding:"6px 12px",background:form.category===cat.id?(cat.id==="windfall"?"#16A34A":bookColor):"#EFF6FF",color:form.category===cat.id?"#fff":bookColor,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap" }}>{cat.emoji} {cat.label}</button>
          ))}
        </div>
      </div>
      {/* Footer */}
      <div style={{ display:"flex",gap:8,padding:"10px 12px",borderTop:"1px solid #EFF6FF" }}>
        {onCancel&&<button onClick={onCancel} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>取消</button>}
        <button onClick={handleSave} disabled={loading} style={{ ...actionBtn,background:saveBg,color:"#fff",flex:2,opacity:loading?.6:1 }}>
          {loading?"處理中…":`${isWF?"🍀 ":""}${saveLabel}`}
        </button>
      </div>
    </div>
  );
}

// -- ConfirmDialog --------------------------------------------------------------
function ConfirmDialog({ msg, sub, confirmLabel="確認刪除", confirmColor="#EF4444", onConfirm, onCancel }) {
  return (
    <Modal onClose={onCancel}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36,marginBottom:10 }}>⚠️</div>
        <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:6 }}>{msg}</div>
        {sub&&<div style={{ fontSize:13,color:"#64748B",marginBottom:4 }}>{sub}</div>}
        <div style={{ display:"flex",gap:10,marginTop:18 }}>
          <button onClick={onCancel}  style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>取消</button>
          <button onClick={onConfirm} style={{ ...actionBtn,background:confirmColor,color:"#fff",flex:1 }}>{confirmLabel}</button>
        </div>
      </div>
    </Modal>
  );
}

// -- SpinnerWheel (決定誰多付1元) -----------------------------------------------
function SpinnerWheel({ names, onDone }) {
  const [spinning, setSpinning] = useState(false);
  const [winner,   setWinner]   = useState(null);
  const [angle,    setAngle]    = useState(0);
  const [spinKey,  setSpinKey]  = useState(0);

  const spin = () => {
    if(spinning) return;
    setSpinning(true); setWinner(null);
    setSpinKey(k=>k+1); setAngle(0);
    const winIdx = Math.floor(Math.random() * names.length);
    const sliceAngle2 = 360 / names.length;
    // Add random offset within the winning slice (0.1~0.9 of slice) for variety
    const sliceOffset = (0.1 + Math.random() * 0.8) * sliceAngle2;
    // Pointer is at top (0deg). Each slice starts at i*sliceAngle2.
    // We want pointer to land inside winIdx slice
    const targetAngle = winIdx * sliceAngle2 + sliceOffset;
    // Full rotations: 8-14 rotations for excitement, each run different
    const extraRounds = (8 + Math.floor(Math.random() * 6)) * 360;
    // Final angle: enough full spins + land on target
    const finalAngle = extraRounds + (360 - targetAngle);
    setAngle(finalAngle);
    setTimeout(()=>{
      setWinner(names[winIdx]); setSpinning(false);
    }, 2500);
  };

  const sliceAngle = 360/names.length;
  return (
    <Modal onClose={()=>!spinning&&onDone(winner)}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:28,fontWeight:800,color:"#1E3A5F",marginBottom:4 }}>🎰 誰多付 NT$1？</div>
        <div style={{ fontSize:13,color:"#94A3B8",marginBottom:16 }}>金額除不盡，轉盤決定！</div>
        <div style={{ position:"relative",width:200,height:200,margin:"0 auto 16px" }}>
          <svg key={spinKey} width={200} height={200} style={{ transform:`rotate(${angle}deg)`,transition:spinning?"transform 2.5s cubic-bezier(.22,.68,0,1.2)":"none" }}>
            {names.map((n,i)=>{
              const a1=(i*sliceAngle-90)*Math.PI/180, a2=((i+1)*sliceAngle-90)*Math.PI/180;
              const x1=100+90*Math.cos(a1),y1=100+90*Math.sin(a1),x2=100+90*Math.cos(a2),y2=100+90*Math.sin(a2);
              const lx=100+55*Math.cos((a1+a2)/2),ly=100+55*Math.sin((a1+a2)/2);
              return (
                <g key={i}>
                  <path d={`M100,100 L${x1},${y1} A90,90 0 0,1 ${x2},${y2} Z`} fill={MEMBER_COLORS[i%MEMBER_COLORS.length]} opacity={.85}/>
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={names.length>4?9:11} fontWeight="700" fill="#fff" fontFamily="'Noto Sans TC',sans-serif">{n.slice(0,3)}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,.3)",zIndex:2 }}/>
          <div style={{ position:"absolute",top:-8,left:"50%",transform:"translateX(-50%)",fontSize:20 }}>▼</div>
        </div>
        {winner&&<div style={{ fontSize:20,fontWeight:800,color:"#2563EB",marginBottom:12 }}>🎉 {winner} 多付 NT$1！</div>}
        {/* winner here is the display name passed in, which is correct */}
        {!winner&&<div style={{ fontSize:13,color:"#64748B",marginBottom:12 }}>點轉盤開始</div>}
        <button onClick={winner?()=>onDone(winner):spin} disabled={spinning}
          style={{ ...actionBtn,background:winner?"#16A34A":"#2563EB",color:"#fff",width:"100%",opacity:spinning?.6:1 }}>
          {spinning?"轉動中…":winner?"確認":"開始轉！"}
        </button>
      </div>
    </Modal>
  );
}

// -- BookApp --------------------------------------------------------------------
function BookApp({ bookId, currentUser, userProfile, onBack, onOpenSettings }) {
  const [book,     setBook]     = useState(null);
  const [members,  setMembers]  = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fbReady,  setFbReady]  = useState(false);
  const [saving,   setSaving]   = useState(false);

  const [tab,         setTab]         = useState("expenses");
  const [selDate,     setSelDate]     = useState(todayStr());
  const [inlineEdit,  setInlineEdit]  = useState(null);
  const [newFormKey,  setNewFormKey]  = useState(0);
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [archiveConf, setArchiveConf] = useState(false);
  const [unarchiveConf,setUnarchiveConf]=useState(false);
  const [page,        setPage]        = useState(1);
  const [toast,       setToast]       = useState(null);
  const [showMenu,    setShowMenu]    = useState(false);
  const [showInvite,  setShowInvite]  = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const swipeTouchX = useRef(null);
  const [spinnerData, setSpinnerData] = useState(null);
  const [flagging,    setFlagging]    = useState(null); // expense id being flagged
  const [flagNote,    setFlagNote]    = useState("");
  const PER_PAGE = 7;

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),2400); };
  useEffect(()=>{ setPage(1); },[selDate]);

  useEffect(()=>{
    const u1=onSnapshot(doc(db,"books",bookId),snap=>{ if(snap.exists()) setBook({id:snap.id,...snap.data()}); setFbReady(true); });
    const u2=onSnapshot(query(collection(db,"books",bookId,"members"),orderBy("createdAt","asc")),snap=>setMembers(snap.docs.map(d=>({id:d.id,...d.data()}))));
    const u3=onSnapshot(query(collection(db,"books",bookId,"expenses"),orderBy("createdAt","asc")),snap=>setExpenses(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return ()=>{ u1();u2();u3(); };
  },[bookId]);

  // -- Balances (fixed logic) --
  const balances = Object.fromEntries(members.map(m=>[m.name,0]));
  expenses.forEach(exp=>{
    const sw  = exp.splitWith||[];
    const po  = exp.plusOnes||{};
    const sc  = sw.reduce((s,n)=>s+1+(po[n]?1:0),0);
    if(!sc||!exp.paidBy) return;
    const twd = toTWD(exp.amount, exp.currency);
    const perShare = twd/sc;
    // paidBy gets credit for full amount
    balances[exp.paidBy] = (balances[exp.paidBy]||0) + twd;
    // each member in splitWith owes their share
    sw.forEach(n=>{
      const shares = 1+(po[n]?1:0);
      balances[n] = (balances[n]||0) - perShare*shares;
    });
  });

  // -- Settlements --
  const settlements=[];
  const dArr=Object.entries(balances).filter(([,v])=>v<-0.5).map(([n,v])=>({name:n,val:v})).sort((a,b)=>a.val-b.val);
  const cArr=Object.entries(balances).filter(([,v])=>v>0.5).map(([n,v])=>({name:n,val:v})).sort((a,b)=>b.val-a.val);
  let di=0,ci=0;
  while(di<dArr.length&&ci<cArr.length){
    const amt=Math.min(-dArr[di].val,cArr[ci].val);
    if(amt>0.5) settlements.push({from:dArr[di].name,to:cArr[ci].name,amount:Math.round(amt)});
    dArr[di].val+=amt; cArr[ci].val-=amt;
    if(Math.abs(dArr[di].val)<0.5) di++;
    if(Math.abs(cArr[ci].val)<0.5) ci++;
  }

  const dayExp   = expenses.filter(e=>e.date===selDate).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
  const totPages = Math.max(1,Math.ceil(dayExp.length/PER_PAGE));
  const pagedExp = dayExp.slice((page-1)*PER_PAGE,page*PER_PAGE);
  const datesWithData = [...new Set(expenses.map(e=>e.date))];
  const datesFlagged  = [...new Set(expenses.filter(e=>Object.keys(e.flags||{}).length>0).map(e=>e.date))];
  const totalTWD = expenses.reduce((s,e)=>s+toTWD(e.amount,e.currency),0);
  const getCat   = id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[CATEGORIES.length-1];
  const bookColor= book?.color||"#2563EB";
  useThemeColor(bookColor);
  const isOwner  = book?.ownerId===currentUser;
  const isArchived = book?.archived||false;
  const inviteLink = `${window.location.origin}?join=${bookId}`;
  const myMember = members.find(m=>m.name===currentUser);

  // Flag count (expenses flagged by others that affect current user)
  const myFlags = expenses.filter(e=>Object.keys(e.flags||{}).length>0).length;

  // Category totals for chart
  const catTotals = CATEGORIES.map(cat=>({
    ...cat,
    value: expenses.filter(e=>e.category===cat.id).reduce((s,e)=>s+toTWD(e.amount,e.currency),0)
  })).filter(c=>c.value>0);

  // Per-member totals
  const unluckyCount = members.reduce((acc,m)=>{
    acc[m.name] = expenses.filter(e=>e.extraPayer===m.name).length;
    return acc;
  },{});

  const memberTotals = members.map(m=>({
    name:m.name, emoji:m.emoji, nickname:m.nickname,
    paid:expenses.filter(e=>e.paidBy===m.name).reduce((s,e)=>s+toTWD(e.amount,e.currency),0),
    share:expenses.reduce((s,e)=>{
      const sw=e.splitWith||[],po=e.plusOnes||{};
      const sc=sw.reduce((ss,n)=>ss+1+(po[n]?1:0),0);
      if(!sc||!sw.includes(m.name)) return s;
      return s+toTWD(e.amount,e.currency)/sc*(1+(po[m.name]?1:0));
    },0)
  }));

  // -- CRUD --
  const saveExpense = async data => {
    if(isArchived){ showToast("⚠️ 此記帳本已封存，無法新增"); return; }
    if(!members.find(m=>m.name===currentUser)){ showToast("⚠️ 你不是此記帳本的成員"); return; }
    setSaving(true);
    try {
      const { id, ...rest } = data;
      const payload = { ...rest, plusOnes:rest.plusOnes||{}, splitWith:rest.splitWith||[], createdBy:currentUser, flags:{} };
      // Check if needs rounding spinner
      const sw=rest.splitWith||[], po=rest.plusOnes||{};
      const sc=sw.reduce((s,n)=>s+1+(po[n]?1:0),0);
      const twd=toTWD(rest.amount,rest.currency);
      const needsSpin = sc>1 && twd%sc!==0;

      const doSave = async (extra) => {
        const finalPayload = extra ? { ...payload, extraPayer:extra } : payload;
        if(inlineEdit?.id){
          await updateDoc(doc(db,"books",bookId,"expenses",inlineEdit.id),finalPayload);
          showToast("✅ 已更新"); setInlineEdit(null);
        } else {
          await addDoc(collection(db,"books",bookId,"expenses"),{...finalPayload,createdAt:serverTimestamp()});
          setNewFormKey(k=>k+1); setSelDate(data.date); showToast("✅ 已新增");
        }
      };

      if(needsSpin && !inlineEdit) {
        // Use nicknames for spinner display
        const displayNames = sw.map(n=>{ const m=members.find(x=>x.name===n); return m?.nickname||n; });
        const nameMap = Object.fromEntries(sw.map((n,i)=>[displayNames[i],n]));
        setSpinnerData({ names:displayNames, onDone: async (winnerDisplay)=>{ setSpinnerData(null); const winnerReal=nameMap[winnerDisplay]||winnerDisplay; await doSave(winnerReal); setSaving(false); } });
      } else {
        await doSave(null); setSaving(false);
      }
    } catch(e){ showToast("❌ 儲存失敗: "+e.message); setSaving(false); }
  };

  const deleteExpense = async id => {
    try { await deleteDoc(doc(db,"books",bookId,"expenses",id)); setConfirmDel(null); showToast("🗑️ 已刪除"); }
    catch(e){ showToast("❌ 刪除失敗"); }
  };

  const flagExpense = async (expId, note) => {
    const exp = expenses.find(e=>e.id===expId);
    if(!exp) return;
    const flags = { ...(exp.flags||{}), [currentUser]: note||"有疑問" };
    await updateDoc(doc(db,"books",bookId,"expenses",expId),{ flags, flagResolution:null });
    setFlagging(null); setFlagNote(""); showToast("❗ 已標記疑問");
  };

  const unflagExpense = async (expId) => {
    const exp = expenses.find(e=>e.id===expId);
    if(!exp) return;
    const flags = { ...(exp.flags||{}) };
    delete flags[currentUser];
    await updateDoc(doc(db,"books",bookId,"expenses",expId),{ flags });
    showToast("✅ 已解除標記");
  };

  if(!fbReady) return <Spinner fullscreen/>;

  return (
    <div onTouchStart={e=>{ swipeTouchX.current=e.touches[0].clientX; }} onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-(swipeTouchX.current||0); if(dx>window.innerWidth*0.72){ onBack(); } swipeTouchX.current=null; }} style={{ fontFamily:"'Noto Sans TC','PingFang TC',sans-serif",background:"#F0F7FF",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:"calc(80px + env(safe-area-inset-bottom, 0px))" }}>

      {/* Header */}
      <div style={{ width:"100%",maxWidth:540,background:`linear-gradient(135deg,${bookColor}ee,${bookColor})`,padding:"calc(env(safe-area-inset-top, 0px) + 10px) 16px 12px",borderRadius:"0 0 18px 18px",boxShadow:`0 8px 28px ${bookColor}44` }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,padding:"6px 9px",cursor:"pointer",color:"#fff",fontSize:16,lineHeight:1 }}>‹</button>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ color:"#fff",fontWeight:800,fontSize:18,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
              {book?.emoji||"💳"} {book?.name}
              {isArchived&&<span style={{ fontSize:11,background:"rgba(255,255,255,.2)",borderRadius:8,padding:"2px 7px",marginLeft:7 }}>已封存</span>}
            </div>
            <div style={{ color:"rgba(255,255,255,.7)",fontSize:11,marginTop:1 }}>{members.length} 人 · {expenses.length} 筆 · NT${Math.round(totalTWD).toLocaleString()}</div>
          </div>
          {/* Flag counter */}
          {myFlags>0&&(
            <div style={{ background:"#EF4444",borderRadius:20,padding:"4px 9px",display:"flex",alignItems:"center",gap:4,cursor:"pointer" }} onClick={()=>{
  setTab("expenses");
  // Find most recent flagged expense
  const flagged = expenses.filter(e=>Object.keys(e.flags||{}).length>0);
  if(flagged.length>0){
    const sorted = flagged.sort((a,b)=>b.date.localeCompare(a.date));
    const targetDate = sorted[0].date;
    setSelDate(targetDate);
    setPage(1);
    setTimeout(()=>{ const el=document.querySelector("[data-flagged='true']"); if(el) el.scrollIntoView({behavior:"smooth",block:"center"}); },400);
  }
}}>
              <span style={{ color:"#fff",fontSize:12,fontWeight:800 }}>! {myFlags}</span>
            </div>
          )}
          <div onClick={onOpenSettings} style={{ display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,.2)",borderRadius:20,padding:"4px 10px 4px 4px",cursor:"pointer" }}>
            <Avatar name={currentUser} emoji={userProfile?.emoji} members={members} size={22}/>
            <span style={{ color:"#fff",fontSize:12,fontWeight:700 }}>{myMember?.nickname||currentUser}</span>
          </div>
          <button onClick={()=>setShowMenu(v=>!v)} style={{ background:"rgba(255,255,255,.18)",border:"none",borderRadius:10,padding:"7px 9px",cursor:"pointer",color:"#fff",fontSize:17,lineHeight:1 }}>☰</button>
        </div>
        <div style={{ display:"flex",gap:5,marginTop:12,flexWrap:"wrap" }}>
          {members.map(m=>(
            <div key={m.name} style={{ display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,.15)",borderRadius:20,padding:"3px 8px 3px 3px" }}>
              <Avatar name={m.name} emoji={m.emoji} members={members} size={18}/>
              <span style={{ color:"#fff",fontSize:11,fontWeight:600 }}>{m.nickname||m.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Menu */}
      {showMenu&&(
        <div style={{ position:"fixed",inset:0,zIndex:900 }} onClick={()=>setShowMenu(false)}>
          <div onClick={e=>e.stopPropagation()} style={{ position:"absolute",top:76,right:12,background:"#fff",borderRadius:16,boxShadow:"0 8px 40px rgba(37,99,235,.18)",padding:14,minWidth:210 }}>
            <button onClick={()=>{ setShowInvite(true); setShowMenu(false); }} style={{ ...actionBtn,background:"#EFF6FF",color:bookColor,width:"100%",fontSize:12,marginBottom:6 }}>🔗 邀請朋友加入</button>
            {isOwner&&!isArchived&&<button onClick={()=>{ setArchiveConf(true); setShowMenu(false); }} style={{ ...actionBtn,background:"#FFF7ED",color:"#D97706",width:"100%",fontSize:12,marginBottom:6 }}>📦 封存記帳本</button>}
            {isOwner&&isArchived&&<button onClick={()=>{ setUnarchiveConf(true); setShowMenu(false); }} style={{ ...actionBtn,background:"#F0FDF4",color:"#16A34A",width:"100%",fontSize:12,marginBottom:6 }}>🔓 解除封存</button>}
            <button onClick={()=>{ setShowInstallGuide(true); setShowMenu(false); }} style={{ ...actionBtn,background:"#EFF6FF",color:"#2563EB",width:"100%",fontSize:12,marginBottom:6 }}>📲 建立捷徑教學</button>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite&&(
        <Modal onClose={()=>setShowInvite(false)}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:36,marginBottom:10 }}>🔗</div>
            <div style={{ fontWeight:800,fontSize:17,color:"#1E3A5F",marginBottom:6 }}>邀請朋友加入</div>
            <div style={{ background:"#EFF6FF",borderRadius:12,padding:14,marginBottom:12 }}>
              <div style={{ fontSize:11,color:"#64748B",marginBottom:4 }}>邀請連結</div>
              <div style={{ fontSize:11,color:bookColor,wordBreak:"break-all",marginBottom:8 }}>{inviteLink}</div>
              <button onClick={async()=>{
              const baseUrl = window.location.origin;
              const shareText = `🎉 ${currentUser} 邀請你加入「${book?.name}」記帳本！\n點開連結，點選加入記帳本，輸入邀請碼就可以一起記帳分帳 👇\n\n🔗 ${baseUrl}\n🔑 邀請碼：${book?.inviteCode}`;
              if(navigator.share){
                try{ await navigator.share({ title:"加入記帳本 NOMO-1", text:shareText }); }
                catch(e){ await navigator.clipboard?.writeText(shareText); showToast("📋 已複製邀請訊息"); }
              } else {
                await navigator.clipboard?.writeText(shareText);
                showToast("📋 已複製邀請訊息");
              }
              setShowInvite(false);
            }} style={{ ...actionBtn,background:bookColor,color:"#fff",width:"100%",fontSize:12 }}>分享邀請訊息 ↗</button>
            </div>
            <div style={{ background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:12 }}>
              <div style={{ fontSize:11,color:"#64748B",marginBottom:4 }}>邀請碼（朋友加入時需輸入）</div>
              <div style={{ fontSize:32,fontWeight:800,color:"#16A34A",letterSpacing:6 }}>{book?.inviteCode}</div>
              {isOwner&&<button onClick={async()=>{ await updateDoc(doc(db,"books",bookId),{inviteCode:randCode()}); showToast("🔄 已更新邀請碼"); }} style={{ ...actionBtn,background:"#DCFCE7",color:"#16A34A",fontSize:11,marginTop:8 }}>🔄 重新產生邀請碼</button>}
            </div>
            <button onClick={()=>setShowInvite(false)} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",width:"100%" }}>關閉</button>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div style={{ width:"100%",maxWidth:540,display:"flex",background:"#fff",borderRadius:14,margin:"14px 12px 0",overflow:"hidden",boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
        {[["expenses","📋 支出"],["split","📊 結算"],["members","👥 成員"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{ flex:1,padding:"11px 0",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,background:tab===key?bookColor:"transparent",color:tab===key?"#fff":"#64748B",transition:"all .2s",fontFamily:"inherit" }}>{label}</button>
        ))}
      </div>

      <div style={{ width:"100%",maxWidth:540,padding:"12px 12px 0" }}>

        {/* -- EXPENSES -- */}
        {tab==="expenses"&&(
          <div>
            {/* New expense form - hidden if archived */}
            {!isArchived&&(
              <div style={{ marginBottom:12 }}>
                <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F",marginBottom:7 }}>＋ 新增支出</div>
                <ExpenseForm key={newFormKey} members={members} loading={saving} bookColor={bookColor}
                  initialData={{ date:selDate,paidBy:currentUser,splitWith:members.map(m=>m.name),plusOnes:{},currency:"TWD",desc:"",amount:"",category:CATEGORIES[0].id }}
                  onSave={saveExpense} saveLabel="確認新增"/>
              </div>
            )}
            {isArchived&&(
              <div style={{ background:"#FFF7ED",borderRadius:14,padding:"12px 16px",marginBottom:12,display:"flex",alignItems:"center",gap:10 }}>
                <span style={{ fontSize:20 }}>📦</span>
                <span style={{ fontSize:13,color:"#D97706",fontWeight:700 }}>此記帳本已封存，無法新增支出</span>
              </div>
            )}

            <WeekPicker selected={selDate} onChange={d=>{ setSelDate(d); setPage(1); }} datesWithData={datesWithData} datesFlagged={datesFlagged}/>

            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7 }}>
              <div style={{ fontWeight:800,fontSize:13,color:"#1E3A5F" }}>
                {selDate===todayStr()?"今日":`${selDate}`}
                <span style={{ fontSize:11,color:"#64748B",fontWeight:600,marginLeft:5 }}>({dayExp.length} 筆)</span>
              </div>
              {totPages>1&&(
                <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ ...pgBtn,opacity:page===1?.35:1 }}>‹</button>
                  <span style={{ fontSize:11,color:"#64748B" }}>{page}/{totPages}</span>
                  <button disabled={page===totPages} onClick={()=>setPage(p=>p+1)} style={{ ...pgBtn,opacity:page===totPages?.35:1 }}>›</button>
                </div>
              )}
            </div>

            <div onTouchStart={e=>{ window._expTouchX=e.touches[0].clientX; }} onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-(window._expTouchX||0); if(Math.abs(dx)>50){ const d=new Date(selDate+"T12:00"); d.setDate(d.getDate()+(dx<0?1:-1)); setSelDate(d.toISOString().slice(0,10)); setPage(1); } window._expTouchX=null; }} style={{ touchAction:"pan-y" }}>
            {dayExp.length===0&&<div style={{ textAlign:"center",color:"#94A3B8",padding:"28px 0",fontSize:13 }}>{selDate===todayStr()?"今日沒有支出":"這天沒有記錄"}</div>}

            {pagedExp.map(exp=>{
              const cat=getCat(exp.category);
              const sw=exp.splitWith||[],po=exp.plusOnes||{};
              const sc=sw.reduce((s,n)=>s+1+(po[n]?1:0),0);
              const perTWD=sc>0?toTWD(exp.amount,exp.currency)/sc:0;
              const isEditing=inlineEdit?.id===exp.id;
              const isMine=exp.createdBy===currentUser||!exp.createdBy;
              const myFlag=exp.flags?.[currentUser];
              const flagCount=Object.keys(exp.flags||{}).length;
              const hasFlag=flagCount>0;
              return (
                <div key={exp.id} style={{ marginBottom:8 }}>
                  <div data-flagged={hasFlag?"true":undefined} style={{ background:"#fff",borderRadius:isEditing?"14px 14px 0 0":"14px",padding:"11px 12px",display:"flex",alignItems:"center",gap:9,cursor:"pointer",boxShadow:isEditing?`0 2px 10px ${bookColor}33`:hasFlag?"0 2px 8px rgba(239,68,68,.2)":"0 2px 8px rgba(37,99,235,.07)",outline:isEditing?`2px solid ${bookColor}`:hasFlag?"1.5px solid #FECACA":"none",outlineOffset:-1 }}
                    onClick={()=>setInlineEdit(isEditing?null:exp)}>
                    <div style={{ width:36,height:36,borderRadius:9,background:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{cat.emoji}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:14,color:"#1E3A5F" }}>{exp.desc}
                        {hasFlag&&<span style={{ marginLeft:6,fontSize:11,color:"#EF4444",fontWeight:800 }}>❗{flagCount}</span>}
                        {exp.flagResolution==="updated"&&<span style={{ marginLeft:4,fontSize:10,background:"#DCFCE7",color:"#16A34A",borderRadius:5,padding:"1px 5px",fontWeight:700 }}>已更新</span>}
                        {exp.flagResolution==="rejected"&&<span style={{ marginLeft:4,fontSize:10,background:"#FEF2F2",color:"#EF4444",borderRadius:5,padding:"1px 5px",fontWeight:700 }}>不更新</span>}
                        {hasFlag&&<div style={{ fontSize:10,color:"#EF4444",marginTop:2 }}>{Object.entries(exp.flags||{}).map(([who,note])=>{ const m=members.find(x=>x.name===who); return m?`${m.nickname||m.name}: ${note}`:null; }).filter(Boolean).join(" · ")}</div>}
                        {exp.extraPayer&&<span style={{ marginLeft:6,fontSize:10,color:"#94A3B8" }}>+1→{exp.extraPayer}</span>}
                      </div>
                      <div style={{ fontSize:11,color:"#94A3B8",marginTop:2 }}>{exp.paidBy} 付 · {sw.join("、")}</div>
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ fontWeight:800,fontSize:15,color:false?"#16A34A":bookColor }}>{fmtAmt(exp.amount,exp.currency)}</div>
                      <div style={{ fontSize:10,color:"#94A3B8" }}>每人 NT${Math.floor(perTWD).toLocaleString()}</div>
                    </div>
                    {/* Action button: X for own, ! for others */}
                    {isMine
                      ? <button onClick={e=>{ e.stopPropagation(); setConfirmDel(exp.id); }} style={{ background:"none",border:"none",cursor:"pointer",color:"#CBD5E1",fontSize:17,padding:"2px",flexShrink:0 }}>×</button>
                      : <button onClick={e=>{ e.stopPropagation(); if(myFlag) unflagExpense(exp.id); else setFlagging(exp.id); }}
                          style={{ background:myFlag?"#FEF2F2":"none",border:myFlag?"1px solid #FECACA":"none",borderRadius:6,cursor:"pointer",color:myFlag?"#EF4444":"#94A3B8",fontSize:15,padding:"2px 4px",flexShrink:0,fontWeight:800 }}>
                          {myFlag?"❗":"!"}
                        </button>
                    }
                  </div>
                  {isEditing&&isMine&&!isArchived&&(
                    <div style={{ borderRadius:"0 0 14px 14px",overflow:"hidden",outline:`2px solid ${bookColor}`,outlineOffset:-1 }}>
                      <ExpenseForm key={"e"+exp.id} members={members} initialData={inlineEdit} loading={saving} bookColor={bookColor}
                        onSave={saveExpense} onCancel={()=>{ if(hasFlag){ updateDoc(doc(db,"books",bookId,"expenses",exp.id),{flagResolution:"rejected"}); } setInlineEdit(null); }} saveLabel="已更新"/>
                      {hasFlag&&(
                        <div style={{ display:"flex",gap:8,padding:"8px 12px",background:"#FEF2F2",borderTop:"1px solid #FECACA" }}>
                          <div style={{ fontSize:12,color:"#EF4444",fontWeight:700,flex:1,alignSelf:"center" }}>❗ 此筆有爭議，更新後需確認</div>
                          <button onClick={async()=>{ await updateDoc(doc(db,"books",bookId,"expenses",exp.id),{flagResolution:"rejected"}); showToast("標記為不更新"); setInlineEdit(null); }}
                            style={{ border:"1.5px solid #EF4444",borderRadius:8,padding:"5px 10px",cursor:"pointer",background:"#fff",color:"#EF4444",fontSize:11,fontWeight:700,fontFamily:"inherit" }}>不更新</button>
                          <button onClick={async()=>{ await updateDoc(doc(db,"books",bookId,"expenses",exp.id),{flagResolution:"updated",flags:{}}); showToast("✅ 已標記為已更新"); setInlineEdit(null); }}
                            style={{ border:"none",borderRadius:8,padding:"5px 10px",cursor:"pointer",background:"#16A34A",color:"#fff",fontSize:11,fontWeight:700,fontFamily:"inherit" }}>已更新</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            </div>
            {totPages>1&&(
              <div style={{ display:"flex",justifyContent:"center",gap:6,marginTop:8 }}>
                {Array.from({length:totPages},(_,i)=>(
                  <button key={i} onClick={()=>setPage(i+1)} style={{ width:26,height:26,borderRadius:"50%",border:"none",cursor:"pointer",background:page===i+1?bookColor:"#EFF6FF",color:page===i+1?"#fff":bookColor,fontWeight:700,fontSize:11,fontFamily:"inherit" }}>{i+1}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -- SPLIT/結算 -- */}
        {tab==="split"&&(
          <div>
            {/* Donut chart */}
            {catTotals.length>0&&(
              <div style={{ background:"#fff",borderRadius:18,padding:16,marginBottom:12,boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
                <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F",marginBottom:12 }}>📊 類別花費分布</div>
                <div style={{ display:"flex",alignItems:"center",gap:16 }}>
                  <DonutChart data={catTotals} total={totalTWD}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    {catTotals.map(c=>(
                      <div key={c.id} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5 }}>
                        <div style={{ width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0 }}/>
                        <span style={{ fontSize:11,color:"#64748B",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{c.emoji} {c.label}</span>
                        <span style={{ fontSize:11,fontWeight:700,color:"#1E3A5F",flexShrink:0 }}>NT${Math.round(c.value).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Per-member spending */}
            <div style={{ background:"#fff",borderRadius:18,padding:16,marginBottom:12,boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F",marginBottom:12 }}>👤 每人花費</div>
              {memberTotals.map(m=>(
                <div key={m.name} style={{ display:"flex",alignItems:"center",gap:9,marginBottom:9 }}>
                  <Avatar name={m.name} emoji={m.emoji} members={members} size={32}/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,color:"#1E3A5F",fontSize:13 }}>{m.nickname||m.name}{m.name===currentUser&&<span style={{ fontSize:10,color:bookColor,marginLeft:5 }}>（我）</span>}</div>
                    <div style={{ fontSize:10,color:"#94A3B8" }}>應付 NT${Math.round(m.share).toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:800,fontSize:13,color:bookColor }}>已付 NT${Math.round(m.paid).toLocaleString()}</div>
                    <div style={{ fontSize:10,color:(balances[m.name]||0)>0?"#10B981":(balances[m.name]||0)<0?"#EF4444":"#94A3B8",fontWeight:700 }}>
                      {Math.round(balances[m.name]||0)===0?"±0":`${(balances[m.name]||0)>0?"+":""}NT${Math.round(balances[m.name]||0)}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Settlements */}
            <div style={{ background:"#fff",borderRadius:18,padding:16,boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
              <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F",marginBottom:12 }}>⚡ 建議結帳方式</div>
              {settlements.length===0
                ? <div style={{ textAlign:"center",color:"#10B981",fontWeight:700,padding:16 }}>🎉 大家都結清了！</div>
                : settlements.map((s,i)=>{
                  const payer=members.find(m=>m.name===s.from);
                  const app=payer?.paymentApp?PAYMENT_APPS.find(a=>a.id===payer.paymentApp):null;
                  const label=payer?.paymentApp==="custom"?(payer.paymentCustomLabel||"自訂"):app?.label;
                  const emoji=payer?.paymentApp==="custom"?"✏️":app?.emoji;
                  const isMe=s.from===currentUser;
                  return (
                    <div key={i} style={{ background:isMe?"#EFF6FF":"#F8FBFF",borderRadius:11,padding:"11px 13px",marginBottom:7,outline:isMe?`1.5px solid ${bookColor}`:"none" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                        <Avatar name={s.from} emoji={members.find(m=>m.name===s.from)?.emoji} members={members} size={30}/>
                        <span style={{ color:"#94A3B8",fontSize:11 }}>→</span>
                        <Avatar name={s.to} emoji={members.find(m=>m.name===s.to)?.emoji} members={members} size={30}/>
                        <div style={{ flex:1,marginLeft:3 }}>
                          <span style={{ fontWeight:700,color:"#1E3A5F",fontSize:13 }}>{s.from}{isMe&&" 👈 我"}</span>
                          <span style={{ color:"#94A3B8",fontSize:11 }}> 付給 </span>
                          <span style={{ fontWeight:700,color:"#1E3A5F",fontSize:13 }}>{s.to}</span>
                        </div>
                        <div style={{ fontWeight:800,color:"#EF4444",fontSize:15 }}>NT${s.amount}</div>
                      </div>
                      {isMe&&app?.appScheme&&(
                        <button onClick={()=>{
                          const isIOS=/iPhone|iPad|iPod/i.test(navigator.userAgent);
                          const storeUrl=isIOS?app.iosStore:app.androidStore;
                          if(app.id==="linepay"||app.id==="jkopay"||app.id==="allpay"){
                            // These use universal links - just open
                            window.open(isIOS?app.iosStore:app.androidStore,"_blank");
                          } else {
                            // Bank apps: try scheme, open store after delay if not installed
                            try{ window.location.href=app.appScheme; }catch(e){}
                            setTimeout(()=>{ window.open(storeUrl,"_blank"); },2000);
                          }
                        }} style={{ width:"100%",marginTop:8,display:"flex",alignItems:"center",gap:7,background:"#1D4ED8",borderRadius:8,padding:"8px 12px",cursor:"pointer",border:"none",fontFamily:"inherit" }}>
                          <span style={{ fontSize:14 }}>{emoji}</span>
                          <span style={{ color:"#fff",fontWeight:700,fontSize:12 }}>開啟 {label} 付款</span>
                          <span style={{ marginLeft:"auto",color:"rgba(255,255,255,.5)",fontSize:11 }}>↗</span>
                        </button>
                      )}
                      {isMe&&!app?.appScheme&&<div style={{ marginTop:5,fontSize:10,color:"#CBD5E1",textAlign:"center" }}>前往個人設定，設定慣用付款方式</div>}
                    </div>
                  );
                })
              }
            </div>

            {/* 小衰鬼 counter */}
            {Object.values(unluckyCount).some(v=>v>0)&&(
              <div style={{ background:"#fff",borderRadius:18,padding:16,marginTop:12,boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
                <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F",marginBottom:12 }}>🐛 誰是小衰鬼</div>
                {members.map(m=>{
                  const count=unluckyCount[m.name]||0;
                  return count>0?(
                    <div key={m.name} style={{ display:"flex",alignItems:"center",gap:9,marginBottom:8 }}>
                      <Avatar name={m.name} emoji={m.emoji} members={members} size={30}/>
                      <div style={{ flex:1,fontWeight:700,color:"#1E3A5F",fontSize:13 }}>{m.nickname||m.name}</div>
                      <div style={{ fontWeight:800,color:"#EF4444",fontSize:14 }}>×{count} 次</div>
                    </div>
                  ):null;
                })}
              </div>
            )}
          </div>
        )}

        {/* -- MEMBERS -- */}
        {tab==="members"&&(
          <div>
            {members.map(m=>{
              const paid=expenses.filter(e=>e.paidBy===m.name).reduce((s,e)=>s+toTWD(e.amount,e.currency),0);
              const appInfo=m.paymentApp?PAYMENT_APPS.find(a=>a.id===m.paymentApp):null;
              return (
                <div key={m.id} style={{ background:"#fff",borderRadius:14,marginBottom:9,boxShadow:"0 2px 8px rgba(37,99,235,.07)",padding:"12px 14px",display:"flex",alignItems:"center",gap:9 }}>
                  <Avatar name={m.name} emoji={m.emoji} members={members} size={42}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontWeight:800,fontSize:14,color:"#1E3A5F" }}>
                      {m.nickname||m.name}
                      {m.name===currentUser&&<span style={{ fontSize:10,color:bookColor,marginLeft:5 }}>（我）</span>}
                      {m.name===book?.ownerId&&<span style={{ fontSize:10,background:"#FEF9C3",color:"#A16207",borderRadius:6,padding:"1px 5px",marginLeft:5,fontWeight:700 }}>創辦人</span>}
                      {m.hasPlusOne&&<span style={{ fontSize:10,color:"#94A3B8",marginLeft:5,fontWeight:700 }}>+1</span>}
                    </div>
                    <div style={{ fontSize:10,color:"#94A3B8",marginTop:1 }}>已付 NT${Math.round(paid).toLocaleString()} · {appInfo?`${appInfo.emoji} ${appInfo.label}`:"未設定付款方式"}</div>
                  </div>
                  {/* Owner can remove others (not self) */}
                  {isOwner&&m.name!==currentUser&&(
                    <button onClick={async()=>{ await deleteDoc(doc(db,"books",bookId,"members",m.id)); showToast(`已移除 ${m.nickname||m.name}`); }}
                      style={{ background:"#FEF2F2",border:"none",borderRadius:8,padding:"5px 9px",cursor:"pointer",color:"#EF4444",fontSize:11,fontWeight:700,fontFamily:"inherit" }}>移除</button>
                  )}
                </div>
              );
            })}
            <div style={{ background:"#EFF6FF",borderRadius:14,padding:14,textAlign:"center" }}>
              <div style={{ fontSize:13,color:"#2563EB",fontWeight:700,marginBottom:4 }}>想邀請朋友？</div>
              <div style={{ fontSize:12,color:"#64748B",marginBottom:10 }}>透過邀請連結，朋友登入後就會自動加入</div>
              <button onClick={()=>setShowInvite(true)} style={{ ...actionBtn,background:bookColor,color:"#fff",fontSize:12 }}>🔗 分享邀請連結</button>
            </div>
          </div>
        )}
      </div>

      {/* Flag dialog */}
      {flagging&&(
        <Modal onClose={()=>setFlagging(null)}>
          <div>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:6 }}>❗ 標記疑問</div>
            <div style={{ fontSize:13,color:"#64748B",marginBottom:12 }}>說明你對這筆支出的疑問</div>
            <input placeholder="例：金額不對、我沒有參與…" value={flagNote} onChange={e=>setFlagNote(e.target.value)}
              style={{ ...fld,marginBottom:12 }} autoFocus/>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>setFlagging(null)} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>取消</button>
              <button onClick={()=>flagExpense(flagging,flagNote)} style={{ ...actionBtn,background:"#EF4444",color:"#fff",flex:2 }}>標記</button>
            </div>
          </div>
        </Modal>
      )}

      {spinnerData&&<SpinnerWheel names={spinnerData.names} onDone={spinnerData.onDone}/>}
      {showInstallGuide&&(
        <Modal onClose={()=>setShowInstallGuide(false)}>
          <div>
            <div style={{ fontWeight:800,fontSize:17,color:"#1E3A5F",marginBottom:4 }}>📲 加入手機桌面</div>
            <div style={{ fontSize:12,color:"#94A3B8",marginBottom:16 }}>把這個 App 加到主畫面，用起來像真正的 App！</div>
            <div style={{ background:"#F0F7FF",borderRadius:12,padding:14,marginBottom:10 }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#1D4ED8",marginBottom:8 }}>🍎 iPhone（Safari）</div>
              <div style={{ fontSize:13,color:"#334155",lineHeight:1.8 }}>1. 用 <b>Safari</b> 開啟此網址<br/>2. 點下方中間的 <b>分享按鈕 ⬆️</b><br/>3. 選「<b>加入主畫面</b>」<br/>4. 點右上角「<b>新增</b>」完成！</div>
            </div>
            <div style={{ background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#16A34A",marginBottom:8 }}>🤖 Android（Chrome）</div>
              <div style={{ fontSize:13,color:"#334155",lineHeight:1.8 }}>1. 用 <b>Chrome</b> 開啟此網址<br/>2. 點右上角 <b>⋮ 選單</b><br/>3. 選「<b>加入主畫面</b>」或<br/>　 等待底部安裝提示<br/>4. 點「<b>安裝</b>」完成！</div>
            </div>
            <button onClick={()=>setShowInstallGuide(false)} style={{ ...actionBtn,background:"#2563EB",color:"#fff",width:"100%",letterSpacing:1 }}>GOT IT! 👍</button>
          </div>
        </Modal>
      )}
      {/* 小衰鬼 section - shown in split tab */}

      {confirmDel&&<ConfirmDialog msg="確定刪除這筆支出？" sub="刪除後無法復原" onConfirm={()=>deleteExpense(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
      {archiveConf&&<ConfirmDialog msg={`封存「${book?.name}」？`} sub="封存後無法繼續新增支出" confirmLabel="確認封存" confirmColor="#D97706" onConfirm={async()=>{ await updateDoc(doc(db,"books",bookId),{archived:true}); setArchiveConf(false); showToast("📦 已封存"); }} onCancel={()=>setArchiveConf(false)}/>}
      {unarchiveConf&&<ConfirmDialog msg={`解除封存「${book?.name}」？`} confirmLabel="解除封存" confirmColor="#16A34A" onConfirm={async()=>{ await updateDoc(doc(db,"books",bookId),{archived:false}); setUnarchiveConf(false); showToast("🔓 已解除封存"); }} onCancel={()=>setUnarchiveConf(false)}/>}
      <Toast msg={toast}/>

      {/* Bottom safe area color bar */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,height:"env(safe-area-inset-bottom, 0px)",background:bookColor,zIndex:999 }}/>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;800&display=swap');
        *{box-sizing:border-box;} input:focus,select:focus{outline:none;border-color:#2563EB!important;} ::-webkit-scrollbar{display:none;}
        html{touch-action:manipulation;}
        @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes slideLeft{from{opacity:.4;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideRight{from{opacity:.4;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        html,body{background:${bookColor};}
      `}</style>
    </div>
  );
}

// -- Settings Panel -------------------------------------------------------------
function SettingsPanel({ currentUser, userProfile, members, bookId, onClose, onSwitchUser, bookColor="#2563EB" }) {
  const [nickname, setNickname] = useState(userProfile?.nickname||"");
  const [selEmoji, setSelEmoji] = useState(userProfile?.emoji||"");
  const [payApp,   setPayApp]   = useState(userProfile?.paymentApp||null);
  const [custLabel,setCustLabel]= useState(userProfile?.paymentCustomLabel||"");
  const [custUrl,  setCustUrl]  = useState(userProfile?.paymentCustomUrl||"");
  const [hasPO,    setHasPO]    = useState(userProfile?.hasPlusOne||false);
  const [saving,   setSaving]   = useState(false);

  const myMember = members.find(m=>m.name===currentUser);

  const save = async () => {
    setSaving(true);
    try {
      if(myMember?.id){
        await updateDoc(doc(db,"books",bookId,"members",myMember.id),{
          nickname:nickname.trim()||currentUser, emoji:selEmoji,
          paymentApp:payApp, paymentCustomLabel:custLabel, paymentCustomUrl:custUrl,
          hasPlusOne:hasPO
        });
      }
      // Save to localStorage for cross-book persistence
      localStorage.setItem("splitpay_profile", JSON.stringify({ emoji:selEmoji, nickname:nickname.trim(), paymentApp:payApp, paymentCustomLabel:custLabel, paymentCustomUrl:custUrl }));
      onClose();
    } catch(e){ alert("儲存失敗"); }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose}>
      <div>
        <div style={{ fontWeight:800,fontSize:17,color:"#1E3A5F",marginBottom:4 }}>⚙️ 個人設定</div>
        <div style={{ fontSize:12,color:"#94A3B8",marginBottom:16 }}>設定你在這個記帳本裡的顯示</div>

        <div style={{ marginBottom:12 }}>
          <div style={lbl}>選擇你的 Emoji 頭像</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:4 }}>
            {USER_EMOJIS.map(e=>(
              <button key={e} onClick={()=>setSelEmoji(e)} style={{ fontSize:22,background:selEmoji===e?bookColor+"22":"transparent",border:selEmoji===e?`2px solid ${bookColor}`:"2px solid transparent",borderRadius:10,padding:"4px 6px",cursor:"pointer" }}>{e}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={lbl}>在此記帳本的暱稱</div>
          <input placeholder={currentUser} value={nickname} onChange={e=>setNickname(e.target.value)} style={fld}/>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={lbl}>是否可能有攜伴？</div>
          <div style={{ display:"flex",gap:8 }}>
            <Chip label="是" active={hasPO} color={bookColor} onClick={()=>setHasPO(true)}/>
            <Chip label="否" active={!hasPO} color={bookColor} onClick={()=>setHasPO(false)}/>
          </div>
        </div>

        <div style={{ marginBottom:16 }}>
          <div style={lbl}>慣用付款 App / 銀行</div>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:8 }}>
            {PAYMENT_APPS.map(a=>(
              <button key={a.id} onClick={()=>setPayApp(a.id)} style={{ border:"1.5px solid #BFDBFE",borderRadius:20,padding:"4px 9px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",background:payApp===a.id?bookColor:"#fff",color:payApp===a.id?"#fff":"#334155" }}>{a.emoji} {a.label}</button>
            ))}
          </div>
          {payApp==="custom"&&(
            <>
              <input placeholder="自訂名稱" value={custLabel} onChange={e=>setCustLabel(e.target.value)} style={{ ...fld,marginBottom:6 }}/>
              <input placeholder="App 連結 https://…" value={custUrl} onChange={e=>setCustUrl(e.target.value)} style={fld}/>
            </>
          )}
        </div>

        <div style={{ display:"flex",gap:8 }}>

          <button onClick={save} disabled={saving} style={{ ...actionBtn,background:bookColor,color:"#fff",width:"100%" }}>{saving?"儲存中…":"儲存"}</button>
        </div>
      </div>
    </Modal>
  );
}

// -- JoinScreen -----------------------------------------------------------------
function JoinScreen({ bookId, currentUser, onDone }) {
  const [book,    setBook]    = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step,    setStep]    = useState("code");
  const [code,    setCode]    = useState("");
  const [name,    setName]    = useState("");
  const [pw,      setPw]      = useState("");
  const [codeErr, setCodeErr] = useState("");
  const [pwErr,   setPwErr]   = useState("");
  const [joinEmoji, setJoinEmoji] = useState("");

  useEffect(()=>{
    getDoc(doc(db,"books",bookId)).then(snap=>{ if(snap.exists()) setBook({id:snap.id,...snap.data()}); setLoading(false); });
    const u=onSnapshot(query(collection(db,"books",bookId,"members"),orderBy("createdAt","asc")),snap=>setMembers(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return u;
  },[bookId]);

  const verifyCode = () => {
    if((code.trim().toUpperCase())===(book?.inviteCode||"").toUpperCase()){ setCodeErr(""); setStep("name"); }
    else setCodeErr("邀請碼不正確");
  };

  const join = async (chosenName) => {
    const finalName = chosenName||name.trim();
    if(!finalName) return;
    // Check if existing member with password
    const existing = members.find(m=>m.name===finalName);
    if(existing?.passwordHash){
      const h = await hashPw(pw);
      if(h!==existing.passwordHash){ setPwErr("密碼不正確"); return; }
    }
    if(!existing){
      await addDoc(collection(db,"books",bookId,"members"),{ name:finalName,emoji:joinEmoji||"",hasPlusOne:false,paymentApp:null,paymentCustomLabel:"",paymentCustomUrl:"",createdAt:serverTimestamp() });
    }
    localStorage.setItem("splitpay_user",finalName);
    localStorage.setItem("splitpay_book",bookId);
    window.history.replaceState({},"",window.location.pathname);
    onDone(finalName,bookId);
  };

  const bg=book?.color||"#2563EB";
  useThemeColor(bg);
  if(loading) return <Spinner fullscreen/>;
  if(!book) return <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"sans-serif" }}><div style={{ textAlign:"center" }}><div style={{ fontSize:48 }}>😕</div><div>找不到記帳本</div></div></div>;

  return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${bg} 0%,${bg}bb 60%,${bg}88 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Noto Sans TC',sans-serif",overflowY:"auto" }}>
      <div style={{ fontSize:48,marginBottom:8 }}>{book.emoji||"💳"}</div>
      <div style={{ color:"#fff",fontWeight:800,fontSize:22,marginBottom:4 }}>{book.name}</div>
      <div style={{ color:"rgba(255,255,255,.7)",fontSize:13,marginBottom:20 }}>{members.length} 位成員 · 你被邀請加入</div>
      <button onClick={()=>setShowInstall(true)} style={{ background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"6px 14px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:16,fontFamily:"inherit" }}>📲 如何加入手機桌面？</button>
      <div style={{ background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        {step==="code"&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:6 }}>輸入邀請碼</div>
            <div style={{ fontSize:13,color:"#94A3B8",marginBottom:14 }}>請向邀請你的朋友索取 6 位數邀請碼</div>
            <input placeholder="例：A1B2C3" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&verifyCode()}
              style={{ ...fld,marginBottom:8,textAlign:"center",fontSize:22,letterSpacing:5,fontWeight:800 }} autoFocus/>
            {codeErr&&<div style={{ color:"#DC2626",fontSize:12,marginBottom:8,textAlign:"center" }}>❌ {codeErr}</div>}
            <button onClick={verifyCode} style={{ ...actionBtn,background:bg,color:"#fff",width:"100%" }}>確認邀請碼</button>
          </>
        )}
        {step==="name"&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:4 }}>記帳成員</div>
            <div style={{ fontSize:12,color:"#94A3B8",marginBottom:12 }}>目前的成員</div>
            {members.map(m=>(
              <div key={m.name} style={{ display:"flex",alignItems:"center",gap:10,background:"#F8FAFC",borderRadius:10,padding:"8px 12px",marginBottom:6,outline:"1px solid #E2E8F0" }}>
                <Avatar name={m.name} emoji={m.emoji} members={members} size={30}/>
                <span style={{ fontWeight:700,fontSize:13,color:"#64748B" }}>{m.nickname||m.name}</span>
                {m.passwordHash&&<span style={{ marginLeft:"auto",fontSize:11,color:"#CBD5E1" }}>🔒 已有帳號</span>}
              </div>
            ))}
            <div style={{ borderTop:"1px solid #EFF6FF",paddingTop:14,marginTop:8 }}>
              <div style={{ fontSize:13,fontWeight:700,color:"#1E3A5F",marginBottom:8 }}>請輸入你的暱稱</div>
              <input placeholder="你的暱稱" value={name} onChange={e=>setName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&name.trim()&&join()}
                style={{ ...fld,marginBottom:8 }} autoFocus/>
              <div style={lbl}>選擇你的頭像</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:10 }}>
                {USER_EMOJIS.map(e=><button key={e} onClick={()=>setJoinEmoji(e)} style={{ fontSize:20,background:joinEmoji===e?bg+"33":"transparent",border:joinEmoji===e?`2px solid ${bg}`:"2px solid transparent",borderRadius:9,padding:"3px 5px",cursor:"pointer" }}>{e}</button>)}
              </div>
              <button onClick={()=>join()} style={{ ...actionBtn,background:bg,color:"#fff",width:"100%" }}>加入記帳本</button>
            </div>
          </>
        )}
        {step.startsWith("pw_")&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:14 }}>輸入密碼</div>
            <input type="password" placeholder="密碼" value={pw} onChange={e=>setPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&join(step.slice(3))}
              style={{ ...fld,marginBottom:8 }} autoFocus/>
            {pwErr&&<div style={{ color:"#DC2626",fontSize:12,marginBottom:8 }}>❌ {pwErr}</div>}
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>setStep("name")} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>返回</button>
              <button onClick={()=>join(step.slice(3))} style={{ ...actionBtn,background:bg,color:"#fff",flex:2 }}>登入</button>
            </div>
          </>
        )}
      </div>
      {showInstall&&(
        <Modal onClose={()=>setShowInstall(false)}>
          <div>
            <div style={{ fontWeight:800,fontSize:17,color:"#1E3A5F",marginBottom:4 }}>📲 加入手機桌面</div>
            <div style={{ fontSize:12,color:"#94A3B8",marginBottom:16 }}>把這個 App 加到主畫面，用起來像真正的 App！</div>
            <div style={{ background:"#F0F7FF",borderRadius:12,padding:14,marginBottom:10 }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#1D4ED8",marginBottom:8 }}>🍎 iPhone（Safari）</div>
              <div style={{ fontSize:13,color:"#334155",lineHeight:1.8 }}>1. 用 <b>Safari</b> 開啟此網址<br/>2. 點下方中間的 <b>分享按鈕 ⬆️</b><br/>3. 選「<b>加入主畫面</b>」<br/>4. 點右上角「<b>新增</b>」完成！</div>
            </div>
            <div style={{ background:"#F0FDF4",borderRadius:12,padding:14,marginBottom:16 }}>
              <div style={{ fontWeight:700,fontSize:14,color:"#16A34A",marginBottom:8 }}>🤖 Android（Chrome）</div>
              <div style={{ fontSize:13,color:"#334155",lineHeight:1.8 }}>1. 用 <b>Chrome</b> 開啟此網址<br/>2. 點右上角 <b>⋮ 選單</b><br/>3. 選「<b>加入主畫面</b>」或<br/>　 等待底部安裝提示<br/>4. 點「<b>安裝</b>」完成！</div>
            </div>
            <button onClick={()=>setShowInstall(false)} style={{ ...actionBtn,background:"#2563EB",color:"#fff",width:"100%",letterSpacing:1 }}>GOT IT! 👍</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// -- HomeScreen -----------------------------------------------------------------
function HomeScreen({ currentUser, onEnterBook }) {
  const [books,    setBooks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [bookNicknames, setBookNicknames] = useState({});
  const [showNew,  setShowNew]  = useState(false);
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState("#2563EB");
  const [newEmoji, setNewEmoji] = useState("💳");
  const [creating, setCreating] = useState(false);
  const [newBookNickname, setNewBookNickname] = useState("");
  const [newBookUserEmoji, setNewBookUserEmoji] = useState("");
  const [bookFormErr, setBookFormErr] = useState(false);
  const [bookFormShake, setBookFormShake] = useState(false);
  const [showJoinBook, setShowJoinBook] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinCodeErr, setJoinCodeErr] = useState("");
  const [joiningBook, setJoiningBook] = useState(false);

  useEffect(()=>{
    const u=onSnapshot(query(collection(db,"books"),orderBy("createdAt","asc")), async snap=>{
      const allBooks = snap.docs.map(d=>({id:d.id,...d.data()}));
      // Filter: only show books where currentUser is a member
      const myBooks = [];
      for(const b of allBooks){
        const mCol = await getDocs(collection(db,"books",b.id,"members"));
        const memberNames = mCol.docs.map(d=>d.data().name);
        if(memberNames.includes(currentUser) || b.ownerId===currentUser){
          myBooks.push(b);
        }
      }
      setBooks(myBooks);
      // Fetch nickname for currentUser in each book
      const nicks = {};
      for(const b of myBooks){
        const mSnap2 = await getDocs(collection(db,"books",b.id,"members"));
        const me = mSnap2.docs.find(d=>d.data().name===currentUser);
        if(me && me.data().nickname && me.data().nickname!==currentUser) nicks[b.id]=me.data().nickname;
      }
      setBookNicknames(nicks);
      setLoading(false);
    });
    return u;
  },[currentUser]);

  const joinExistingBook = async () => {
    if(!joinCode.trim()){ setJoinCodeErr("請輸入邀請碼"); return; }
    setJoiningBook(true);
    try {
      // Search all books for matching inviteCode
      const allBooks = await getDocs(query(collection(db,"books")));
      const match = allBooks.docs.find(d=>(d.data().inviteCode||"").toUpperCase()===(joinCode.trim().toUpperCase()));
      if(!match){ setJoinCodeErr("找不到此邀請碼，請確認後再試"); setJoiningBook(false); return; }
      const bookId = match.id;
      // Add user as member if not already
      const membersSnap = await getDocs(collection(db,"books",bookId,"members"));
      const exists = membersSnap.docs.find(d=>d.data().name===currentUser);
      if(!exists){
        const profile = JSON.parse(localStorage.getItem("splitpay_profile")||"{}");
        await addDoc(collection(db,"books",bookId,"members"),{ name:currentUser,...profile,hasPlusOne:false,paymentApp:null,paymentCustomLabel:"",paymentCustomUrl:"",createdAt:serverTimestamp() });
      }
      localStorage.setItem("splitpay_book",bookId);
      onEnterBook(bookId);
    } catch(e){ setJoinCodeErr("加入失敗："+e.message); }
    setJoiningBook(false);
  };

  const createBook = async () => {
    if(!newName.trim()){ setBookFormErr(true); setBookFormShake(true); setTimeout(()=>setBookFormShake(false),500); return; }
    setBookFormErr(false);
    setCreating(true);
    try {
      const inviteCode=randCode();
      const ref=await addDoc(collection(db,"books"),{ name:newName.trim(),color:newColor,emoji:newEmoji,ownerId:currentUser,archived:false,inviteCode,createdAt:serverTimestamp() });
      const profile=JSON.parse(localStorage.getItem("splitpay_profile")||"{}");
      await addDoc(collection(db,"books",ref.id,"members"),{ name:currentUser,...profile,emoji:newBookUserEmoji||profile.emoji||"",nickname:newBookNickname.trim()||currentUser,hasPlusOne:false,paymentApp:null,paymentCustomLabel:"",paymentCustomUrl:"",createdAt:serverTimestamp() });
      setNewBookNickname(""); setNewBookUserEmoji(""); setBookFormErr(false);
      localStorage.setItem("splitpay_book",ref.id);
      onEnterBook(ref.id);
    } catch(e){ alert("建立失敗: "+e.message); }
    setCreating(false);
  };

  useThemeColor("#2563EB");
  useEffect(()=>{
    const meta=document.querySelector("meta[name='theme-color']");
    if(meta) meta.setAttribute("content","#2563EB");
    document.body.style.background="#1D4ED8";
  },[]);

  if(loading) return <Spinner fullscreen/>;
  const active=books.filter(b=>!b.archived), archived=books.filter(b=>b.archived);
  const hasNoActive = active.length===0 && !loading;

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#EFF6FF 0%,#F0F7FF 100%)",fontFamily:"'Noto Sans TC',sans-serif",display:"flex",flexDirection:"column",alignItems:"center",padding:"40px 16px 80px" }}>
      <div style={{ marginBottom:8,height:44,display:"flex",alignItems:"center",justifyContent:"center" }}><img src="data:image/png;base64,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" alt="" style={{ width:56,height:32,objectFit:"contain",opacity:.9 }}/></div>
      <div style={{ fontWeight:900,fontSize:18,color:"#2563EB",marginBottom:2,letterSpacing:5,textAlign:"center" }}>NOMO</div>
      <div style={{ fontWeight:800,fontSize:24,color:"#1E3A5F",marginBottom:4,textAlign:"center" }}>Money Check²</div>
      <div style={{ fontSize:13,color:"#64748B",marginBottom:28 }}>嗨，{currentUser}！選擇或建立記帳本</div>
      <div style={{ width:"100%",maxWidth:400 }}>
        {hasNoActive&&!showNew&&!showJoinBook&&(
          <div style={{ textAlign:"center",color:"#94A3B8",padding:"32px 16px",background:"#fff",borderRadius:16,marginBottom:12 }}>
            <div style={{ fontSize:36,marginBottom:8 }}>📭</div>
            <div style={{ fontSize:14,fontWeight:700 }}>目前沒有可使用的記帳本</div>
            <div style={{ fontSize:12,marginTop:4 }}>建立新記帳本，或輸入邀請碼加入</div>
          </div>
        )}
        {active.map(b=>(
          <button key={b.id} onClick={()=>{ localStorage.setItem("splitpay_book",b.id); onEnterBook(b.id); }} style={{ display:"flex",alignItems:"center",gap:12,width:"100%",border:"none",background:"#fff",borderRadius:16,padding:"14px 16px",marginBottom:10,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 12px rgba(37,99,235,.09)" }}>
            <div style={{ width:44,height:44,borderRadius:12,background:b.color||"#2563EB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{b.emoji||"💳"}</div>
            <div style={{ flex:1,textAlign:"left" }}>
              <div style={{ fontWeight:800,fontSize:15,color:"#1E3A5F" }}>{b.name}</div>
              <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>{b.ownerId===currentUser?"你建立的":"成員"}{bookNicknames[b.id]&&<span style={{color:"#2563EB"}}> · 暱稱：{bookNicknames[b.id]}</span>} · 邀請碼 {b.inviteCode||"—"}</div>
            </div>
            <div style={{ color:"#CBD5E1",fontSize:18 }}>›</div>
          </button>
        ))}
        {archived.length>0&&(
          <button onClick={()=>setShowArchived(true)} style={{ display:"flex",alignItems:"center",gap:10,width:"100%",border:"1.5px solid #E2E8F0",background:"transparent",borderRadius:14,padding:"12px 16px",marginTop:4,cursor:"pointer",fontFamily:"inherit" }}>
            <span style={{ fontSize:18 }}>📦</span>
            <span style={{ fontSize:13,color:"#64748B",fontWeight:700 }}>查看封存記帳本 ({archived.length})</span>
            <span style={{ marginLeft:"auto",color:"#CBD5E1",fontSize:16 }}>›</span>
          </button>
        )}
        {/* Join existing book */}
        {showJoinBook ? (
          <div style={{ background:"#fff",borderRadius:16,padding:18,marginTop:8,boxShadow:"0 2px 12px rgba(37,99,235,.09)" }}>
            <div style={{ fontWeight:800,fontSize:15,color:"#1E3A5F",marginBottom:4 }}>加入記帳本</div>
            <div style={{ fontSize:12,color:"#94A3B8",marginBottom:12 }}>輸入朋友給你的邀請碼 <span style={{color:"#2563EB",fontSize:11}}>(不分大小寫)</span></div>
            <input placeholder="邀請碼（例：SZCFEO）" lang="en" inputMode="text" value={joinCode}
              onChange={e=>{ setJoinCode(e.target.value); setJoinCodeErr(""); }}
              onKeyDown={e=>e.key==="Enter"&&joinExistingBook()}
              style={{ ...fld,marginBottom:8,textAlign:"center",fontSize:20,letterSpacing:4,fontWeight:800 }} autoFocus/>
            {joinCodeErr&&<div style={{ color:"#DC2626",fontSize:12,marginBottom:8,textAlign:"center" }}>❌ {joinCodeErr}</div>}
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>{ setShowJoinBook(false); setJoinCode(""); setJoinCodeErr(""); }} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>取消</button>
              <button onClick={joinExistingBook} disabled={joiningBook} style={{ ...actionBtn,background:"#2563EB",color:"#fff",flex:2,opacity:joiningBook?.6:1 }}>{joiningBook?"加入中…":"加入"}</button>
            </div>
          </div>
        ) : (
          <button onClick={()=>setShowJoinBook(true)} style={{ ...actionBtn,background:"#EFF6FF",color:"#2563EB",width:"100%",marginTop:8,padding:"13px 16px",fontSize:15,border:"1.5px solid #BFDBFE" }}>🔗 加入記帳本（輸入邀請碼）</button>
        )}

        {!showNew
          ? <button onClick={()=>setShowNew(true)} style={{ ...actionBtn,background:"#2563EB",color:"#fff",width:"100%",marginTop:8,padding:"13px 16px",fontSize:15 }}>＋ 建立新記帳本</button>
          : (
            <div style={{ background:"#fff",borderRadius:16,padding:18,marginTop:8,boxShadow:"0 2px 12px rgba(37,99,235,.09)" }}>
              <div style={{ fontWeight:800,fontSize:15,color:"#1E3A5F",marginBottom:12 }}>建立新記帳本</div>
              <input placeholder="記帳本名稱（例：京都旅遊）" value={newName} onChange={e=>{ setNewName(e.target.value); setBookFormErr(false); }} style={{ ...fld,marginBottom:6,animation:bookFormShake?"shake .4s ease":"none",borderColor:bookFormErr&&!newName.trim()?"#EF4444":undefined,background:bookFormErr&&!newName.trim()?"#FFF5F5":undefined }} autoFocus/>
              <input placeholder={`你在此記帳本的暱稱（預設：${currentUser}）`} value={newBookNickname} onChange={e=>setNewBookNickname(e.target.value)} style={{ ...fld,marginBottom:8 }}/>
              <div style={lbl}>選擇你在此記帳本的頭像</div>
              <div style={{ display:"flex",flexWrap:"wrap",gap:5,marginBottom:10 }}>
                {USER_EMOJIS.map(e=><button key={e} onClick={()=>setNewBookUserEmoji(e)} style={{ fontSize:20,background:newBookUserEmoji===e?newColor+"33":"transparent",border:newBookUserEmoji===e?`2px solid ${newColor}`:"2px solid transparent",borderRadius:9,padding:"3px 5px",cursor:"pointer" }}>{e}</button>)}
              </div>
              <div style={lbl}>選擇顏色</div>
              <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                {BOOK_COLORS.map(col=><button key={col} onClick={()=>setNewColor(col)} style={{ width:28,height:28,borderRadius:"50%",background:col,border:"none",cursor:"pointer",outline:newColor===col?"2.5px solid #1E3A5F":"2.5px solid transparent",outlineOffset:2 }}/>)}
              </div>
              <div style={lbl}>選擇 Emoji 標誌</div>
              <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap" }}>
                {BOOK_EMOJIS.map(e=><button key={e} onClick={()=>setNewEmoji(e)} style={{ fontSize:22,background:newEmoji===e?newColor+"22":"transparent",border:newEmoji===e?`2px solid ${newColor}`:"2px solid transparent",borderRadius:10,padding:"4px 6px",cursor:"pointer" }}>{e}</button>)}
              </div>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={()=>setShowNew(false)} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>取消</button>
                <button onClick={createBook} disabled={creating} style={{ ...actionBtn,background:newColor,color:"#fff",flex:2,opacity:creating?.6:1 }}>{creating?"建立中…":"建立"}</button>
              </div>
            </div>
          )
        }
      </div>
    </div>

    {/* Archived books page */}
    {showArchived&&(
      <div style={{ position:"fixed",inset:0,background:"#F0F7FF",zIndex:500,fontFamily:"'Noto Sans TC',sans-serif",overflowY:"auto" }}>
        <div style={{ background:"linear-gradient(135deg,#64748B,#94A3B8)",padding:"calc(env(safe-area-inset-top,0px)+16px) 18px 16px",borderRadius:"0 0 20px 20px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <button onClick={()=>setShowArchived(false)} style={{ background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,padding:"6px 9px",cursor:"pointer",color:"#fff",fontSize:16 }}>‹</button>
            <div style={{ color:"#fff",fontWeight:800,fontSize:18 }}>📦 封存記帳本</div>
          </div>
        </div>
        <div style={{ padding:"16px 16px 80px" }}>
          {archived.length===0
            ? <div style={{ textAlign:"center",color:"#94A3B8",padding:40 }}>沒有封存的記帳本</div>
            : archived.map(b=>(
              <button key={b.id} onClick={()=>{ localStorage.setItem("splitpay_book",b.id); onEnterBook(b.id); setShowArchived(false); }} style={{ display:"flex",alignItems:"center",gap:12,width:"100%",border:"none",background:"#fff",borderRadius:16,padding:"14px 16px",marginBottom:10,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 10px rgba(0,0,0,.06)",opacity:.8 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:"#94A3B8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>📦</div>
                <div style={{ flex:1,textAlign:"left" }}>
                  <div style={{ fontWeight:700,fontSize:15,color:"#64748B" }}>{b.name}</div>
                  <div style={{ fontSize:11,color:"#94A3B8",marginTop:1 }}>已封存 · {b.ownerId===currentUser?"你建立的":"成員"}</div>
                </div>
                <div style={{ color:"#CBD5E1",fontSize:16 }}>›</div>
              </button>
            ))
          }
        </div>
      </div>
    )}
  );
}

// -- LoginScreen ----------------------------------------------------------------
function LoginScreen({ onLogin, pendingJoin }) {
  const [name, setName] = useState("");
  const [pw,   setPw]   = useState("");
  const [selEmoji,setSelEmoji]=useState("");
  const [step, setStep] = useState("name"); // name | setup | pw
  const [err,  setErr]  = useState("");

  const handleName = async () => {
    if(!name.trim()) return;
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem("splitpay_users")||"{}");
    if(users[name.trim()]){
      setStep("pw");
    } else {
      setStep("setup");
    }
  };

  const handleRegister = async () => {
    if(!pw.trim()){ setErr("請設定密碼"); return; }
    const hash = await hashPw(pw);
    const users = JSON.parse(localStorage.getItem("splitpay_users")||"{}");
    users[name.trim()] = { passwordHash:hash, emoji:selEmoji };
    localStorage.setItem("splitpay_users", JSON.stringify(users));
    localStorage.setItem("splitpay_user", name.trim());
    localStorage.setItem("splitpay_profile", JSON.stringify({ emoji:selEmoji }));
    if(pendingJoin) localStorage.setItem("splitpay_pending_join", pendingJoin);
    onLogin(name.trim());
  };

  const handleLogin = async () => {
    const users = JSON.parse(localStorage.getItem("splitpay_users")||"{}");
    const u = users[name.trim()];
    if(!u){ setErr("找不到此帳號"); return; }
    const hash = await hashPw(pw);
    if(hash!==u.passwordHash){ setErr("密碼不正確"); return; }
    localStorage.setItem("splitpay_user", name.trim());
    localStorage.setItem("splitpay_profile", JSON.stringify({ emoji:u.emoji }));
    if(pendingJoin) localStorage.setItem("splitpay_pending_join", pendingJoin);
    onLogin(name.trim());
  };

  useThemeColor("#1D4ED8");
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#1D4ED8,#3B82F6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Noto Sans TC',sans-serif" }}>
      <div style={{ fontSize:52,marginBottom:12 }}>💳</div>
      <div style={{ color:"#fff",fontWeight:800,fontSize:26,letterSpacing:1,marginBottom:4 }}>朋友分帳</div>
      <div style={{ color:"rgba(255,255,255,.7)",fontSize:13,marginBottom:32 }}>Accounting book · NOMO-1</div>
      <div style={{ background:"#fff",borderRadius:20,padding:24,width:"100%",maxWidth:340,boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        {step==="name"&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:6 }}>歡迎！</div>
            <div style={{ fontSize:13,color:"#94A3B8",marginBottom:14 }}>輸入你的名字開始使用</div>
            <input placeholder="你的名字" value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&name.trim()&&handleName()}
              style={{ ...fld,marginBottom:12 }} autoFocus/>
            <button onClick={handleName} style={{ ...actionBtn,background:"#2563EB",color:"#fff",width:"100%" }}>繼續</button>
          </>
        )}
        {step==="setup"&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:4 }}>嗨，{name}！</div>
            <div style={{ fontSize:13,color:"#94A3B8",marginBottom:12 }}>選個頭像 Emoji，並設定密碼</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
              {USER_EMOJIS.map(e=><button key={e} onClick={()=>setSelEmoji(e)} style={{ fontSize:22,background:selEmoji===e?"#EFF6FF":"transparent",border:selEmoji===e?"2px solid #2563EB":"2px solid transparent",borderRadius:10,padding:"4px 6px",cursor:"pointer" }}>{e}</button>)}
            </div>
            <input type="password" placeholder="設定密碼" value={pw} onChange={e=>setPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleRegister()}
              style={{ ...fld,marginBottom:8 }}/>
            {err&&<div style={{ color:"#DC2626",fontSize:12,marginBottom:8 }}>❌ {err}</div>}
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>setStep("name")} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>返回</button>
              <button onClick={handleRegister} style={{ ...actionBtn,background:"#2563EB",color:"#fff",flex:2 }}>完成註冊</button>
            </div>
          </>
        )}
        {step==="pw"&&(
          <>
            <div style={{ fontWeight:800,fontSize:16,color:"#1E3A5F",marginBottom:4 }}>歡迎回來，{name}！</div>
            <div style={{ fontSize:13,color:"#94A3B8",marginBottom:14 }}>輸入密碼登入</div>
            <input type="password" placeholder="密碼" value={pw} onChange={e=>setPw(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={{ ...fld,marginBottom:8 }} autoFocus/>
            {err&&<div style={{ color:"#DC2626",fontSize:12,marginBottom:8 }}>❌ {err}</div>}
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>{ setStep("name"); setPw(""); setErr(""); }} style={{ ...actionBtn,background:"#F1F5F9",color:"#64748B",flex:1 }}>返回</button>
              <button onClick={handleLogin} style={{ ...actionBtn,background:"#2563EB",color:"#fff",flex:2 }}>登入</button>
            </div>
          </>
        )}
      </div>
      <div style={{ color:"rgba(255,255,255,.4)",fontSize:11,marginTop:20 }}>資料即時同步 · 多人共用</div>
    </div>
  );
}

// -- Root -----------------------------------------------------------------------
export default function App() {
  const [currentUser,  setCurrentUser]  = useState(()=>localStorage.getItem("splitpay_user")||null);
  const [activeBookId, setActiveBookId] = useState(()=>localStorage.getItem("splitpay_book")||null);
  const [showSettings, setShowSettings] = useState(false);
  const [members,      setMembers]      = useState([]);
  const userProfile = JSON.parse(localStorage.getItem("splitpay_profile")||"{}");

  const joinBookId = new URLSearchParams(window.location.search).get("join");

  // Listen to members for settings panel
  useEffect(()=>{
    if(!activeBookId) return;
    const u=onSnapshot(query(collection(db,"books",activeBookId,"members"),orderBy("createdAt","asc")),snap=>setMembers(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return u;
  },[activeBookId]);

  const [autoOpenJoin, setAutoOpenJoin] = useState(false);
  const handleLogin = name => {
    setCurrentUser(name);
    const pj = localStorage.getItem("splitpay_pending_join");
    if(pj){ localStorage.removeItem("splitpay_pending_join"); window.location.search = "?join="+pj; }
  };
  const handleSwitchUser = () => { localStorage.removeItem("splitpay_user"); localStorage.removeItem("splitpay_book"); setCurrentUser(null); setActiveBookId(null); };
  const handleJoinDone = (name,bookId) => { setCurrentUser(name); setActiveBookId(bookId); };

  if(joinBookId) {
    // If not logged in yet, go login first then join
    if(!currentUser) return <LoginScreen onLogin={handleLogin} pendingJoin={joinBookId}/>;
    return <JoinScreen bookId={joinBookId} currentUser={currentUser} onDone={handleJoinDone}/>;
  }
  if(!currentUser) return <LoginScreen onLogin={handleLogin}/>;
  if(!activeBookId) return <HomeScreen currentUser={currentUser} onEnterBook={id=>{ setActiveBookId(id); }}/>;

  return (
    <>
      <BookApp
        bookId={activeBookId}
        currentUser={currentUser}
        userProfile={userProfile}
        onBack={()=>{ setActiveBookId(null); localStorage.removeItem("splitpay_book"); }}
        onOpenSettings={()=>setShowSettings(true)}
      />
      {showSettings&&(
        <SettingsPanel
          currentUser={currentUser}
          userProfile={userProfile}
          members={members}
          bookId={activeBookId}
          bookColor={JSON.parse(localStorage.getItem("splitpay_book_color")||'"#2563EB"')}
          onClose={()=>setShowSettings(false)}
          onSwitchUser={handleSwitchUser}
        />
      )}
    </>
  );
}

// -- Style tokens ---------------------------------------------------------------
const fld = { width:"100%",maxWidth:"100%",padding:"8px 10px",border:"1.5px solid #BFDBFE",borderRadius:9,fontSize:14,fontFamily:"inherit",background:"#F8FBFF",color:"#1E3A5F",transition:"border .2s",marginBottom:0,boxSizing:"border-box",display:"block",minWidth:0 };
const lbl = { fontSize:11,fontWeight:700,color:"#64748B",marginBottom:5,textTransform:"uppercase",letterSpacing:.4,display:"block" };
const actionBtn = { border:"none",borderRadius:10,padding:"10px 16px",cursor:"pointer",fontWeight:800,fontSize:14,fontFamily:"inherit",transition:"all .15s" };
const wkBtn = { fontSize:10,fontWeight:700,background:"#EFF6FF",color:"#2563EB",border:"none",borderRadius:7,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit" };
const arrowBtn = { background:"none",border:"none",cursor:"pointer",color:"#94A3B8",fontSize:16,padding:"0 3px",lineHeight:1,flexShrink:0 };
const pgBtn = { background:"#EFF6FF",border:"none",borderRadius:7,width:26,height:26,cursor:"pointer",color:"#2563EB",fontSize:15,fontWeight:700,fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center" };

// -- useThemeColor: syncs status bar + body bg to book color -------------------
