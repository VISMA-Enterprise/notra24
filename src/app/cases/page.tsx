"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const S={bg:"#0A0A0F",surface:"#12131A",border:"#1E2030",red:"#FF3B3B",green:"#00E676",orange:"#FF9100",yellow:"#FFD600",cyan:"#00E5FF",muted:"#6B7280"};
const STATUS_STYLES:Record<string,{bg:string;color:string;label:string}>={open:{bg:"rgba(255,59,59,0.15)",color:S.red,label:"OFFEN"},in_progress:{bg:"rgba(0,229,255,0.15)",color:S.cyan,label:"IN BEARB."},resolved:{bg:"rgba(0,230,118,0.15)",color:S.green,label:"GELÖST"},false_alarm:{bg:"rgba(255,214,0,0.15)",color:S.yellow,label:"FALSCHALARM"}};
const TYPE_COLORS:Record<string,string>={sos:S.red,fall:S.orange,low_battery:S.yellow,device_offline:S.muted,smoke:S.red,co:S.red};

function fmt(d:string){return new Date(d).toLocaleString("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
function dur(s:number|null){if(!s)return"—";const m=Math.floor(s/60),sec=s%60;return`${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`}

export default function CasesPage(){
  const{operator,authFetch,logout,loading}=useAuth();const router=useRouter();
  const[cases,setCases]=useState<any[]>([]);const[pagination,setPagination]=useState({page:1,total:0,totalPages:0});
  const[filterStatus,setFilterStatus]=useState("");const[filterType,setFilterType]=useState("");
  useEffect(()=>{if(!loading&&!operator)router.push("/")},[operator,loading]);
  useEffect(()=>{load()},[filterStatus,filterType,pagination.page]);
  const load=async()=>{try{const p=new URLSearchParams({page:String(pagination.page),limit:"10"});if(filterStatus)p.set("status",filterStatus);if(filterType)p.set("alertType",filterType);const r=await authFetch(`/api/cases?${p}`);if(r.success){setCases(r.data);setPagination(r.pagination)}}catch{}};
  const exportCSV=()=>{const h="CASE ID,ZEIT,PATIENT,TYP,STATUS,OPERATOR,DAUER\n";const rows=cases.map(c=>`"${c.id.slice(0,8)}","${fmt(c.createdAt)}","${c.customerFirstName} ${c.customerLastName}","${c.alertType}","${c.status}","${c.operatorName||"—"}","${dur(c.durationSeconds)}"`).join("\n");const b=new Blob([h+rows],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=`vorfaelle-${new Date().toISOString().slice(0,10)}.csv`;a.click()};
  if(loading||!operator)return null;
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:S.bg}}>
      {/* TopBar inline */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:48,paddingInline:20,background:S.surface,borderBottom:`1px solid ${S.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={S.red} strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke={S.red} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={S.red}/></svg><span style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:1}}>NOTRUF24 LEITSTELLE</span></div>
          <div style={{display:"flex",gap:4}}>{[{k:"dashboard",l:"Dashboard"},{k:"customers",l:"Kunden"},{k:"cases",l:"Vorfälle"},{k:"status",l:"System"}].map(n=><a key={n.k} href={n.k==="dashboard"?"/dashboard":`/${n.k}`} style={{padding:"6px 16px",fontSize:13,color:n.k==="cases"?"#fff":S.muted,textDecoration:"none",borderRadius:6,border:n.k==="cases"?`1px solid ${S.red}`:"1px solid transparent",background:n.k==="cases"?"rgba(255,59,59,0.08)":"transparent",fontWeight:n.k==="cases"?700:400}}>{n.l}</a>)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:S.green}}/><span style={{fontSize:12,color:S.green}}>ALLE SYSTEME OK</span></div></div>
      </div>
      <div style={{flex:1,padding:"24px 32px",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}><h1 style={{fontSize:24,fontWeight:700,color:"#fff"}}>Vorfälle</h1><span style={{fontSize:13,color:S.muted}}>{pagination.total} Einträge</span></div>
          <div style={{display:"flex",gap:8}}>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fff",outline:"none"}}><option value="">Typ: Alle</option><option value="sos">SOS</option><option value="fall">Sturz</option><option value="low_battery">Batterie</option></select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 12px",fontSize:12,color:"#fff",outline:"none"}}><option value="">Status: Alle</option><option value="open">Offen</option><option value="in_progress">In Bearb.</option><option value="resolved">Gelöst</option><option value="false_alarm">Falschalarm</option></select>
            <button onClick={exportCSV} style={{padding:"8px 16px",borderRadius:8,background:S.surface,border:`1px solid ${S.border}`,color:S.muted,fontSize:12,cursor:"pointer"}}>CSV Export</button>
          </div>
        </div>
        <div style={{borderRadius:12,border:`1px solid ${S.border}`,overflow:"hidden"}}>
          <div style={{display:"flex",padding:"12px 20px",background:S.surface,borderBottom:`1px solid ${S.border}`}}>
            <span style={{width:80,fontSize:11,color:S.muted}}>CASE ID</span>
            <span style={{width:140,fontSize:11,color:S.muted}}>ZEIT</span>
            <span style={{flex:2,fontSize:11,color:S.muted}}>PATIENT</span>
            <span style={{flex:1,fontSize:11,color:S.muted}}>TYP</span>
            <span style={{width:60,fontSize:11,color:S.muted}}>QUELLE</span>
            <span style={{width:100,fontSize:11,color:S.muted}}>STATUS</span>
            <span style={{flex:1,fontSize:11,color:S.muted}}>OPERATOR</span>
            <span style={{width:80,fontSize:11,color:S.muted}}>DAUER</span>
          </div>
          {cases.map(c=>{const st=STATUS_STYLES[c.status]||STATUS_STYLES.open;return(
            <div key={c.id} style={{display:"flex",alignItems:"center",padding:"12px 20px",borderBottom:`1px solid ${S.border}`}}>
              <span style={{width:80,fontSize:13,color:S.cyan,fontWeight:600}}>#{c.id?.slice(0,4)}</span>
              <span style={{width:140,fontSize:12,color:S.muted,fontFamily:"Inter,monospace"}}>{fmt(c.createdAt)}</span>
              <span style={{flex:2,fontSize:14,fontWeight:600,color:"#fff"}}>{c.customerFirstName} {c.customerLastName}</span>
              <span style={{flex:1,display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:TYPE_COLORS[c.alertType]||S.muted}}/><span style={{fontSize:13,color:TYPE_COLORS[c.alertType]||S.muted}}>{c.alertType==="sos"?"SOS Knopf":c.alertType==="fall"?"Sturz erkannt":c.alertType==="low_battery"?"Batterie schwach":c.alertType}</span></span>
              <span style={{width:60,fontSize:12,color:S.muted}}>{c.alertSource==="hub"?"Hub":"Mobile"}</span>
              <span style={{width:100}}><span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:4,background:st.bg,color:st.color}}>{st.label}</span></span>
              <span style={{flex:1,fontSize:13,color:S.muted}}>{c.operatorName||"—"}</span>
              <span style={{width:80,fontSize:13,color:c.status==="open"?S.red:S.muted,fontFamily:"Inter,monospace"}}>{c.durationSeconds?dur(c.durationSeconds):c.status==="open"?"aktiv":"—"}</span>
            </div>
          )})}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
          <span style={{fontSize:12,color:S.muted}}>Seite {pagination.page} von {pagination.totalPages}</span>
          {pagination.totalPages>1&&<div style={{display:"flex",gap:4}}>{Array.from({length:Math.min(pagination.totalPages,5)},(_, i)=><button key={i} onClick={()=>setPagination(p=>({...p,page:i+1}))} style={{width:32,height:32,borderRadius:8,background:pagination.page===i+1?S.red:S.surface,border:`1px solid ${pagination.page===i+1?S.red:S.border}`,color:"#fff",fontSize:12,cursor:"pointer"}}>{i+1}</button>)}</div>}
        </div>
      </div>
    </div>
  );
}
