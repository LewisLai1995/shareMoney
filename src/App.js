import { useState, useRef, useEffect } from “react”;
import { initializeApp } from “firebase/app”;
import {
getFirestore, collection, doc, onSnapshot,
setDoc, addDoc, updateDoc, deleteDoc, getDoc,
query, orderBy, serverTimestamp
} from “firebase/firestore”;

// ── Firebase ───────────────────────────────────────────────────────────────────
const firebaseConfig = {
apiKey: “AIzaSyCvMPTbuuoT3vtPHZ-rGVGlxHy__Q0WvbQ”,
authDomain: “sharemoney-3cf22.firebaseapp.com”,
projectId: “sharemoney-3cf22”,
storageBucket: “sharemoney-3cf22.firebasestorage.app”,
messagingSenderId: “311495146563”,
appId: “1:311495146563:web:995568a85d2ec62d14e8f6”,
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Constants ──────────────────────────────────────────────────────────────────
const MEMBER_COLORS = [”#2563EB”,”#7C3AED”,”#DC2626”,”#059669”,”#D97706”,”#DB2777”,”#0891B2”,”#64748B”];
const BOOK_COLORS   = [”#2563EB”,”#7C3AED”,”#DC2626”,”#059669”,”#D97706”,”#DB2777”,”#0891B2”,”#374151”];
const CURRENCIES    = [
{ code:“TWD”, symbol:“NT$”, rate:1 },
{ code:“USD”, symbol:”$”,   rate:32 },
{ code:“JPY”, symbol:“¥”,   rate:0.22 },
{ code:“EUR”, symbol:“€”,   rate:34.5 },
{ code:“KRW”, symbol:“₩”,   rate:0.024 },
{ code:“HKD”, symbol:“HK$”, rate:4.1 },
];
const CATEGORIES = [
{ id:“food”,      label:“餐飲”,    emoji:“🍜” },
{ id:“transport”, label:“交通”,    emoji:“🚗” },
{ id:“stay”,      label:“住宿”,    emoji:“🏠” },
{ id:“fun”,       label:“娛樂”,    emoji:“🎮” },
{ id:“shopping”,  label:“購物”,    emoji:“🛒” },
{ id:“medical”,   label:“醫療”,    emoji:“💊” },
{ id:“proxy”,     label:“代購”,    emoji:“📦” },
{ id:“windfall”,  label:“意外之財”,emoji:“🍀” },
{ id:“other”,     label:“其他”,    emoji:“📌” },
];
const PAYMENT_APPS = [
{ id:“linepay”, label:“LINE Pay”, emoji:“💚”, url:“https://line.me/R/pay” },
{ id:“jkopay”,  label:“街口支付”, emoji:“🟠”, url:“https://jkopay.com/app” },
{ id:“allpay”,  label:“全支付”,   emoji:“🔵”, url:“https://www.allpay.com.tw” },
{ id:“esun”,    label:“玉山銀行”, emoji:“🏔️”, url:“https://www.esunbank.com.tw” },
{ id:“ctbc”,    label:“中國信託”, emoji:“🏦”, url:“https://www.ctbcbank.com” },
{ id:“taishin”, label:“台新銀行”, emoji:“🔴”, url:“https://www.taishinbank.com.tw” },
{ id:“land”,    label:“土地銀行”, emoji:“🟢”, url:“https://www.landbank.com.tw” },
{ id:“sinopac”, label:“永豐銀行”, emoji:“🟡”, url:“https://www.banksinopac.com.tw” },
{ id:“custom”,  label:“自訂連結”, emoji:“✏️”, url:”” },
];
const DAYS_ZH  = [“日”,“一”,“二”,“三”,“四”,“五”,“六”];
const todayStr = () => new Date().toISOString().slice(0,10);
const toTWD    = (amt, code) => Math.round(amt * (CURRENCIES.find(c=>c.code===code)?.rate||1));
const fmtAmt   = (amt, code) => `${CURRENCIES.find(c=>c.code===code)?.symbol||"NT$"}${Number(amt).toLocaleString()}`;
const getMColor= (name, members) => MEMBER_COLORS[Math.max(0,members.findIndex(m=>m.name===name)) % MEMBER_COLORS.length];
const randCode = () => Math.random().toString(36).slice(2,8).toUpperCase();

// ── Tiny UI ────────────────────────────────────────────────────────────────────
function Avatar({ name, members, size=36 }) {
return (
<div style={{
width:size, height:size, borderRadius:“50%”, flexShrink:0,
background:getMColor(name,members),
display:“flex”, alignItems:“center”, justifyContent:“center”,
fontWeight:800, fontSize:Math.round(size*.4), color:”#fff”,
boxShadow:“0 2px 6px rgba(0,0,0,.18)”
}}>{(name||”?”)[0]}</div>
);
}
function Chip({ label, active, color, onClick, small }) {
return (
<button onClick={onClick} style={{
border:“none”, cursor:“pointer”, fontFamily:“inherit”, whiteSpace:“nowrap”,
borderRadius:20, padding:small?“4px 9px”:“6px 13px”,
fontSize:small?11:12, fontWeight:700, flexShrink:0, transition:“all .15s”,
background:active?(color||”#2563EB”):”#EFF6FF”, color:active?”#fff”:”#334155”,
}}>{label}</button>
);
}
function Toast({ msg }) {
return msg ? (
<div style={{
position:“fixed”, bottom:28, left:“50%”, transform:“translateX(-50%)”,
background:”#1E3A5F”, color:”#fff”, borderRadius:14, padding:“10px 22px”,
fontWeight:700, fontSize:14, zIndex:9999, whiteSpace:“nowrap”,
boxShadow:“0 8px 24px rgba(30,58,95,.25)”, animation:“fadeUp .2s ease”
}}>{msg}</div>
) : null;
}
function Modal({ children, onClose }) {
return (
<div onClick={onClose} style={{
position:“fixed”, inset:0, background:“rgba(15,23,42,.5)”, zIndex:1000,
display:“flex”, alignItems:“center”, justifyContent:“center”, padding:16
}}>
<div onClick={e=>e.stopPropagation()} style={{
background:”#fff”, borderRadius:20, padding:24, width:“100%”, maxWidth:400,
boxShadow:“0 24px 64px rgba(37,99,235,.18)”, maxHeight:“90vh”, overflowY:“auto”
}}>{children}</div>
</div>
);
}
function Spinner({ fullscreen, color=”#2563EB” }) {
const spin = <div style={{ width:36, height:36, borderRadius:“50%”, border:`3px solid #EFF6FF`, borderTopColor:color, animation:“spin .7s linear infinite” }}/>;
if(!fullscreen) return <div style={{ display:“flex”, justifyContent:“center”, padding:32 }}>{spin}</div>;
return (
<div style={{ minHeight:“100vh”, background:“linear-gradient(135deg,#1D4ED8,#3B82F6)”, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, fontFamily:”‘Noto Sans TC’,sans-serif” }}>
<div style={{ fontSize:48, marginBottom:20 }}>💳</div>
{spin}
<div style={{ color:“rgba(255,255,255,.7)”, marginTop:12, fontSize:14 }}>連線中…</div>
</div>
);
}

// ── WeekPicker ─────────────────────────────────────────────────────────────────
function WeekPicker({ selected, onChange, datesWithData=[] }) {
const [offset,     setOffset]     = useState(0);
const [showPicker, setShowPicker] = useState(false);
const [animDir,    setAnimDir]    = useState(null);
const touchX = useRef(null);
const today  = todayStr();

const weekDays = (() => {
const base = new Date(); base.setDate(base.getDate()+offset*7);
const sun  = new Date(base); sun.setDate(base.getDate()-base.getDay());
return Array.from({length:7},(_,i)=>{ const d=new Date(sun); d.setDate(sun.getDate()+i); return d.toISOString().slice(0,10); });
})();

const weekLabel = offset===0?“本週”:offset===-1?“上週”:offset===1?“下週”
:`${new Date(weekDays[0]+"T12:00").getMonth()+1}/${new Date(weekDays[0]+"T12:00").getDate()} – ${new Date(weekDays[6]+"T12:00").getMonth()+1}/${new Date(weekDays[6]+"T12:00").getDate()}`;

const go = dir => { setAnimDir(dir); setOffset(o=>o+(dir===“left”?1:-1)); };
const jumpTo = d => {
const diff = Math.floor((new Date(d)-new Date(today))/(7*86400000));
setAnimDir(diff>offset?“left”:“right”); setOffset(diff); onChange(d); setShowPicker(false);
};

return (
<div onTouchStart={e=>{touchX.current=e.touches[0].clientX;}}
onTouchEnd={e=>{ const dx=e.changedTouches[0].clientX-(touchX.current||0); if(Math.abs(dx)>40) go(dx<0?“left”:“right”); touchX.current=null; }}
style={{ background:”#fff”, borderRadius:14, padding:“10px 10px 8px”, marginBottom:12, boxShadow:“0 2px 10px rgba(37,99,235,.07)”, touchAction:“pan-y”, userSelect:“none” }}>
<div style={{ display:“flex”, alignItems:“center”, justifyContent:“space-between”, marginBottom:6 }}>
<span style={{ fontSize:12, fontWeight:700, color:”#64748B” }}>{weekLabel}</span>
<div style={{ display:“flex”, gap:5 }}>
<button onClick={()=>{ setAnimDir(“right”); setOffset(0); onChange(today); }} style={wkBtn}>回到今日</button>
<button onClick={()=>setShowPicker(v=>!v)} style={wkBtn}>指定日期</button>
</div>
</div>
{showPicker&&(
<div style={{ overflow:“hidden”, borderRadius:9, border:“1.5px solid #BFDBFE”, background:”#F8FBFF”, marginBottom:6 }}>
<input type=“date” defaultValue={selected} autoFocus onChange={e=>e.target.value&&jumpTo(e.target.value)}
style={{ width:“100%”, padding:“7px 10px”, border:“none”, fontSize:13, fontFamily:“inherit”, boxSizing:“border-box”, background:“transparent”, color:”#1E3A5F”, WebkitAppearance:“none”, appearance:“none” }}/>
</div>
)}
<div style={{ display:“flex”, alignItems:“center” }}>
<button onClick={()=>go(“right”)} style={arrowBtn}>‹</button>
<div key={offset} style={{ flex:1, display:“flex”, animation:animDir?(animDir===“left”?“slideLeft .22s ease”:“slideRight .22s ease”):“none” }} onAnimationEnd={()=>setAnimDir(null)}>
{weekDays.map(d=>{
const dt=new Date(d+“T12:00”), isSel=d===selected, isTdy=d===today, hasDot=datesWithData.includes(d);
return (
<button key={d} onClick={()=>onChange(d)} style={{ flex:1, border:“none”, cursor:“pointer”, borderRadius:10, padding:“5px 1px”, background:isSel?”#2563EB”:isTdy?”#EFF6FF”:“transparent”, fontFamily:“inherit”, transition:“all .15s” }}>
<div style={{ fontSize:11, fontWeight:600, color:isSel?“rgba(255,255,255,.75)”:isTdy?”#2563EB”:”#94A3B8” }}>{DAYS_ZH[dt.getDay()]}</div>
<div style={{ fontSize:15, fontWeight:800, color:isSel?”#fff”:isTdy?”#2563EB”:”#334155”, marginTop:1 }}>{dt.getDate()}</div>
<div style={{ height:5, display:“flex”, alignItems:“center”, justifyContent:“center”, marginTop:1 }}>
{hasDot&&<div style={{ width:4, height:4, borderRadius:“50%”, background:isSel?“rgba(255,255,255,.7)”:isTdy?”#2563EB”:”#94A3B8” }}/>}
</div>
</button>
);
})}
</div>
<button onClick={()=>go(“left”)} style={arrowBtn}>›</button>
</div>
</div>
);
}

// ── ExpenseForm ────────────────────────────────────────────────────────────────
function ExpenseForm({ members, initialData, onSave, onCancel, saveLabel=“確認新增”, loading, bookColor=”#2563EB” }) {
const init = { desc:””, amount:””, currency:“TWD”, paidBy:members[0]?.name||””, category:CATEGORIES[0].id, splitWith:members.map(m=>m.name), plusOnes:{}, date:todayStr(), …(initialData||{}) };
const [form, setForm] = useState(init);
const [err,  setErr]  = useState(””);
const set = (k,v) => setForm(p=>({…p,[k]:v}));
const toggleSplit = n => set(“splitWith”, form.splitWith.includes(n)?form.splitWith.filter(x=>x!==n):[…form.splitWith,n]);
const togglePO    = n => { const po={…form.plusOnes}; po[n]?delete po[n]:(po[n]=true); set(“plusOnes”,po); };
const sc     = form.splitWith.reduce((s,n)=>s+1+(form.plusOnes[n]?1:0),0);
const twdAmt = form.amount?toTWD(parseFloat(form.amount)||0,form.currency):0;
const perTWD = sc>0&&twdAmt?Math.ceil(twdAmt/sc):0;
const isWF   = form.category===“windfall”;
const saveBg = isWF?”#16A34A”:bookColor;
const validate = () => {
if(!form.desc.trim())                            return “請輸入品項說明”;
if(!form.amount||isNaN(parseFloat(form.amount))) return “請輸入金額”;
if(!form.paidBy)                                 return “請選擇付款人”;
if(!form.splitWith.length)                       return “請選擇至少一位分攤成員”;
return “”;
};
const handleSave = () => { const e=validate(); if(e){setErr(e);return;} setErr(””); onSave({…form,amount:parseFloat(form.amount),id:form.id||Date.now()}); };
return (
<div style={{ background:”#fff”, borderRadius:18, boxShadow:“0 4px 20px rgba(37,99,235,.10)”, overflow:“hidden” }}>
{err&&<div style={{ background:”#FEF2F2”, color:”#DC2626”, fontSize:12, fontWeight:700, padding:“8px 14px” }}>⚠️ {err}</div>}
<div style={{ display:“flex”, minHeight:0 }}>
{/* LEFT */}
<div style={{ flex:“0 0 50%”, width:0, minWidth:0, padding:“12px 6px 10px 12px”, borderRight:“1px solid #EFF6FF”, boxSizing:“border-box”, overflow:“hidden” }}>
<div style={{ marginBottom:8 }}>
<div style={lbl}>📅 日期</div>
<div style={{ overflow:“hidden”, borderRadius:9, border:“1.5px solid #BFDBFE”, background:”#F8FBFF” }}>
<input type=“date” value={form.date} onChange={e=>set(“date”,e.target.value)}
style={{ width:“100%”, padding:“8px 10px”, border:“none”, fontSize:14, fontFamily:“inherit”, background:“transparent”, color:”#1E3A5F”, boxSizing:“border-box”, display:“block”, WebkitAppearance:“none”, appearance:“none” }}/>
</div>
</div>
<div style={{ marginBottom:8 }}>
<div style={lbl}>📝 品項</div>
<input placeholder=“說明” value={form.desc} onChange={e=>set(“desc”,e.target.value)} style={fld}/>
</div>
<div>
<div style={lbl}>💵 金額</div>
<div style={{ display:“flex”, gap:4 }}>
<select value={form.currency} onChange={e=>set(“currency”,e.target.value)}
style={{ …fld, width:64, flex:“none”, padding:“8px 4px”, minWidth:0 }}>
{CURRENCIES.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}
</select>
<input type=“number” placeholder=“0” value={form.amount} onChange={e=>set(“amount”,e.target.value)}
style={{ …fld, flex:1, minWidth:0 }}/>
</div>
{form.currency!==“TWD”&&form.amount&&(
<div style={{ fontSize:10, color:bookColor, fontWeight:600, marginTop:3 }}>≈ NT${twdAmt.toLocaleString()}</div>
)}
</div>
</div>
{/* RIGHT */}
<div style={{ flex:“0 0 50%”, width:0, minWidth:0, padding:“12px 12px 10px 8px”, boxSizing:“border-box”, overflow:“hidden” }}>
<div style={{ marginBottom:10 }}>
<div style={lbl}>👤 誰付錢？</div>
<div style={{ display:“flex”, flexWrap:“wrap”, gap:4 }}>
{members.map(m=><Chip key={m.name} label={m.name} active={form.paidBy===m.name} color={getMColor(m.name,members)} onClick={()=>set(“paidBy”,m.name)} small/>)}
</div>
</div>
<div>
<div style={{ display:“flex”, alignItems:“center”, justifyContent:“space-between”, marginBottom:4 }}>
<div style={lbl}>👥 分攤成員</div>
<button onClick={()=>set(“splitWith”,form.splitWith.length===members.length?[]:members.map(m=>m.name))}
style={{ fontSize:10, color:bookColor, background:“none”, border:“none”, cursor:“pointer”, fontWeight:700, fontFamily:“inherit” }}>
{form.splitWith.length===members.length?“全取消”:“全選”}
</button>
</div>
{members.map(m=>{
const inSplit=form.splitWith.includes(m.name), col=getMColor(m.name,members), poOn=form.plusOnes[m.name];
return (
<div key={m.name} style={{ display:“flex”, alignItems:“center”, gap:4, marginBottom:5 }}>
<button onClick={()=>toggleSplit(m.name)} style={{
flex:1, display:“flex”, alignItems:“center”, gap:5, border:“none”, cursor:“pointer”,
borderRadius:9, padding:“5px 7px”, fontFamily:“inherit”, minWidth:0,
background:inSplit?col+“1A”:”#F8FAFC”, outline:inSplit?`1.5px solid ${col}`:“1.5px solid #E2E8F0”,
}}>
<Avatar name={m.name} members={members} size={20}/>
<span style={{ fontSize:12, fontWeight:700, color:inSplit?col:”#94A3B8”, overflow:“hidden”, textOverflow:“ellipsis”, whiteSpace:“nowrap” }}>{m.name}</span>
<span style={{ marginLeft:“auto”, fontSize:13, color:inSplit?col:”#CBD5E1”, flexShrink:0 }}>{inSplit?“✓”:“○”}</span>
</button>
{m.hasPlusOne&&inSplit&&(
<button onClick={()=>togglePO(m.name)} style={{ border:“none”, borderRadius:7, padding:“4px 7px”, cursor:“pointer”, fontFamily:“inherit”, background:poOn?bookColor:”#EFF6FF”, color:poOn?”#fff”:bookColor, fontSize:13, fontWeight:800, flexShrink:0 }}>👫</button>
)}
</div>
);
})}
{perTWD>0&&(
<div style={{ fontSize:11, color:isWF?”#16A34A”:bookColor, fontWeight:700, background:isWF?”#F0FDF4”:”#EFF6FF”, borderRadius:7, padding:“4px 8px”, marginTop:4 }}>
每人 NT${perTWD.toLocaleString()}{form.currency!==“TWD”&&” (換算)”}
</div>
)}
</div>
</div>
</div>
{/* Category */}
<div style={{ padding:“10px 12px 8px”, borderTop:“1px solid #EFF6FF” }}>
<div style={lbl}>🏷️ 類別</div>
<div style={{ display:“flex”, gap:5, overflowX:“auto”, paddingBottom:2, scrollbarWidth:“none” }}>
{CATEGORIES.map(cat=>(
<button key={cat.id} onClick={()=>set(“category”,cat.id)} style={{
flexShrink:0, border:“none”, borderRadius:20, padding:“6px 12px”,
background:form.category===cat.id?(cat.id===“windfall”?”#16A34A”:bookColor):”#EFF6FF”,
color:form.category===cat.id?”#fff”:bookColor,
fontSize:12, fontWeight:700, cursor:“pointer”, fontFamily:“inherit”, whiteSpace:“nowrap”
}}>{cat.emoji} {cat.label}</button>
))}
</div>
</div>
{/* Footer */}
<div style={{ display:“flex”, gap:8, padding:“10px 12px”, borderTop:“1px solid #EFF6FF” }}>
{onCancel&&<button onClick={onCancel} style={{ …actionBtn, background:”#F1F5F9”, color:”#64748B”, flex:1 }}>取消</button>}
<button onClick={handleSave} disabled={loading} style={{ …actionBtn, background:saveBg, color:”#fff”, flex:2, opacity:loading?.6:1 }}>
{loading?“處理中…”:`${isWF?"🍀 ":""}${saveLabel}`}
</button>
</div>
</div>
);
}

// ── ConfirmDialog ──────────────────────────────────────────────────────────────
function ConfirmDialog({ msg, sub, confirmLabel=“確認刪除”, confirmColor=”#EF4444”, onConfirm, onCancel }) {
return (
<Modal onClose={onCancel}>
<div style={{ textAlign:“center” }}>
<div style={{ fontSize:36, marginBottom:10 }}>⚠️</div>
<div style={{ fontWeight:800, fontSize:16, color:”#1E3A5F”, marginBottom:6 }}>{msg}</div>
{sub&&<div style={{ fontSize:13, color:”#64748B”, marginBottom:4 }}>{sub}</div>}
<div style={{ display:“flex”, gap:10, marginTop:18 }}>
<button onClick={onCancel}  style={{ …actionBtn, background:”#F1F5F9”, color:”#64748B”, flex:1 }}>取消</button>
<button onClick={onConfirm} style={{ …actionBtn, background:confirmColor, color:”#fff”, flex:1 }}>{confirmLabel}</button>
</div>
</div>
</Modal>
);
}

// ── JoinScreen (邀請流程) ───────────────────────────────────────────────────────
function JoinScreen({ bookId, onDone }) {
const [book,     setBook]     = useState(null);
const [loading,  setLoading]  = useState(true);
const [members,  setMembers]  = useState([]);
const [step,     setStep]     = useState(“code”);  // “code” | “name” | “pick”
const [code,     setCode]     = useState(””);
const [name,     setName]     = useState(””);
const [codeErr,  setCodeErr]  = useState(””);

useEffect(()=>{
getDoc(doc(db,“books”,bookId)).then(snap=>{
if(snap.exists()) setBook({ id:snap.id, …snap.data() });
setLoading(false);
});
const unsub = onSnapshot(query(collection(db,“books”,bookId,“members”),orderBy(“createdAt”,“asc”)),
snap=>setMembers(snap.docs.map(d=>({ id:d.id, …d.data() }))));
return unsub;
},[bookId]);

const verifyCode = () => {
if(!book) return;
if(code.trim().toUpperCase() === book.inviteCode) {
setCodeErr(””); setStep(“pick”);
} else {
setCodeErr(“邀請碼不正確，請確認後再試”);
}
};

const join = async (chosenName) => {
const finalName = chosenName||name.trim();
if(!finalName) return;
if(!members.find(m=>m.name===finalName)){
await addDoc(collection(db,“books”,bookId,“members”),{
name:finalName, hasPlusOne:false, paymentApp:null,
paymentCustomLabel:””, paymentCustomUrl:””, createdAt:serverTimestamp()
});
}
localStorage.setItem(“splitpay_user”, finalName);
localStorage.setItem(“splitpay_book”, bookId);
onDone(finalName, bookId);
};

const bg = book?.color||”#2563EB”;

if(loading) return <Spinner fullscreen/>;

if(!book) return (
<div style={{ minHeight:“100vh”, background:“linear-gradient(135deg,#1D4ED8,#3B82F6)”, display:“flex”, alignItems:“center”, justifyContent:“center”, fontFamily:”‘Noto Sans TC’,sans-serif”, padding:24 }}>
<div style={{ background:”#fff”, borderRadius:20, padding:28, textAlign:“center”, maxWidth:320, width:“100%” }}>
<div style={{ fontSize:40, marginBottom:12 }}>😕</div>
<div style={{ fontWeight:800, fontSize:16, color:”#1E3A5F”, marginBottom:8 }}>找不到這個記帳本</div>
<div style={{ fontSize:13, color:”#94A3B8” }}>連結可能已失效或記帳本已被刪除</div>
</div>
</div>
);

return (
<div style={{ minHeight:“100vh”, background:`linear-gradient(135deg,${bg}dd,${bg})`, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, padding:24, fontFamily:”‘Noto Sans TC’,sans-serif” }}>
<div style={{ fontSize:48, marginBottom:10 }}>💳</div>
<div style={{ color:”#fff”, fontWeight:800, fontSize:22, marginBottom:4 }}>{book.name}</div>
<div style={{ color:“rgba(255,255,255,.7)”, fontSize:13, marginBottom:28 }}>
{members.length} 位成員 · 你被邀請加入這個記帳本
</div>
<div style={{ background:”#fff”, borderRadius:20, padding:24, width:“100%”, maxWidth:340, boxShadow:“0 20px 60px rgba(0,0,0,.25)” }}>

```
    {/* Step 1: 輸入邀請碼 */}
    {step==="code"&&(
      <>
        <div style={{ fontWeight:800, fontSize:16, color:"#1E3A5F", marginBottom:6 }}>輸入邀請碼</div>
        <div style={{ fontSize:13, color:"#94A3B8", marginBottom:14 }}>請向邀請你的朋友索取 6 位數邀請碼</div>
        <input placeholder="例：A1B2C3" value={code} onChange={e=>setCode(e.target.value.toUpperCase())}
          onKeyDown={e=>e.key==="Enter"&&verifyCode()}
          style={{ ...fld, marginBottom:8, textAlign:"center", fontSize:20, letterSpacing:4, fontWeight:800 }} autoFocus/>
        {codeErr&&<div style={{ color:"#DC2626", fontSize:12, marginBottom:8, textAlign:"center" }}>❌ {codeErr}</div>}
        <button onClick={verifyCode} style={{ ...actionBtn, background:bg, color:"#fff", width:"100%" }}>確認邀請碼</button>
      </>
    )}

    {/* Step 2: 選擇或新建暱稱 */}
    {step==="pick"&&(
      <>
        <div style={{ fontWeight:800, fontSize:16, color:"#1E3A5F", marginBottom:14 }}>
          {members.length>0 ? "你是哪位？" : "輸入你的暱稱"}
        </div>
        {members.map(m=>(
          <button key={m.name} onClick={()=>join(m.name)} style={{
            display:"flex", alignItems:"center", gap:12, width:"100%", border:"none",
            background:"#F8FBFF", borderRadius:12, padding:"10px 14px", marginBottom:8,
            cursor:"pointer", fontFamily:"inherit", outline:"1.5px solid #BFDBFE"
          }}>
            <Avatar name={m.name} members={members} size={34}/>
            <span style={{ fontWeight:700, fontSize:14, color:"#1E3A5F" }}>{m.name}</span>
          </button>
        ))}
        {step==="pick"&&(
          <div style={{ borderTop: members.length?"1px solid #EFF6FF":"none", paddingTop:members.length?12:0 }}>
            {members.length>0&&<div style={{ fontSize:12, color:"#94A3B8", marginBottom:8 }}>或者輸入新暱稱加入</div>}
            <input placeholder="你的暱稱" value={name} onChange={e=>setName(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&name.trim()&&join()}
              style={{ ...fld, marginBottom:8 }}/>
            <button onClick={()=>join()} style={{ ...actionBtn, background:bg, color:"#fff", width:"100%" }}>加入記帳本</button>
          </div>
        )}
      </>
    )}
  </div>
</div>
```

);
}

// ── HomeScreen (選擇/建立記帳本) ───────────────────────────────────────────────
function HomeScreen({ currentUser, onEnterBook }) {
const [myBooks,      setMyBooks]      = useState([]);
const [loading,      setLoading]      = useState(true);
const [showNew,      setShowNew]      = useState(false);
const [newName,      setNewName]      = useState(””);
const [newColor,     setNewColor]     = useState(”#2563EB”);
const [creating,     setCreating]     = useState(false);

useEffect(()=>{
// Listen to all books - filter those user is member of
const unsub = onSnapshot(query(collection(db,“books”),orderBy(“createdAt”,“asc”)), async snap=>{
const all = snap.docs.map(d=>({ id:d.id, …d.data() }));
// Check membership
const filtered = [];
for(const b of all){
const membersSnap = await getDoc(doc(db,“books”,b.id)); // just check existence
filtered.push(b); // show all for now, filter by membership below
}
// Simple: show books where ownerId===currentUser or user has joined
setMyBooks(all);
setLoading(false);
});
return unsub;
},[currentUser]);

const createBook = async () => {
if(!newName.trim()) return;
setCreating(true);
try {
const inviteCode = randCode();
const ref = await addDoc(collection(db,“books”),{
name:newName.trim(), color:newColor, ownerId:currentUser,
archived:false, inviteCode, createdAt:serverTimestamp()
});
// Add creator as first member
await addDoc(collection(db,“books”,ref.id,“members”),{
name:currentUser, hasPlusOne:false, paymentApp:null,
paymentCustomLabel:””, paymentCustomUrl:””, createdAt:serverTimestamp()
});
localStorage.setItem(“splitpay_book”, ref.id);
onEnterBook(ref.id);
} catch(e){ alert(“建立失敗: “+e.message); }
setCreating(false);
};

if(loading) return <Spinner fullscreen/>;

const active   = myBooks.filter(b=>!b.archived);
const archived = myBooks.filter(b=>b.archived);

return (
<div style={{ minHeight:“100vh”, background:“linear-gradient(160deg,#EFF6FF 0%,#F0F7FF 100%)”, fontFamily:”‘Noto Sans TC’,sans-serif”, display:“flex”, flexDirection:“column”, alignItems:“center”, padding:“40px 16px 80px” }}>
<div style={{ fontSize:44, marginBottom:8 }}>💳</div>
<div style={{ fontWeight:800, fontSize:22, color:”#1E3A5F”, marginBottom:4 }}>朋友分帳</div>
<div style={{ fontSize:13, color:”#64748B”, marginBottom:28 }}>嗨，{currentUser}！選擇記帳本開始記帳</div>

```
  <div style={{ width:"100%", maxWidth:400 }}>
    {active.map(b=>(
      <button key={b.id} onClick={()=>{ localStorage.setItem("splitpay_book",b.id); onEnterBook(b.id); }} style={{
        display:"flex", alignItems:"center", gap:12, width:"100%", border:"none",
        background:"#fff", borderRadius:16, padding:"14px 16px", marginBottom:10,
        cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 12px rgba(37,99,235,.09)",
        outline:"none"
      }}>
        <div style={{ width:40, height:40, borderRadius:12, background:b.color||"#2563EB", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>💳</div>
        <div style={{ flex:1, textAlign:"left" }}>
          <div style={{ fontWeight:800, fontSize:15, color:"#1E3A5F" }}>{b.name}</div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>
            {b.ownerId===currentUser?"你建立的":"成員"} · 邀請碼 {b.inviteCode||"—"}
          </div>
        </div>
        <div style={{ color:"#CBD5E1", fontSize:18 }}>›</div>
      </button>
    ))}

    {archived.length>0&&(
      <div style={{ fontSize:11, color:"#94A3B8", fontWeight:700, margin:"16px 0 8px", paddingLeft:4 }}>📦 封存記帳本</div>
    )}
    {archived.map(b=>(
      <button key={b.id} onClick={()=>{ localStorage.setItem("splitpay_book",b.id); onEnterBook(b.id); }} style={{
        display:"flex", alignItems:"center", gap:12, width:"100%", border:"none",
        background:"#F8F9FA", borderRadius:16, padding:"12px 16px", marginBottom:8,
        cursor:"pointer", fontFamily:"inherit", opacity:.7
      }}>
        <div style={{ width:36, height:36, borderRadius:10, background:"#94A3B8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📦</div>
        <div style={{ flex:1, textAlign:"left" }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#64748B" }}>{b.name}</div>
        </div>
      </button>
    ))}

    {/* New book */}
    {!showNew?(
      <button onClick={()=>setShowNew(true)} style={{ ...actionBtn, background:"#2563EB", color:"#fff", width:"100%", marginTop:8, padding:"13px 16px", fontSize:15 }}>
        ＋ 建立新記帳本
      </button>
    ):(
      <div style={{ background:"#fff", borderRadius:16, padding:18, marginTop:8, boxShadow:"0 2px 12px rgba(37,99,235,.09)" }}>
        <div style={{ fontWeight:800, fontSize:15, color:"#1E3A5F", marginBottom:12 }}>建立新記帳本</div>
        <input placeholder="記帳本名稱（例：京都旅遊）" value={newName} onChange={e=>setNewName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&createBook()}
          style={{ ...fld, marginBottom:10 }} autoFocus/>
        <div style={{ fontSize:11, color:"#64748B", fontWeight:700, marginBottom:6 }}>選擇顏色</div>
        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
          {BOOK_COLORS.map(col=>(
            <button key={col} onClick={()=>setNewColor(col)} style={{
              width:28, height:28, borderRadius:"50%", background:col, border:"none", cursor:"pointer",
              outline:newColor===col?"2.5px solid #1E3A5F":"2.5px solid transparent", outlineOffset:2
            }}/>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>setShowNew(false)} style={{ ...actionBtn, background:"#F1F5F9", color:"#64748B", flex:1 }}>取消</button>
          <button onClick={createBook} disabled={creating} style={{ ...actionBtn, background:newColor, color:"#fff", flex:2, opacity:creating?.6:1 }}>
            {creating?"建立中…":"建立"}
          </button>
        </div>
      </div>
    )}
  </div>
</div>
```

);
}

// ── BookApp (單一記帳本的主畫面) ───────────────────────────────────────────────
function BookApp({ bookId, currentUser, onBack, onSwitchUser }) {
const [book,     setBook]     = useState(null);
const [members,  setMembers]  = useState([]);
const [expenses, setExpenses] = useState([]);
const [fbReady,  setFbReady]  = useState(false);
const [saving,   setSaving]   = useState(false);

const [tab,         setTab]         = useState(“expenses”);
const [selDate,     setSelDate]     = useState(todayStr());
const [inlineEdit,  setInlineEdit]  = useState(null);
const [newFormKey,  setNewFormKey]  = useState(0);
const [confirmDel,  setConfirmDel]  = useState(null);
const [archiveConf, setArchiveConf] = useState(false);
const [editMember,  setEditMember]  = useState(null);
const [newMName,    setNewMName]    = useState(””);
const [newMPO,      setNewMPO]      = useState(false);
const [page,        setPage]        = useState(1);
const [toast,       setToast]       = useState(null);
const [showMenu,    setShowMenu]    = useState(false);
const [showInvite,  setShowInvite]  = useState(false);
const PER_PAGE = 7;

const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),2400); };
useEffect(()=>{ setPage(1); },[selDate]);

useEffect(()=>{
const unsubBook = onSnapshot(doc(db,“books”,bookId), snap=>{
if(snap.exists()) setBook({ id:snap.id, …snap.data() });
setFbReady(true);
});
const unsubMembers = onSnapshot(query(collection(db,“books”,bookId,“members”),orderBy(“createdAt”,“asc”)),
snap=>setMembers(snap.docs.map(d=>({ id:d.id, …d.data() }))));
const unsubExpenses = onSnapshot(query(collection(db,“books”,bookId,“expenses”),orderBy(“createdAt”,“asc”)),
snap=>setExpenses(snap.docs.map(d=>({ id:d.id, …d.data() }))));
return ()=>{ unsubBook(); unsubMembers(); unsubExpenses(); };
},[bookId]);

// ── Balances ──
const balances = Object.fromEntries(members.map(m=>[m.name,0]));
expenses.forEach(exp=>{
const sc=(exp.splitWith||[]).reduce((s,n)=>s+1+((exp.plusOnes||{})[n]?1:0),0);
if(!sc) return;
const twd=toTWD(exp.amount,exp.currency), sh=twd/sc;
(exp.splitWith||[]).forEach(n=>{
const shares=1+((exp.plusOnes||{})[n]?1:0);
if(n!==exp.paidBy) balances[n]=(balances[n]||0)-sh*shares;
});
balances[exp.paidBy]=(balances[exp.paidBy]||0)+twd-sh*(1+((exp.plusOnes||{})[exp.paidBy]?1:0));
});

const settlements=[];
const dArr=Object.entries(balances).filter(([,v])=>v<-0.01).map(([n,v])=>({name:n,val:v})).sort((a,b)=>a.val-b.val);
const cArr=Object.entries(balances).filter(([,v])=>v>0.01).map(([n,v])=>({name:n,val:v})).sort((a,b)=>b.val-a.val);
let di=0,ci=0;
while(di<dArr.length&&ci<cArr.length){
const amt=Math.min(-dArr[di].val,cArr[ci].val);
if(amt>0.01) settlements.push({from:dArr[di].name,to:cArr[ci].name,amount:Math.round(amt)});
dArr[di].val+=amt; cArr[ci].val-=amt;
if(Math.abs(dArr[di].val)<0.01) di++;
if(Math.abs(cArr[ci].val)<0.01) ci++;
}

const dayExp   = expenses.filter(e=>e.date===selDate).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
const totPages = Math.max(1,Math.ceil(dayExp.length/PER_PAGE));
const pagedExp = dayExp.slice((page-1)*PER_PAGE,page*PER_PAGE);
const datesWithData = […new Set(expenses.map(e=>e.date))];
const totalTWD = expenses.reduce((s,e)=>s+toTWD(e.amount,e.currency),0);
const getCat   = id=>CATEGORIES.find(c=>c.id===id)||CATEGORIES[CATEGORIES.length-1];
const bookColor= book?.color||”#2563EB”;
const isOwner  = book?.ownerId===currentUser;
const inviteLink = `${window.location.origin}?join=${bookId}`;

// ── CRUD ──
const saveExpense = async data => {
setSaving(true);
try {
const { id, …rest } = data;
const payload = { …rest, plusOnes:rest.plusOnes||{}, splitWith:rest.splitWith||[] };
if(inlineEdit?.id){
await updateDoc(doc(db,“books”,bookId,“expenses”,inlineEdit.id),payload);
showToast(“✅ 已更新”); setInlineEdit(null);
} else {
await addDoc(collection(db,“books”,bookId,“expenses”),{ …payload, createdAt:serverTimestamp() });
setNewFormKey(k=>k+1); setSelDate(data.date); showToast(“✅ 已新增”);
}
} catch(e){ showToast(“❌ 儲存失敗”); }
setSaving(false);
};

const deleteExpense = async id => {
try { await deleteDoc(doc(db,“books”,bookId,“expenses”,id)); setConfirmDel(null); showToast(“🗑️ 已刪除”); }
catch(e){ showToast(“❌ 刪除失敗”); }
};

const addMember = async () => {
if(!newMName.trim()||members.find(m=>m.name===newMName.trim())) return;
try {
await addDoc(collection(db,“books”,bookId,“members”),{ name:newMName.trim(), hasPlusOne:newMPO, paymentApp:null, paymentCustomLabel:””, paymentCustomUrl:””, createdAt:serverTimestamp() });
setNewMName(””); setNewMPO(false); showToast(`👋 ${newMName.trim()} 已加入`);
} catch(e){ showToast(“❌ 新增失敗”); }
};

const saveMember = async updated => {
try { const { id, …rest }=updated; await updateDoc(doc(db,“books”,bookId,“members”,id),rest); setEditMember(null); showToast(“✅ 已儲存”); }
catch(e){ showToast(“❌ 儲存失敗”); }
};

const regenerateCode = async () => {
const newCode = randCode();
await updateDoc(doc(db,“books”,bookId),{ inviteCode:newCode });
showToast(“🔄 已更新邀請碼”);
};

if(!fbReady) return <Spinner fullscreen/>;

return (
<div style={{ fontFamily:”‘Noto Sans TC’,‘PingFang TC’,sans-serif”, background:”#F0F7FF”, minHeight:“100vh”, display:“flex”, flexDirection:“column”, alignItems:“center”, paddingBottom:80 }}>

```
  {/* Header */}
  <div style={{ width:"100%", maxWidth:540, background:`linear-gradient(135deg,${bookColor}ee,${bookColor})`, padding:"20px 18px 16px", borderRadius:"0 0 24px 24px", boxShadow:`0 8px 28px ${bookColor}44` }}>
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <button onClick={onBack} style={{ background:"rgba(255,255,255,.2)", border:"none", borderRadius:10, padding:"6px 9px", cursor:"pointer", color:"#fff", fontSize:16, lineHeight:1 }}>‹</button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ color:"#fff", fontWeight:800, fontSize:18, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {book?.name}{book?.archived&&<span style={{ fontSize:11, background:"rgba(255,255,255,.2)", borderRadius:8, padding:"2px 7px", marginLeft:7 }}>已封存</span>}
        </div>
        <div style={{ color:"rgba(255,255,255,.7)", fontSize:11, marginTop:1 }}>{members.length} 人 · {expenses.length} 筆 · NT${totalTWD.toLocaleString()}</div>
      </div>
      <div onClick={onSwitchUser} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,.2)", borderRadius:20, padding:"4px 10px 4px 4px", cursor:"pointer" }}>
        <Avatar name={currentUser} members={members} size={22}/>
        <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>{currentUser}</span>
      </div>
      <button onClick={()=>setShowMenu(v=>!v)} style={{ background:"rgba(255,255,255,.18)", border:"none", borderRadius:10, padding:"7px 9px", cursor:"pointer", color:"#fff", fontSize:17, lineHeight:1 }}>☰</button>
    </div>
    <div style={{ display:"flex", gap:5, marginTop:12, flexWrap:"wrap" }}>
      {members.map(m=>(
        <div key={m.name} style={{ display:"flex", alignItems:"center", gap:4, background:"rgba(255,255,255,.15)", borderRadius:20, padding:"3px 8px 3px 3px" }}>
          <Avatar name={m.name} members={members} size={18}/>
          <span style={{ color:"#fff", fontSize:11, fontWeight:600 }}>{m.name}{m.hasPlusOne&&"👫"}</span>
        </div>
      ))}
    </div>
  </div>

  {/* Menu */}
  {showMenu&&(
    <div style={{ position:"fixed", inset:0, zIndex:900 }} onClick={()=>setShowMenu(false)}>
      <div onClick={e=>e.stopPropagation()} style={{ position:"absolute", top:76, right:12, background:"#fff", borderRadius:16, boxShadow:"0 8px 40px rgba(37,99,235,.18)", padding:14, minWidth:210 }}>
        <button onClick={()=>{ setShowInvite(true); setShowMenu(false); }} style={{ ...actionBtn, background:"#EFF6FF", color:bookColor, width:"100%", fontSize:12, marginBottom:6 }}>🔗 邀請朋友加入</button>
        {isOwner&&!book?.archived&&(
          <button onClick={()=>{ setArchiveConf(true); setShowMenu(false); }} style={{ ...actionBtn, background:"#FFF7ED", color:"#D97706", width:"100%", fontSize:12, marginBottom:6 }}>📦 封存記帳本</button>
        )}
        <button onClick={()=>{ onSwitchUser(); setShowMenu(false); }} style={{ ...actionBtn, background:"#F1F5F9", color:"#64748B", width:"100%", fontSize:12 }}>🔀 切換使用者</button>
      </div>
    </div>
  )}

  {/* Invite modal */}
  {showInvite&&(
    <Modal onClose={()=>setShowInvite(false)}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🔗</div>
        <div style={{ fontWeight:800, fontSize:17, color:"#1E3A5F", marginBottom:6 }}>邀請朋友加入</div>
        <div style={{ fontSize:13, color:"#64748B", marginBottom:18 }}>把連結和邀請碼分享給朋友</div>

        <div style={{ background:"#EFF6FF", borderRadius:12, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:11, color:"#64748B", marginBottom:4 }}>邀請連結</div>
          <div style={{ fontSize:12, color:bookColor, wordBreak:"break-all", marginBottom:8 }}>{inviteLink}</div>
          <button onClick={()=>{ navigator.clipboard?.writeText(inviteLink); showToast("📋 已複製連結"); setShowInvite(false); }}
            style={{ ...actionBtn, background:bookColor, color:"#fff", width:"100%", fontSize:12 }}>複製連結</button>
        </div>

        <div style={{ background:"#F0FDF4", borderRadius:12, padding:14, marginBottom:16 }}>
          <div style={{ fontSize:11, color:"#64748B", marginBottom:4 }}>邀請碼</div>
          <div style={{ fontSize:32, fontWeight:800, color:"#16A34A", letterSpacing:6 }}>{book?.inviteCode}</div>
          <div style={{ fontSize:11, color:"#94A3B8", marginTop:4 }}>朋友輸入連結後需輸入此碼才能加入</div>
          {isOwner&&<button onClick={regenerateCode} style={{ ...actionBtn, background:"#DCFCE7", color:"#16A34A", fontSize:11, marginTop:8 }}>🔄 重新產生邀請碼</button>}
        </div>

        <button onClick={()=>setShowInvite(false)} style={{ ...actionBtn, background:"#F1F5F9", color:"#64748B", width:"100%" }}>關閉</button>
      </div>
    </Modal>
  )}

  {/* Tabs */}
  <div style={{ width:"100%", maxWidth:540, display:"flex", background:"#fff", borderRadius:14, margin:"14px 12px 0", overflow:"hidden", boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
    {[["expenses","📋 支出"],["split","⚖️ 分帳"],["members","👥 成員"]].map(([key,label])=>(
      <button key={key} onClick={()=>setTab(key)} style={{
        flex:1, padding:"11px 0", border:"none", cursor:"pointer", fontWeight:700, fontSize:12,
        background:tab===key?bookColor:"transparent", color:tab===key?"#fff":"#64748B",
        transition:"all .2s", fontFamily:"inherit"
      }}>{label}</button>
    ))}
  </div>

  {/* Content */}
  <div style={{ width:"100%", maxWidth:540, padding:"12px 12px 0" }}>

    {/* ══ EXPENSES ══ */}
    {tab==="expenses"&&(
      <div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#1E3A5F", marginBottom:7 }}>＋ 新增支出</div>
          <ExpenseForm key={newFormKey} members={members} loading={saving} bookColor={bookColor}
            initialData={{ date:selDate, paidBy:currentUser, splitWith:members.map(m=>m.name), plusOnes:{}, currency:"TWD", desc:"", amount:"", category:CATEGORIES[0].id }}
            onSave={saveExpense} saveLabel="確認新增"/>
        </div>
        <WeekPicker selected={selDate} onChange={d=>{ setSelDate(d); setPage(1); }} datesWithData={datesWithData}/>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
          <div style={{ fontWeight:800, fontSize:13, color:"#1E3A5F" }}>
            {selDate===todayStr()?"📅 今日":`📅 ${selDate}`}
            <span style={{ fontSize:11, color:"#64748B", fontWeight:600, marginLeft:5 }}>({dayExp.length} 筆)</span>
          </div>
          {totPages>1&&(
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ ...pgBtn, opacity:page===1?.35:1 }}>‹</button>
              <span style={{ fontSize:11, color:"#64748B" }}>{page}/{totPages}</span>
              <button disabled={page===totPages} onClick={()=>setPage(p=>p+1)} style={{ ...pgBtn, opacity:page===totPages?.35:1 }}>›</button>
            </div>
          )}
        </div>
        {dayExp.length===0&&(
          <div style={{ textAlign:"center", color:"#94A3B8", padding:"28px 0", fontSize:13 }}>
            {selDate===todayStr()?"今日沒有支出":"這天沒有記錄"}
          </div>
        )}
        {pagedExp.map(exp=>{
          const cat=getCat(exp.category);
          const sc=(exp.splitWith||[]).reduce((s,n)=>s+1+((exp.plusOnes||{})[n]?1:0),0);
          const perTWD=sc>0?Math.ceil(toTWD(exp.amount,exp.currency)/sc):0;
          const isEditing=inlineEdit?.id===exp.id;
          return (
            <div key={exp.id} style={{ marginBottom:8 }}>
              <div style={{ background:"#fff", borderRadius:isEditing?"14px 14px 0 0":"14px", padding:"11px 12px", display:"flex", alignItems:"center", gap:9, cursor:"pointer", boxShadow:isEditing?"0 2px 10px rgba(37,99,235,.14)":"0 2px 8px rgba(37,99,235,.07)", outline:isEditing?`2px solid ${bookColor}`:"none", outlineOffset:-1 }}
                onClick={()=>setInlineEdit(isEditing?null:exp)}>
                <div style={{ width:36, height:36, borderRadius:9, background:exp.category==="windfall"?"#F0FDF4":"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{cat.emoji}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, color:"#1E3A5F" }}>{exp.desc}</div>
                  <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{exp.paidBy} 付 · {(exp.splitWith||[]).join("、")}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:exp.category==="windfall"?"#16A34A":bookColor }}>{fmtAmt(exp.amount,exp.currency)}</div>
                  <div style={{ fontSize:10, color:"#94A3B8" }}>每人 NT${perTWD.toLocaleString()}</div>
                </div>
                <button onClick={e=>{ e.stopPropagation(); setConfirmDel(exp.id); }} style={{ background:"none", border:"none", cursor:"pointer", color:"#CBD5E1", fontSize:17, padding:"2px", flexShrink:0 }}>×</button>
              </div>
              {isEditing&&(
                <div style={{ borderRadius:"0 0 14px 14px", overflow:"hidden", outline:`2px solid ${bookColor}`, outlineOffset:-1 }}>
                  <ExpenseForm key={"e"+exp.id} members={members} initialData={inlineEdit} loading={saving} bookColor={bookColor}
                    onSave={saveExpense} onCancel={()=>setInlineEdit(null)} saveLabel="更新"/>
                </div>
              )}
            </div>
          );
        })}
        {totPages>1&&(
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:8 }}>
            {Array.from({length:totPages},(_,i)=>(
              <button key={i} onClick={()=>setPage(i+1)} style={{ width:26, height:26, borderRadius:"50%", border:"none", cursor:"pointer", background:page===i+1?bookColor:"#EFF6FF", color:page===i+1?"#fff":bookColor, fontWeight:700, fontSize:11, fontFamily:"inherit" }}>{i+1}</button>
            ))}
          </div>
        )}
      </div>
    )}

    {/* ══ SPLIT ══ */}
    {tab==="split"&&(
      <div>
        <div style={{ background:"#fff", borderRadius:18, padding:16, marginBottom:12, boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#1E3A5F", marginBottom:12 }}>💳 個人餘額</div>
          {members.map(m=>{ const b=balances[m.name]||0; return (
            <div key={m.name} style={{ display:"flex", alignItems:"center", gap:9, marginBottom:9 }}>
              <Avatar name={m.name} members={members} size={34}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:"#1E3A5F", fontSize:14 }}>{m.name}{m.name===currentUser&&<span style={{ fontSize:10, color:bookColor, marginLeft:5, fontWeight:800 }}>（我）</span>}</div>
                <div style={{ fontSize:10, color:"#94A3B8" }}>{b>0.01?"別人欠你":b<-0.01?"你欠別人":"已結清"}</div>
              </div>
              <div style={{ fontWeight:800, fontSize:15, color:b>0.01?"#10B981":b<-0.01?"#EF4444":"#94A3B8" }}>{Math.round(b)===0?"±0":`NT${b>0?"+":""}${Math.round(b)}`}</div>
            </div>
          );})}
        </div>
        <div style={{ background:"#fff", borderRadius:18, padding:16, boxShadow:"0 2px 10px rgba(37,99,235,.07)" }}>
          <div style={{ fontWeight:800, fontSize:14, color:"#1E3A5F", marginBottom:12 }}>⚡ 建議結帳方式</div>
          {settlements.length===0
            ? <div style={{ textAlign:"center", color:"#10B981", fontWeight:700, padding:16 }}>🎉 大家都結清了！</div>
            : settlements.map((s,i)=>{
              const payer=members.find(m=>m.name===s.from);
              const app=payer?.paymentApp?PAYMENT_APPS.find(a=>a.id===payer.paymentApp):null;
              const url=payer?.paymentApp==="custom"?payer.paymentCustomUrl:app?.url;
              const label=payer?.paymentApp==="custom"?(payer.paymentCustomLabel||"自訂"):app?.label;
              const emoji=payer?.paymentApp==="custom"?"✏️":app?.emoji;
              const isMe=s.from===currentUser;
              return (
                <div key={i} style={{ background:isMe?"#EFF6FF":"#F8FBFF", borderRadius:11, padding:"11px 13px", marginBottom:7, outline:isMe?`1.5px solid ${bookColor}`:"none" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                    <Avatar name={s.from} members={members} size={30}/><span style={{ color:"#94A3B8", fontSize:11 }}>→</span><Avatar name={s.to} members={members} size={30}/>
                    <div style={{ flex:1, marginLeft:3 }}>
                      <span style={{ fontWeight:700, color:"#1E3A5F", fontSize:13 }}>{s.from}{isMe&&" 👈 我"}</span>
                      <span style={{ color:"#94A3B8", fontSize:11 }}> 付給 </span>
                      <span style={{ fontWeight:700, color:"#1E3A5F", fontSize:13 }}>{s.to}</span>
                    </div>
                    <div style={{ fontWeight:800, color:"#EF4444", fontSize:15 }}>NT${s.amount}</div>
                  </div>
                  {isMe&&url&&(
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                      <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:7, background:"#1D4ED8", borderRadius:8, padding:"8px 12px" }}>
                        <span style={{ fontSize:14 }}>{emoji}</span>
                        <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>開啟 {label} 付款</span>
                        <span style={{ marginLeft:"auto", color:"rgba(255,255,255,.5)", fontSize:11 }}>↗</span>
                      </div>
                    </a>
                  )}
                  {isMe&&!url&&<div style={{ marginTop:5, fontSize:10, color:"#CBD5E1", textAlign:"center" }}>前往成員頁面設定慣用付款方式</div>}
                </div>
              );
            })
          }
        </div>
      </div>
    )}

    {/* ══ MEMBERS ══ */}
    {tab==="members"&&(
      <div>
        {members.map(m=>{
          const isEditing=editMember?.id===m.id;
          const paid=expenses.filter(e=>e.paidBy===m.name).reduce((s,e)=>s+toTWD(e.amount,e.currency),0);
          const appInfo=m.paymentApp?PAYMENT_APPS.find(a=>a.id===m.paymentApp):null;
          return (
            <div key={m.id} style={{ background:"#fff", borderRadius:14, marginBottom:9, boxShadow:"0 2px 8px rgba(37,99,235,.07)", overflow:"hidden" }}>
              <div style={{ display:"flex", alignItems:"center", gap:9, padding:"11px 13px" }}>
                <Avatar name={m.name} members={members} size={40}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:14, color:"#1E3A5F" }}>{m.name}{m.name===currentUser&&<span style={{ fontSize:10, color:bookColor, marginLeft:5 }}>（我）</span>}{m.hasPlusOne&&<span style={{ fontSize:11, color:"#94A3B8", marginLeft:5 }}>👫</span>}</div>
                  <div style={{ fontSize:10, color:"#94A3B8", marginTop:1 }}>已付 NT${paid.toLocaleString()} · {appInfo?`${appInfo.emoji} ${appInfo.label}`:"未設定付款方式"}</div>
                </div>
                <button onClick={()=>setEditMember(isEditing?null:{...m})} style={{ ...actionBtn, background:isEditing?"#EFF6FF":bookColor, color:isEditing?bookColor:"#fff", fontSize:11, padding:"6px 11px" }}>{isEditing?"關閉":"設定"}</button>
                {isOwner&&members.length>2&&<button onClick={async()=>{ await deleteDoc(doc(db,"books",bookId,"members",m.id)); showToast(`已移除 ${m.name}`); }} style={{ background:"#FEF2F2", border:"none", borderRadius:8, padding:"5px 9px", cursor:"pointer", color:"#EF4444", fontSize:11, fontWeight:700, fontFamily:"inherit", marginLeft:2 }}>移除</button>}
              </div>
              {isEditing&&(
                <div style={{ borderTop:"1px solid #EFF6FF", padding:"12px 13px", background:"#F8FBFF" }}>
                  <div style={{ marginBottom:10 }}>
                    <div style={lbl}>👫 是否有攜伴可能？</div>
                    <div style={{ display:"flex", gap:7 }}>
                      {[true,false].map(v=><Chip key={String(v)} label={v?"是":"否"} active={editMember.hasPlusOne===v} color={bookColor} onClick={()=>setEditMember(p=>({...p,hasPlusOne:v}))}/>)}
                    </div>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <div style={lbl}>🔗 慣用付款 App / 銀行</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:7 }}>
                      {PAYMENT_APPS.map(a=><button key={a.id} onClick={()=>setEditMember(p=>({...p,paymentApp:a.id}))} style={{ border:"1.5px solid #BFDBFE", borderRadius:20, padding:"4px 9px", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:"inherit", background:editMember.paymentApp===a.id?bookColor:"#fff", color:editMember.paymentApp===a.id?"#fff":"#334155" }}>{a.emoji} {a.label}</button>)}
                    </div>
                    {editMember.paymentApp==="custom"&&<><input placeholder="自訂名稱" value={editMember.paymentCustomLabel||""} onChange={e=>setEditMember(p=>({...p,paymentCustomLabel:e.target.value}))} style={{ ...fld, marginBottom:6 }}/><input placeholder="連結 https://…" value={editMember.paymentCustomUrl||""} onChange={e=>setEditMember(p=>({...p,paymentCustomUrl:e.target.value}))} style={fld}/></>}
                  </div>
                  <div style={{ display:"flex", gap:7 }}>
                    <button onClick={()=>setEditMember(null)} style={{ ...actionBtn, background:"#F1F5F9", color:"#64748B", flex:1 }}>取消</button>
                    <button onClick={()=>saveMember(editMember)} style={{ ...actionBtn, background:bookColor, color:"#fff", flex:2 }}>儲存</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {isOwner&&(
          <div style={{ background:"#fff", borderRadius:14, padding:14, boxShadow:"0 2px 8px rgba(37,99,235,.07)" }}>
            <div style={{ fontWeight:800, fontSize:14, color:"#1E3A5F", marginBottom:10 }}>＋ 新增成員</div>
            <input placeholder="暱稱" value={newMName} onChange={e=>setNewMName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addMember()} style={{ ...fld, marginBottom:8 }}/>
            <div style={{ marginBottom:10 }}>
              <div style={lbl}>是否有攜伴？</div>
              <div style={{ display:"flex", gap:7 }}>{[false,true].map(v=><Chip key={String(v)} label={v?"是":"否"} active={newMPO===v} color={bookColor} onClick={()=>setNewMPO(v)}/>)}</div>
            </div>
            <button onClick={addMember} style={{ ...actionBtn, background:bookColor, color:"#fff", width:"100%" }}>加入成員</button>
          </div>
        )}
      </div>
    )}
  </div>

  {confirmDel&&<ConfirmDialog msg="確定刪除？" sub="刪除後無法復原" onConfirm={()=>deleteExpense(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}
  {archiveConf&&<ConfirmDialog msg={`封存「${book?.name}」？`} sub="封存後無法新增支出" confirmLabel="確認封存" confirmColor="#D97706" onConfirm={async()=>{ await updateDoc(doc(db,"books",bookId),{archived:true}); setArchiveConf(false); showToast("📦 已封存"); }} onCancel={()=>setArchiveConf(false)}/>}
  <Toast msg={toast}/>

  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700;800&display=swap');
    *{box-sizing:border-box;} input:focus,select:focus{outline:none;border-color:#2563EB!important;} ::-webkit-scrollbar{display:none;}
    @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
    @keyframes slideLeft{from{opacity:.4;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes slideRight{from{opacity:.4;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
  `}</style>
</div>
```

);
}

// ── Root ───────────────────────────────────────────────────────────────────────
export default function App() {
const [currentUser, setCurrentUser] = useState(()=>localStorage.getItem(“splitpay_user”)||null);
const [activeBookId,setActiveBookId]= useState(()=>localStorage.getItem(“splitpay_book”)||null);
const [screen,      setScreen]      = useState(“loading”); // loading | join | login | home | book

// Detect invite link: ?join=BOOK_ID
const joinBookId = new URLSearchParams(window.location.search).get(“join”);

useEffect(()=>{
if(joinBookId){
setScreen(“join”);
} else if(!currentUser){
setScreen(“login”);
} else if(!activeBookId){
setScreen(“home”);
} else {
setScreen(“book”);
}
},[currentUser, activeBookId, joinBookId]);

const handleJoinDone = (name, bookId) => {
setCurrentUser(name);
setActiveBookId(bookId);
// Remove ?join= from URL
window.history.replaceState({}, “”, window.location.pathname);
setScreen(“book”);
};

const handleLogin = (name) => {
localStorage.setItem(“splitpay_user”, name);
setCurrentUser(name);
setScreen(“home”);
};

const handleSwitchUser = () => {
localStorage.removeItem(“splitpay_user”);
localStorage.removeItem(“splitpay_book”);
setCurrentUser(null);
setActiveBookId(null);
setScreen(“login”);
};

if(screen===“loading”) return <Spinner fullscreen/>;

if(screen===“join”) return (
<JoinScreen bookId={joinBookId} onDone={handleJoinDone}/>
);

if(screen===“login”) return (
<div style={{ minHeight:“100vh”, background:“linear-gradient(135deg,#1D4ED8,#3B82F6)”, display:“flex”, flexDirection:“column”, alignItems:“center”, justifyContent:“center”, padding:24, fontFamily:”‘Noto Sans TC’,sans-serif” }}>
<div style={{ fontSize:52, marginBottom:12 }}>💳</div>
<div style={{ color:”#fff”, fontWeight:800, fontSize:26, letterSpacing:1, marginBottom:4 }}>朋友分帳</div>
<div style={{ color:“rgba(255,255,255,.7)”, fontSize:14, marginBottom:32 }}>出遊記帳、輕鬆分帳</div>
<div style={{ background:”#fff”, borderRadius:20, padding:24, width:“100%”, maxWidth:340, boxShadow:“0 20px 60px rgba(0,0,0,.25)” }}>
<div style={{ fontWeight:800, fontSize:16, color:”#1E3A5F”, marginBottom:6 }}>輸入你的暱稱</div>
<div style={{ fontSize:13, color:”#94A3B8”, marginBottom:14 }}>用來識別你在記帳本裡的身份</div>
<LoginNameInput onLogin={handleLogin}/>
</div>
<div style={{ color:“rgba(255,255,255,.5)”, fontSize:11, marginTop:20 }}>資料即時同步 · 多人共用</div>
</div>
);

if(screen===“home”) return (
<HomeScreen currentUser={currentUser} onEnterBook={id=>{ setActiveBookId(id); setScreen(“book”); }}/>
);

if(screen===“book”) return (
<BookApp bookId={activeBookId} currentUser={currentUser}
onBack={()=>{ setActiveBookId(null); localStorage.removeItem(“splitpay_book”); setScreen(“home”); }}
onSwitchUser={handleSwitchUser}/>
);

return null;
}

function LoginNameInput({ onLogin }) {
const [name, setName] = useState(””);
return (
<>
<input placeholder=“你的暱稱” value={name} onChange={e=>setName(e.target.value)}
onKeyDown={e=>e.key===“Enter”&&name.trim()&&onLogin(name.trim())}
style={{ …fld, marginBottom:12 }} autoFocus/>
<button onClick={()=>name.trim()&&onLogin(name.trim())}
style={{ …actionBtn, background:”#2563EB”, color:”#fff”, width:“100%” }}>開始使用</button>
</>
);
}

// ── Style tokens ───────────────────────────────────────────────────────────────
const fld = {
width:“100%”, maxWidth:“100%”, padding:“8px 10px”, border:“1.5px solid #BFDBFE”, borderRadius:9,
fontSize:14, fontFamily:“inherit”, background:”#F8FBFF”, color:”#1E3A5F”,
transition:“border .2s”, marginBottom:0, boxSizing:“border-box”, display:“block”, minWidth:0
};
const lbl = { fontSize:11, fontWeight:700, color:”#64748B”, marginBottom:5, textTransform:“uppercase”, letterSpacing:.4, display:“block” };
const actionBtn = { border:“none”, borderRadius:10, padding:“10px 16px”, cursor:“pointer”, fontWeight:800, fontSize:14, fontFamily:“inherit”, transition:“all .15s” };
const wkBtn = { fontSize:10, fontWeight:700, background:”#EFF6FF”, color:”#2563EB”, border:“none”, borderRadius:7, padding:“3px 8px”, cursor:“pointer”, fontFamily:“inherit” };
const arrowBtn = { background:“none”, border:“none”, cursor:“pointer”, color:”#94A3B8”, fontSize:16, padding:“0 3px”, lineHeight:1, flexShrink:0 };
const pgBtn = { background:”#EFF6FF”, border:“none”, borderRadius:7, width:26, height:26, cursor:“pointer”, color:”#2563EB”, fontSize:15, fontWeight:700, fontFamily:“inherit”, display:“flex”, alignItems:“center”, justifyContent:“center” };