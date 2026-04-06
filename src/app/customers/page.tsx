"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

const S={bg:"#0A0A0F",surface:"#12131A",border:"#1E2030",red:"#FF3B3B",green:"#00E676",orange:"#FF9100",cyan:"#00E5FF",text:"#E8EAED",muted:"#6B7280"};
const BC:Record<string,string>={safe_life:"#FF3B3B",safe_home:"#00E676",safe_home_plus:"#00E5FF"};

function TopBar({operator,logout}:{operator:any;logout:()=>void}){
  const [time,setTime]=useState(new Date());useEffect(()=>{const i=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(i)},[]);
  const nav=[{k:"dashboard",l:"Dashboard"},{k:"customers",l:"Kunden"},{k:"cases",l:"Vorfälle"},{k:"status",l:"System"}];
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:48,paddingInline:20,background:S.surface,borderBottom:`1px solid ${S.border}`,flexShrink:0}}><div style={{display:"flex",alignItems:"center",gap:20}}><div style={{display:"flex",alignItems:"center",gap:8}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={S.red} strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="13" stroke={S.red} strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1" fill={S.red}/></svg><span style={{fontSize:14,fontWeight:800,color:"#fff",letterSpacing:1}}>NOTRUF24 LEITSTELLE</span></div><div style={{display:"flex",gap:4}}>{nav.map(n=><a key={n.k} href={n.k==="dashboard"?"/dashboard":`/${n.k}`} style={{padding:"6px 16px",fontSize:13,color:n.k==="customers"?"#fff":S.muted,textDecoration:"none",borderRadius:6,border:n.k==="customers"?`1px solid ${S.red}`:"1px solid transparent",background:n.k==="customers"?"rgba(255,59,59,0.08)":"transparent",fontWeight:n.k==="customers"?700:400}}>{n.l}</a>)}</div></div><div style={{display:"flex",alignItems:"center",gap:16}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:"50%",background:S.green}}/><span style={{fontSize:12,color:S.green}}>ALLE SYSTEME OK</span></div><span style={{fontSize:12,color:S.muted}}>{time.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>{operator&&<div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={logout}><div style={{width:28,height:28,borderRadius:"50%",background:S.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>{operator.name?.split(" ").map((n:string)=>n[0]).join("")}</div></div>}</div></div>);
}

export default function CustomersPage(){
  const{operator,authFetch,logout,loading}=useAuth();const router=useRouter();
  const[customers,setCustomers]=useState<any[]>([]);const[pagination,setPagination]=useState({page:1,total:0,totalPages:0});const[search,setSearch]=useState("");
  useEffect(()=>{if(!loading&&!operator)router.push("/")},[operator,loading]);
  useEffect(()=>{load()},[search,pagination.page]);
  const load=async()=>{try{const p=new URLSearchParams({page:String(pagination.page),limit:"10"});if(search)p.set("search",search);const r=await authFetch(`/api/customers?${p}`);if(r.success){setCustomers(r.data);setPagination(r.pagination)}}catch{}};
  if(loading||!operator)return null;
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:S.bg}}>
      <TopBar operator={operator} logout={logout}/>
      <div style={{flex:1,padding:"24px 32px",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"baseline",gap:12}}><h1 style={{fontSize:24,fontWeight:700,color:"#fff"}}>Kunden</h1><span style={{fontSize:13,color:S.muted}}>{pagination.total} Einträge</span></div>
          <div style={{display:"flex",gap:12}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Suche..." style={{background:S.surface,border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 16px",fontSize:13,color:"#fff",outline:"none",width:200,fontFamily:"Inter"}}/>
            <button style={{padding:"8px 20px",borderRadius:8,background:"transparent",border:`1px solid ${S.red}`,color:S.red,fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Neuer Kunde</button>
          </div>
        </div>
        <div style={{borderRadius:12,border:`1px solid ${S.border}`,overflow:"hidden"}}>
          <div style={{display:"flex",padding:"12px 20px",background:S.surface,borderBottom:`1px solid ${S.border}`}}>
            <span style={{flex:2,fontSize:11,color:S.muted,letterSpacing:1}}>NAME</span>
            <span style={{flex:3,fontSize:11,color:S.muted,letterSpacing:1}}>ADRESSE</span>
            <span style={{flex:2,fontSize:11,color:S.muted,letterSpacing:1}}>TELEFON</span>
            <span style={{flex:1,fontSize:11,color:S.muted,letterSpacing:1}}>BUNDLE</span>
            <span style={{width:60,fontSize:11,color:S.muted,letterSpacing:1}}>SPRACHE</span>
            <span style={{width:80,fontSize:11,color:S.muted,letterSpacing:1}}>STATUS</span>
          </div>
          {customers.map(c=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${S.border}`,cursor:"pointer"}}>
              <span style={{flex:2,fontSize:14,fontWeight:600,color:"#fff"}}>{c.firstName} {c.lastName}</span>
              <span style={{flex:3,fontSize:13,color:S.muted}}>{c.address}</span>
              <span style={{flex:2,fontSize:13,color:S.green}}>{c.phoneMobile}</span>
              <span style={{flex:1}}><span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:`${BC[c.bundle]||S.muted}22`,color:BC[c.bundle]||S.muted}}>{c.bundle?.replace(/_/g," ").toUpperCase()}</span></span>
              <span style={{width:60,fontSize:13,color:S.muted}}>{c.language?.toUpperCase()}</span>
              <span style={{width:80,display:"flex",alignItems:"center",gap:6}}><div style={{width:6,height:6,borderRadius:"50%",background:c.status==="active"?S.green:S.orange}}/><span style={{fontSize:12,color:c.status==="active"?S.green:S.orange}}>{c.status==="active"?"Aktiv":"Pausiert"}</span></span>
            </div>
          ))}
        </div>
        {pagination.totalPages>1&&<div style={{display:"flex",justifyContent:"flex-end",gap:4,marginTop:16}}>
          {Array.from({length:pagination.totalPages},(_, i)=><button key={i} onClick={()=>setPagination(p=>({...p,page:i+1}))} style={{width:32,height:32,borderRadius:8,background:pagination.page===i+1?S.red:S.surface,border:`1px solid ${pagination.page===i+1?S.red:S.border}`,color:"#fff",fontSize:12,cursor:"pointer"}}>{i+1}</button>)}
        </div>}
      </div>
    </div>
  );
}
