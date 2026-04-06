"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const S={bg:"#0A0A0F",surface:"#12131A",border:"#1E2030",red:"#FF3B3B",green:"#00E676",orange:"#FF9100",muted:"#6B7280"};

export default function StatusPage(){
  const{operator,authFetch,logout,loading}=useAuth();const router=useRouter();
  const[status,setStatus]=useState<any>(null);const[devices,setDevices]=useState<any[]>([]);
  useEffect(()=>{if(!loading&&!operator)router.push("/")},[operator,loading]);
  useEffect(()=>{load();const i=setInterval(load,30000);return()=>clearInterval(i)},[]);
  const load=async()=>{try{const[s,d]=await Promise.all([authFetch("/api/status"),authFetch("/api/status/devices")]);if(s.success)setStatus(s.data);if(d.success)setDevices(d.data)}catch{}};
  if(loading||!operator||!status)return null;
  const comp=status.components||{};
  const online=devices.filter(d=>d.hub?.status==="online"||d.mobile?.status==="online").length;
  const offline=devices.filter(d=>d.hub?.status==="offline").length;
  const lowBat=devices.filter(d=>(d.hub?.battery||100)<30||(d.mobile?.battery||100)<30).length;
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:S.bg}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:48,paddingInline:20,background:S.surface,borderBottom:`1px solid ${S.border}`,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={S.red} strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke={S.red} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={S.red}/></svg><span style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:1}}>NOTRUF24 LEITSTELLE</span></div>
          <div style={{display:"flex",gap:4}}>{[{k:"dashboard",l:"Dashboard"},{k:"customers",l:"Kunden"},{k:"cases",l:"Vorfälle"},{k:"status",l:"System"}].map(n=><a key={n.k} href={n.k==="dashboard"?"/dashboard":`/${n.k}`} style={{padding:"6px 16px",fontSize:13,color:n.k==="status"?"#fff":S.muted,textDecoration:"none",borderRadius:6,border:n.k==="status"?`1px solid ${S.red}`:"1px solid transparent",background:n.k==="status"?"rgba(255,59,59,0.08)":"transparent",fontWeight:n.k==="status"?700:400}}>{n.l}</a>)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:S.green}}/><span style={{fontSize:12,color:S.green}}>ALLE SYSTEME OK</span></div></div>
      </div>
      <div style={{flex:1,padding:"24px 32px",overflowY:"auto"}}>
        <h1 style={{fontSize:24,fontWeight:700,color:"#fff",marginBottom:24}}>Systemstatus</h1>
        {/* Service Cards */}
        <div style={{display:"flex",gap:16,marginBottom:32}}>
          {[
            {name:"Alarm Receiver",stats:[["Port","TCP/5001"],["Events heute","—"],["Queue","0 pending"]],s:comp.alarm_receiver},
            {name:"FreePBX",stats:[["SIP Trunk","—"],["Extensions","101, 102, 103"],["Anrufe heute","—"]],s:comp.freepbx},
            {name:"n8n",stats:[["Webhook","/webhook/alarm"],["Workflows aktiv","—"],["Executions heute","—"]],s:comp.n8n||{status:"unknown"}},
            {name:"PostgreSQL",stats:[["Version","16.x"],["Connections","—"],["Cases total",String(status.cases?.open+status.cases?.in_progress||0)]],s:comp.database},
          ].map(svc=>(
            <div key={svc.name} style={{flex:1,padding:20,borderRadius:12,background:S.surface,border:`1px solid ${S.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <span style={{fontSize:15,fontWeight:700,color:"#fff"}}>{svc.name}</span>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:4,background:svc.s?.status==="online"?"rgba(0,230,118,0.15)":"rgba(255,59,59,0.15)",color:svc.s?.status==="online"?S.green:S.red}}>{svc.s?.status==="online"?"ONLINE":svc.s?.status?.toUpperCase()||"UNKNOWN"}</span>
              </div>
              {svc.stats.map(([k,v])=><div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:S.muted}}>{k}</span><span style={{fontSize:12,color:"#fff",fontWeight:500}}>{v}</span></div>)}
            </div>
          ))}
        </div>
        {/* Device Overview */}
        <h2 style={{fontSize:16,fontWeight:700,color:"#fff",marginBottom:16}}>Geräteübersicht</h2>
        <div style={{display:"flex",gap:16,marginBottom:32}}>
          {[
            {label:"Online",value:online,color:S.green,sub:`Hub: ${online} | Mobile: ${online}`},
            {label:"Offline",value:offline,color:S.red,sub:offline>0?"Geräte prüfen":"—"},
            {label:"Batterie schwach",value:lowBat,color:S.orange,sub:lowBat>0?"Laden empfohlen":"—"},
            {label:"Gesamt registriert",value:devices.length,color:"#fff",sub:`Hub: ${devices.length} | Mobile: ${devices.length}`},
          ].map(d=>(
            <div key={d.label} style={{flex:1,padding:20,borderRadius:12,background:S.surface,border:`1px solid ${S.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color}}/><span style={{fontSize:13,fontWeight:600,color:d.color}}>{d.label}</span></div>
              <span style={{fontSize:40,fontWeight:800,color:d.color}}>{d.value}</span>
              <p style={{fontSize:12,color:S.muted,marginTop:8}}>{d.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
