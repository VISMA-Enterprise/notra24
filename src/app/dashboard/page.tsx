"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useRouter } from "next/navigation";

const S = { bg: "#0A0A0F", surface: "#12131A", border: "#1E2030", red: "#FF3B3B", green: "#00E676", orange: "#FF9100", yellow: "#FFD600", cyan: "#00E5FF", text: "#E8EAED", muted: "#6B7280" };

const ALERT_LABELS: Record<string,string> = { sos:"SOS — KNOPF GEDRÜCKT", fall:"STURZ ERKANNT", low_battery:"BATTERIE SCHWACH", device_offline:"GERÄT OFFLINE", power_failure:"STROMAUSFALL", door_open:"TÜR GEÖFFNET", smoke:"RAUCHMELDER", co:"CO-MELDER" };
const ALERT_COLORS: Record<string,string> = { sos:S.red, fall:S.orange, low_battery:S.yellow, device_offline:S.muted, power_failure:S.orange, door_open:S.yellow, smoke:S.red, co:S.red };
const BUNDLE_COLORS: Record<string,string> = { safe_life:"#FF3B3B", safe_home:"#00E676", safe_home_plus:"#00E5FF" };

function elapsed(d:string){const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;if(s<3600)return`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;return`${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;}
function timeAgo(d:string){const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return`vor ${s}s`;if(s<3600)return`vor ${Math.floor(s/60)}m`;return`vor ${Math.floor(s/3600)}h`;}

function TopBar({active,operator,logout}:{active:string;operator:any;logout:()=>void}) {
  const [time,setTime]=useState(new Date());
  useEffect(()=>{const i=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(i)},[]);
  const nav=[{k:"dashboard",l:"Dashboard"},{k:"customers",l:"Kunden"},{k:"cases",l:"Vorfälle"},{k:"status",l:"System"}];
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:48,paddingInline:20,background:S.surface,borderBottom:`1px solid ${S.border}`,flexShrink:0}}>
      <div style={{display:"flex",alignItems:"center",gap:20}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={S.red} strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke={S.red} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={S.red}/></svg>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:1}}>NOTRUF24 LEITSTELLE</span>
        </div>
        <div style={{display:"flex",gap:4}}>
          {nav.map(n=><a key={n.k} href={n.k==="dashboard"?"/dashboard":`/${n.k}`} style={{padding:"6px 16px",fontSize:13,color:active===n.k?"#fff":S.muted,textDecoration:"none",borderRadius:6,border:active===n.k?`1px solid ${S.red}`:"1px solid transparent",background:active===n.k?"rgba(255,59,59,0.08)":"transparent",fontWeight:active===n.k?700:400}}>{n.l}</a>)}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:S.green}}/><span style={{fontSize:12,color:S.green}}>ALLE SYSTEME OK</span></div>
        <span style={{fontSize:12,color:S.muted}}>{time.toLocaleDateString("de-DE")} <strong style={{color:"#fff"}}>{time.toLocaleTimeString("de-DE")}</strong></span>
        {operator&&<div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={logout}>
          <div style={{width:28,height:28,borderRadius:"50%",background:S.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{operator.name?.split(" ").map((n:string)=>n[0]).join("")}</div>
          <span style={{fontSize:12,color:S.muted}}>{operator.name}</span>
        </div>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const {operator,authFetch,logout,loading}=useAuth();
  const {lastMessage,initAudio}=useWebSocket();
  const router=useRouter();
  const [cases,setCases]=useState<any[]>([]);
  const [activeCase,setActiveCase]=useState<any>(null);
  const [devices,setDevices]=useState<any[]>([]);
  const [notes,setNotes]=useState("");
  const [showOverlay,setShowOverlay]=useState(false);
  const [overlayData,setOverlayData]=useState<any>(null);
  const [,setTick]=useState(0);

  useEffect(()=>{if(loading)return;if(!operator){router.push("/");return;}loadCases();loadDevices();const i=setInterval(()=>{loadDevices();setTick(t=>t+1)},30000);return()=>clearInterval(i)},[operator,loading]);
  useEffect(()=>{if(!lastMessage)return;if(lastMessage.type==="alarm"){loadCases();if(["sos","fall"].includes(lastMessage.case?.alertType)){setOverlayData(lastMessage);setShowOverlay(true);}}if(lastMessage.type==="case_updated")loadCases();if(lastMessage.type==="device_status")loadDevices();},[lastMessage]);
  // Timer tick
  useEffect(()=>{const i=setInterval(()=>setTick(t=>t+1),1000);return()=>clearInterval(i)},[]);
  // Auto-save notes
  useEffect(()=>{if(!activeCase||notes===(activeCase.notes||""))return;const t=setTimeout(()=>updateCase({notes}),5000);return()=>clearTimeout(t)},[notes]);

  const loadCases=async()=>{try{const r=await authFetch("/api/cases?status=open&limit=50");if(r.success)setCases(r.data)}catch{}};
  const loadDevices=async()=>{try{const r=await authFetch("/api/status/devices");if(r.success)setDevices(r.data)}catch{}};
  const loadDetail=async(c:any)=>{try{const r=await authFetch(`/api/cases/${c.id}`);if(r.success){setActiveCase(r.data);setNotes(r.data.notes||"")}}catch{}};
  const updateCase=async(u:any)=>{if(!activeCase)return;try{const r=await authFetch(`/api/cases/${activeCase.id}`,{method:"PUT",body:JSON.stringify(u)});if(r.success){setActiveCase(r.data);loadCases()}}catch{}};
  const callCustomer=async()=>{if(!activeCase?.customer)return;try{await authFetch("/api/call/customer",{method:"POST",body:JSON.stringify({phone:activeCase.customer.phoneMobile,caseId:activeCase.id})})}catch{}};

  if(loading||!operator)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:S.bg}}><span style={{color:S.muted}}>Laden...</span></div>;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:S.bg}} onClick={initAudio}>
      {/* SOS Overlay */}
      {showOverlay&&overlayData&&(
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(10,10,15,0.85)",backdropFilter:"blur(8px)"}}>
          <div className="screen-pulse" style={{maxWidth:520,width:"100%",padding:48,borderRadius:20,background:S.surface,border:"2px solid rgba(255,59,59,0.3)",textAlign:"center"}}>
            <div style={{display:"inline-flex",padding:"8px 24px",borderRadius:20,background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.3)",color:S.green,fontSize:12,fontWeight:700,letterSpacing:1,marginBottom:24}}>EINGEHENDER ANRUF VOM GERÄT</div>
            <div style={{margin:"0 auto 16px",width:56,height:56,borderRadius:"50%",border:`2px solid ${S.red}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={S.red} strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke={S.red} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={S.red}/></svg>
            </div>
            <h2 style={{fontSize:32,fontWeight:800,color:S.red,letterSpacing:4,marginBottom:8}}>SOS ALARM</h2>
            <p style={{fontSize:12,color:S.muted,letterSpacing:2,marginBottom:32}}>KNOPF GEDRÜCKT — HUB RUFT AN</p>
            <div style={{background:"#000",borderRadius:12,padding:24,marginBottom:24}}>
              <p style={{fontSize:20,fontWeight:700,color:"#fff"}}>{overlayData.customer?.firstName} {overlayData.customer?.lastName}</p>
              <p style={{fontSize:13,color:S.muted,marginTop:4}}>{overlayData.customer?.address}</p>
              <div style={{display:"flex",justifyContent:"center",gap:16,marginTop:12}}>
                <span style={{fontSize:12,color:S.red,fontWeight:700}}>{overlayData.customer?.bundle?.replace("_"," ").toUpperCase()}</span>
                {overlayData.customer?.medicalNotes&&<span style={{fontSize:12,color:S.orange}}>{overlayData.customer.medicalNotes}</span>}
              </div>
            </div>
            <button onClick={()=>{setShowOverlay(false);if(overlayData.case)loadDetail(overlayData.case);updateCase({status:"in_progress"})}} style={{width:"100%",padding:16,borderRadius:12,background:S.green,color:"#000",fontSize:16,fontWeight:800,border:"none",cursor:"pointer",letterSpacing:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#000" strokeWidth="2"/></svg>
              ANRUF ANNEHMEN
            </button>
            <p style={{fontSize:11,color:S.muted,marginTop:12}}>Freisprechen via Hub-Lautsprecher im Raum des Patienten</p>
          </div>
        </div>
      )}

      <TopBar active="dashboard" operator={operator} logout={logout}/>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Left: Alerts */}
        <div style={{width:320,borderRight:`1px solid ${S.border}`,overflowY:"auto",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 18px"}}>
            <span style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:1}}>AKTIVE ALARME</span>
            {cases.length>0&&<div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:6,height:6,borderRadius:"50%",background:S.red}}/><span style={{fontSize:12,fontWeight:700,color:S.red}}>{cases.length}</span></div>}
          </div>
          {cases.map(c=>{const col=ALERT_COLORS[c.alertType]||S.muted;return(
            <div key={c.id} onClick={()=>loadDetail(c)} style={{padding:"14px 18px",borderLeft:`3px solid ${col}`,borderBottom:`1px solid ${S.border}`,cursor:"pointer",background:activeCase?.id===c.id?"rgba(255,59,59,0.05)":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:700,color:col,letterSpacing:0.5}}>{ALERT_LABELS[c.alertType]||c.alertType.toUpperCase()}</span>
                <span style={{fontSize:11,color:S.muted,fontFamily:"'Inter',monospace"}}>{elapsed(c.createdAt)}</span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:"#fff",marginBottom:4}}>{c.customerFirstName} {c.customerLastName}</div>
              <div style={{fontSize:12,color:S.muted,marginBottom:8}}>{c.customerAddress||""}</div>
              <div style={{display:"flex",gap:6}}>
                {c.bundle&&<span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:"rgba(255,255,255,0.06)",color:BUNDLE_COLORS[c.bundle]||"#fff"}}>{c.bundle.replace(/_/g," ").toUpperCase()}</span>}
                <span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:c.status==="open"?"rgba(255,59,59,0.15)":"rgba(255,145,0,0.15)",color:c.status==="open"?S.red:S.orange}}>{c.status==="open"?"OFFEN":"IN BEARBEITUNG"}</span>
              </div>
            </div>
          )})}
          {cases.length===0&&<p style={{padding:20,textAlign:"center",fontSize:13,color:S.muted}}>Keine aktiven Alarme</p>}
        </div>

        {/* Middle: Case Detail */}
        <div style={{flex:1,overflowY:"auto",borderRight:`1px solid ${S.border}`}}>
          {activeCase?(
            <div>
              {/* Case Header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 20px",borderBottom:`1px solid ${S.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:S.red}}/><span style={{fontSize:12,color:S.muted}}>AKTIVER VORFALL</span><span style={{fontSize:12,color:S.cyan}}>#{activeCase.id?.slice(0,8)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:12,color:S.muted}}>TIMER:</span><span style={{fontSize:16,fontWeight:800,color:S.red,fontFamily:"'Inter',monospace"}}>{elapsed(activeCase.createdAt)}</span></div>
              </div>
              {/* Alert Banner */}
              <div style={{margin:"12px 20px",padding:"12px",borderRadius:8,background:"rgba(255,59,59,0.1)",textAlign:"center"}}><span style={{fontSize:14,fontWeight:800,color:S.red,letterSpacing:2}}>{ALERT_LABELS[activeCase.alertType]||activeCase.alertType?.toUpperCase()}</span></div>
              {/* Patient Info */}
              <div style={{padding:"16px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <p style={{fontSize:11,color:S.muted,marginBottom:4}}>PATIENT</p>
                    <p style={{fontSize:22,fontWeight:700,color:"#fff"}}>{activeCase.customer?.firstName} {activeCase.customer?.lastName}</p>
                    <p style={{fontSize:11,color:S.muted,marginTop:8}}>ADRESSE</p>
                    <p style={{fontSize:14,color:"#fff"}}>{activeCase.customer?.address}</p>
                    {activeCase.customer?.floor&&<p style={{fontSize:13,color:S.muted}}>Kat:{activeCase.customer.floor} — {activeCase.customer.district}, {activeCase.customer.city}</p>}
                    {activeCase.customer?.medicalNotes&&<><p style={{fontSize:11,color:S.muted,marginTop:8}}>MEDIZINISCHE HINWEISE</p><p style={{fontSize:13,color:S.orange}}>{activeCase.customer.medicalNotes}</p></>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    {activeCase.customer?.phoneHome&&<><p style={{fontSize:11,color:S.muted}}>FESTNETZ</p><p style={{fontSize:14,color:S.green,cursor:"pointer"}}>{activeCase.customer.phoneHome}</p></>}
                    <p style={{fontSize:11,color:S.muted,marginTop:8}}>MOBIL</p>
                    <p style={{fontSize:14,color:S.green,cursor:"pointer"}}>{activeCase.customer?.phoneMobile}</p>
                    <p style={{fontSize:11,color:S.muted,marginTop:8}}>BUNDLE</p>
                    <p style={{fontSize:14,fontWeight:700,color:BUNDLE_COLORS[activeCase.customer?.bundle]||"#fff"}}>{activeCase.customer?.bundle?.replace(/_/g," ").toUpperCase()}</p>
                    <p style={{fontSize:11,color:S.muted,marginTop:8}}>SPRACHE</p>
                    <p style={{fontSize:14,color:"#fff"}}>{activeCase.customer?.language==="de"?"Deutsch":activeCase.customer?.language==="tr"?"Türkçe":activeCase.customer?.language==="en"?"English":"Русский"}</p>
                  </div>
                </div>
              </div>
              {/* Emergency Contacts */}
              {activeCase.contacts?.length>0&&(
                <div style={{padding:"12px 20px",borderTop:`1px solid ${S.border}`}}>
                  <p style={{fontSize:11,color:S.muted,letterSpacing:1,marginBottom:12}}>NOTFALLKONTAKTE</p>
                  {activeCase.contacts.map((c:any)=>(
                    <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",borderRadius:8,border:`1px solid ${S.border}`,marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:12}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:S.red,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{c.priority}</div>
                        <div><span style={{fontSize:14,fontWeight:600,color:"#fff"}}>{c.name}</span>{c.relationship&&<span style={{fontSize:12,color:S.muted}}> ({c.relationship})</span>}<span style={{fontSize:12,color:S.muted,marginLeft:8}}>{c.phone}</span></div>
                      </div>
                      <button onClick={()=>authFetch("/api/call/contact",{method:"POST",body:JSON.stringify({phone:c.phone,contactName:c.name,caseId:activeCase.id})})} style={{padding:"6px 16px",borderRadius:6,background:"rgba(0,230,118,0.1)",border:"1px solid rgba(0,230,118,0.3)",color:S.green,fontSize:12,fontWeight:600,cursor:"pointer"}}>Anrufen</button>
                    </div>
                  ))}
                </div>
              )}
              {/* Action Buttons */}
              <div style={{padding:"12px 20px",borderTop:`1px solid ${S.border}`}}>
                <p style={{fontSize:11,color:S.muted,letterSpacing:1,marginBottom:8}}>PATIENT REAGIERT NICHT? MANUELL ANRUFEN:</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={callCustomer} style={{flex:1,padding:"8px",borderRadius:6,background:S.surface,border:`1px solid ${S.border}`,color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="#fff" strokeWidth="2"/></svg>
                    Mobil
                  </button>
                  <button style={{padding:"8px 16px",borderRadius:6,background:S.surface,border:`1px solid ${S.border}`,color:"#fff",fontSize:12,cursor:"pointer"}}>Festnetz</button>
                  <button onClick={()=>updateCase({notes:(notes?notes+"\n":"")+"✓ 112 informiert"})} style={{padding:"8px 16px",borderRadius:6,background:S.surface,border:`1px solid ${S.border}`,color:"#fff",fontSize:12,cursor:"pointer"}}>112 informiert</button>
                  <button onClick={()=>updateCase({status:"false_alarm",resolutionNote:"Fehlalarm"})} style={{padding:"8px 16px",borderRadius:6,background:"rgba(255,59,59,0.1)",border:`1px solid rgba(255,59,59,0.3)`,color:S.red,fontSize:12,fontWeight:600,cursor:"pointer"}}>Falschalarm</button>
                </div>
              </div>
              {/* Notes */}
              <div style={{padding:"12px 20px",borderTop:`1px solid ${S.border}`}}>
                <p style={{fontSize:11,color:S.muted,letterSpacing:1,marginBottom:8}}>NOTIZEN</p>
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} style={{width:"100%",minHeight:150,background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:12,fontSize:13,color:"#fff",outline:"none",resize:"vertical",fontFamily:"Inter"}} placeholder="Notizen zum Vorfall..."/>
              </div>
            </div>
          ):(
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%"}}><span style={{color:S.muted}}>Alarm auswählen oder auf neuen Alarm warten</span></div>
          )}
        </div>

        {/* Right: Map + Devices */}
        <div style={{width:380,overflowY:"auto",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${S.border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:1}}>STANDORT</span>
            {activeCase?.gpsLat&&<span style={{fontSize:11,color:S.muted}}>{activeCase.gpsLat}°N, {activeCase.gpsLng}°E</span>}
          </div>
          <div style={{height:240,background:S.surface,display:"flex",alignItems:"center",justifyContent:"center",borderBottom:`1px solid ${S.border}`}}>
            {activeCase?.gpsLat?<iframe style={{width:"100%",height:"100%",border:0}} src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeCase.gpsLng-0.01}%2C${activeCase.gpsLat-0.01}%2C${Number(activeCase.gpsLng)+0.01}%2C${Number(activeCase.gpsLat)+0.01}&layer=mapnik&marker=${activeCase.gpsLat}%2C${activeCase.gpsLng}`}/>:<span style={{color:S.muted,fontSize:12}}>Kein GPS</span>}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",padding:"12px 16px",borderBottom:`1px solid ${S.border}`}}>
            <span style={{fontSize:12,fontWeight:700,color:S.muted,letterSpacing:1}}>GERÄTESTATUS</span>
            <span style={{fontSize:11}}><span style={{color:S.green}}>{devices.filter(d=>d.hub?.status==="online"||d.mobile?.status==="online").length} online</span><span style={{color:S.muted}}> | </span><span style={{color:S.red}}>{devices.filter(d=>d.hub?.status==="offline").length} offline</span></span>
          </div>
          <div style={{padding:"0 16px"}}>
            <div style={{display:"flex",padding:"8px 0",borderBottom:`1px solid ${S.border}`}}>
              <span style={{flex:2,fontSize:11,color:S.muted}}>KUNDE</span>
              <span style={{width:48,fontSize:11,color:S.muted,textAlign:"center"}}>HUB</span>
              <span style={{width:48,fontSize:11,color:S.muted,textAlign:"center"}}>BAND</span>
              <span style={{width:48,fontSize:11,color:S.muted,textAlign:"center"}}>AKKU</span>
              <span style={{flex:1,fontSize:11,color:S.muted,textAlign:"right"}}>ZULETZT</span>
            </div>
            {devices.map(d=>(
              <div key={d.customerId} style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${S.border}`}}>
                <span style={{flex:2,fontSize:12,color:activeCase?.customer?.id===d.customerId?S.cyan:"#fff"}}>{d.customerName?.split(" ").map((n:string,i:number)=>i===0?n[0]+".":n).join(" ")}</span>
                <span style={{width:48,textAlign:"center"}}>{d.hub?<><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:d.hub.status==="online"?S.green:S.red}}/> <span style={{fontSize:11,color:d.hub.status==="online"?S.green:S.red}}>{d.hub.status==="online"?"ON":"OFF"}</span></>:"—"}</span>
                <span style={{width:48,textAlign:"center"}}>{d.mobile?<><span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:d.mobile.status==="online"?S.green:d.mobile.status==="low_battery"?S.orange:S.red}}/> <span style={{fontSize:11,color:d.mobile.status==="online"?S.green:S.orange}}>ON</span></>:"—"}</span>
                <span style={{width:48,textAlign:"center",fontSize:12,color:(d.mobile?.battery||d.hub?.battery||0)<30?S.red:S.green,fontWeight:600}}>{d.mobile?.battery||d.hub?.battery||"—"}%</span>
                <span style={{flex:1,textAlign:"right",fontSize:11,color:S.muted}}>{d.hub?.lastSeen?timeAgo(d.hub.lastSeen):d.mobile?.lastSeen?timeAgo(d.mobile.lastSeen):"—"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
