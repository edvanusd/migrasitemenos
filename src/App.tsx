import { Component, Suspense, lazy, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SceneFallback } from './SceneFallback';
import type { MigrationSceneProps } from './MigrationScene';
import { stageStory, phases, challenges, benefits, prereq, glossary, references, KB, objectives, dataCategories, outOfScope, approach, stagingGoals, rrTable, toolOverview, prereqChecks, toolTemplates, toolVersionNotes, stpMessage, dmdAuto, featureDetails, simSteps, simSampleRecords, type Phase } from './data';

const NAV: [string, string][] = [
  ['overview','📊 Ringkasan'],
  ['scope','🎯 Objektif & Scope'],
  ['challenges','⚠️ Tantangan'],
  ['phases','🗺️ Fase & Roadmap'],
  ['approach','🔄 Pendekatan Menyeluruh'],
  ['tool','🛠️ DM Tool (Teknis)'],
  ['sim','🎮 Simulasi Migrasi'],
  ['raci','👥 Peran & Tanggung Jawab'],
  ['prereq','✅ Prasyarat Partner'],
  ['benefits','💰 Manfaat Partner'],
  ['glossary','📖 Glosarium'],
  ['references','📚 Materi Referensi'],
  ['about','ℹ️ Tentang'],
];

const ESC: Record<string,string> = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'};
function esc(s: string){return s.replace(/[&<>"]/g,m=>ESC[m] ?? m);}

const TAB_KEYS = NAV.map(n=>n[0]);
function readHash(){ const h = window.location.hash.replace('#',''); return TAB_KEYS.includes(h) ? h : 'overview'; }
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const phaseShort = (name: string) => name.replace(/^\d+\.\s*/, '');

// 3D scene: loaded on demand so the guide itself opens fast
const MigrationScene = lazy(() => import('./MigrationScene'));
class SceneBoundary extends Component<{children: ReactNode; compact?: boolean}, {failed: boolean}> {
  state = { failed: false };
  static getDerivedStateFromError(){ return { failed: true }; }
  render(){ return this.state.failed ? <SceneFallback compact={this.props.compact}/> : this.props.children; }
}
function Scene3D(props: MigrationSceneProps){
  return <SceneBoundary compact={props.compact}>
    <Suspense fallback={<SceneFallback compact={props.compact} loading/>}>
      <MigrationScene {...props}/>
    </Suspense>
  </SceneBoundary>;
}

function answer(q: string){
  const ql = q.toLowerCase();
  let best: string | null = null, bestScore = 0;
  for (const [keys, ans] of KB){
    let sc = 0;
    for (const k of keys) if (ql.includes(k)) sc += k.length>=4?2:1;
    if (sc > bestScore){bestScore=sc; best=ans;}
  }
  if (best) return best;
  for (const [k,v] of Object.entries(glossary)){
    if (k.length>2 && ql.includes(k.toLowerCase())) return `<b>${k}</b> — ${v}`;
  }
  return 'Maaf, saya belum menemukan jawaban untuk itu di dokumen TDM V15. Coba pertanyaan lain, misalnya: <i>fase migrasi</i>, <i>DMS vs DES</i>, <i>tantangan migrasi</i>, <i>prasyarat partner</i>, <i>rekonsiliasi</i>, atau <i>CoB</i>.';
}

function Card({title, icon, children}:{title:string; icon?:string; children:React.ReactNode}){
  return <div className="card">
    <h2 className="card-title">{icon && <span className="card-icon" aria-hidden="true">{icon}</span>}{title}</h2>
    <div className="card-body">{children}</div>
  </div>;
}

function mark(roles: string, who: string){
  if (roles.includes('Sign-off'))
    return who==='Client' ? <span className="pill pill-s">S</span> : <span className="dim">—</span>;
  if (roles.includes(who))
    return <span className="pill pill-r">{who==='TDM'?'R/P':'R'}</span>;
  return <span className="dim">—</span>;
}

// Overview hero: the 3D journey with a phase rail and optional autoplay
const STAGE_MS = [6000, 6500, 6500, 9500, 9000];
function Hero({onGo, onAsk}:{onGo:(k:string)=>void; onAsk:()=>void}){
  const [stage,setStage]=useState(0);
  const [playing,setPlaying]=useState(()=>!prefersReducedMotion());
  useEffect(()=>{
    if(!playing) return;
    const id=window.setTimeout(()=>setStage(s=>(s+1)%phases.length), STAGE_MS[stage]);
    return ()=>window.clearTimeout(id);
  },[playing,stage]);
  const choose=(i:number)=>{ setStage(i); setPlaying(false); };
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-head">
      <h1 id="hero-title" className="hero-title">Migrasi data core banking ke Temenos T24</h1>
      <p className="hero-lede">Ikuti perjalanan setiap record: dari sistem legacy, dibersihkan di staging, lalu di-load dan direkonsiliasi di T24. Pilih fase untuk melihat apa yang terjadi.</p>
    </div>
    <div className="hero-stage">
      <Scene3D stage={stage} onZoneSelect={choose} label={`Animasi 3D perjalanan record. Fase ${phaseShort(phases[stage].name)}.`}/>
      <p className="hero-hint">Seret untuk memutar. Arahkan atau ketuk kotak untuk melihat record.</p>
    </div>
    <div className="rail" role="group" aria-label="Pilih fase migrasi">
      {phases.map((p,i)=><button key={p.key} type="button" aria-pressed={i===stage}
        className={i===stage?'rail-step is-active':'rail-step'} style={{'--phase':p.color} as CSSProperties}
        onClick={()=>choose(i)}>
        <span className="rail-num">{i+1}</span>
        <span className="rail-name">{phaseShort(p.name)}</span>
        <span className="rail-pct">{p.pct}% effort</span>
        {playing && i===stage && <span className="rail-timer" key={`t${stage}`} style={{animationDuration:`${STAGE_MS[stage]}ms`}}/>}
      </button>)}
    </div>
    <div className="hero-foot">
      <p className="hero-caption" aria-live={playing?'off':'polite'}>{stageStory[stage]}</p>
      <button type="button" className="play-btn" onClick={()=>setPlaying(p=>!p)} aria-pressed={playing}>
        {playing ? '❚❚ Jeda' : '▶ Putar otomatis'}
      </button>
    </div>
    <div className="next-steps">
      <button type="button" className="sim-btn" onClick={()=>onGo('phases')}>Lihat aktivitas tiap fase</button>
      <button type="button" className="sim-btn ghost" onClick={()=>onGo('sim')}>Coba simulasi migrasi CUSTOMER</button>
      <button type="button" className="sim-btn ghost" onClick={onAsk}>Tanya asisten</button>
    </div>
  </section>;
}

function PhaseView(){
  const [idx,setIdx]=useState(0);
  const p: Phase = phases[idx];
  return <>
    <Scene3D stage={idx} compact onZoneSelect={setIdx} errors="cycle" label={`Animasi 3D fase ${phaseShort(p.name)}`}/>
    <p className="scene-caption">{stageStory[idx]}</p>
    <div className="effort-bar" role="group" aria-label="Distribusi effort per fase">
      {phases.map((x,i)=><button type="button" key={x.key} onClick={()=>setIdx(i)} aria-pressed={i===idx}
        className={i===idx?'effort-seg is-active':'effort-seg'}
        style={{flexGrow:x.pct, background:x.color}} title={`${x.name}: ${x.pct}% effort`}>{x.pct}%</button>)}
    </div>
    <div className="phase-tabs">
      {phases.map((x,i)=>
        <button key={x.key} onClick={()=>setIdx(i)} className={i===idx?'phase-tab active':'phase-tab'} style={{'--phase':x.color} as CSSProperties}>{x.name}</button>)}
    </div>
    <div className="phase-head" style={{borderLeftColor:p.color}}>
      <div className="phase-title">{p.name} — {p.pct}% effort</div>
      <p className="phase-desc">{p.desc}</p>
    </div>
    <div className="phase-items">
      {p.items.map(([t,d,r])=>
        <div className="phase-item" key={t}>
          <div className="grow">
            <div className="pi-title">{t}</div>
            <div className="pi-desc">{d}</div>
          </div>
          <span className={r.includes('Sign-off')?'pill pill-s':'pill pill-role'}>{r}</span>
        </div>)}
    </div>
  </>;
}

// DM Tool technical view
function ToolView(){
  const [open,setOpen]=useState<string|null>('DM.MAPPING.DEFINITION (DMD)');
  const [openFeat,setOpenFeat]=useState<string|null>(null);
  return <>
    <h3 className="section-title">Kemampuan DM Tool</h3>
    <ul className="bullet">{toolOverview.map(o=><li key={o}>{o}</li>)}</ul>
    <h3 className="section-title">Riwayat Versi & Mode Layanan</h3>
    <ul className="bullet">{toolVersionNotes.map(o=><li key={o}>{o}</li>)}</ul>
    <h3 className="section-title">Menu MB.DMMAIN</h3>
    <p className="mb">Tiga menu: <b>Migration Pre-Requisite Check</b> · <b>Client System to T24 Migration</b> · <b>T24 to T24 Migration</b>. Pemeriksaan pra-syarat (klik baris untuk detail):</p>
    <div className="tmpl-list">
      {prereqChecks.map(([t,p])=><div className="tmpl-item" key={t}>
        <button className="tmpl-head" onClick={()=>setOpen(open===t?null:t)}>
          <b>{t}</b><span className="tmpl-toggle">{open===t?'▾':'▸'}</span>
        </button>
        {open===t && <div className="tmpl-body"><div className="mc-desc">{p}</div></div>}
      </div>)}
    </div>
    <h3 className="section-title">Template DM Tool — klik untuk detail field</h3>
    <div className="tmpl-list">
      {toolTemplates.map(t=><div className="tmpl-item" key={t.name}>
        <button className="tmpl-head" onClick={()=>setOpen(open===t.name?null:t.name)}>
          <b>{t.name}</b><span className="tmpl-toggle">{open===t.name?'▾':'▸'}</span>
        </button>
        {open===t.name && <div className="tmpl-body">
          <div className="mc-desc">{t.purpose}</div>
          <div className="tmpl-guide"><b>Cara kerja:</b> {t.guide}</div>
          <div className="table-wrap"><table>
            <thead><tr><th className="ta-l">Field</th><th className="ta-l">Deskripsi</th></tr></thead>
            <tbody>
              {t.fields.map(([f,d],i)=><tr key={i} className={i%2?'alt':''}>
                <td className="ta-l fld-name">{f}</td>
                <td className="ta-l soft">{d}</td>
              </tr>)}
            </tbody>
          </table></div>
        </div>}
      </div>)}
    </div>
    <h3 className="section-title">Mode Online (STP)</h3>
    <div className="code-block">{stpMessage}</div>
    <h3 className="section-title">Pembuatan DMD Otomatis</h3>
    <p className="mb">{dmdAuto}</p>
    <h3 className="section-title">Fitur Tambahan — klik untuk langkah detail</h3>
    <div className="tmpl-list">
      {featureDetails.map(f=><div className="tmpl-item" key={f.name}>
        <button className="tmpl-head" onClick={()=>setOpenFeat(openFeat===f.name?null:f.name)}>
          <b>{f.name}</b><span className="tmpl-toggle">{openFeat===f.name?'▾':'▸'}</span>
        </button>
        {openFeat===f.name && <div className="tmpl-body">
          <div className="mc-desc">{f.purpose}</div>
          <ol className="feat-steps">{f.steps.map((st,i)=><li key={i}>{st}</li>)}</ol>
        </div>}
      </div>)}
    </div>
  </>;
}

// Interactive simulation — each DM Tool step maps to a phase of the 3D journey
const SIM_STAGE = [0,1,1,2,2,2,3,4,4,4];
const SIM_CAPTION = [
  'Environment dicek dulu. Record CUSTOMER masih berada di sistem sumber.',
  'ID legacy diterjemahkan dan field dipetakan ke T24 lewat DMD.',
  'File data disiapkan di DATA.IN dan diverifikasi sebelum load.',
  'DSC memvalidasi, me-load, dan meng-authorize setiap record.',
  'Data ter-load di T24. Rekonsiliasi memindai dan membandingkan record dengan sumbernya.',
];
function Simulation(){
  const [step,setStep]=useState(0);
  const [fixed,setFixed]=useState<Record<string,boolean>>({});
  const [translated,setTranslated]=useState(false);
  const s=simSteps[step];
  const okRecs=simSampleRecords.filter(r=>r.ok || fixed[r.id]);
  const badRecs=simSampleRecords.filter(r=>!(r.ok || fixed[r.id]));

  const fix=(id:string)=>setFixed(f=>({...f,[id]:true}));

  const ui=()=>{
    switch(s.ui){
      case 'check': return <div className="sim-screen">
        <div className="sim-title">DM.INFORMATION &gt; SYSTEM — count awal</div>
        <div className="table-wrap"><table>
          <thead><tr><th className="ta-l">APPLICATION</th><th>LIVE.COUNT</th><th>NAU.COUNT</th><th>HIS.COUNT</th></tr></thead>
          <tbody><tr><td className="ta-l"><b>CUSTOMER</b></td><td>0</td><td>0</td><td>0</td></tr>
          <tr className="alt"><td className="ta-l"><b>ACCOUNT</b></td><td>0</td><td>0</td><td>0</td></tr></tbody>
        </table></div>
        <div className="sim-note">✅ Semua check lulus (DATES, HOLIDAY, USER, SPF.36, COMPANY, AUTO.ID.START). Count tersimpan di DATA.MIG.COUNT.</div>
      </div>;
      case 'translate': return <div className="sim-screen">
        <div className="sim-title">DM.DATA.TRANSLATION — legacy ID → T24 ID</div>
        <div className="code-block">{'CL-0001|MARKJ|Mark Josy|...\nCL-0002|JANEF|Jane Foster|...\nCL-0003|Ah |amed|...|EG'}<br/><br/><b style={{color:'#10b981'}}>{'↓ MAPPING.TABLE + POS.CONVERT + FM.DELIM.REPLACE'}</b><br/><br/>{'100001|MARKJ|Mark Josy|...\n100002|JANEF|Jane Foster|...\n100003|Ah %$% amed|...|EG'}</div>
        {!translated
          ? <button className="sim-btn" onClick={()=>setTranslated(true)}>▶ Jalankan konversi</button>
          : <div className="sim-note">✅ File converted (T24 ID + delimiter aman) tersimpan di TARGET.DIR. Record "Ah |amed" menjadi "Ah %$% amed".</div>}
      </div>;
      case 'dmd': return <div className="sim-screen">
        <div className="sim-title">DM.MAPPING.DEFINITION &gt; V.CUSTOM</div>
        <div className="code-block">{'APPLICATION.NAME : CUSTOMER\nLOAD.TYPE        : OFS.LOAD\nOFS.FUNCTION     : I\nIN.DATA.DEF      : DELIM   (FM=|, VM=::, SM=!!)\nID.TYPE          : AUTO\n  #  APPL.FIELD.NAME        FIELD.ATTRIB\n  1  MNEMONIC               (dari file, pos-1)\n  2  SHORT.NAME             (dari file, pos-2)\n  3  NAME.1                 CONSTANT → "Mark"\n  6  SECTOR                 (dari file, pos-6)\n 13  NATIONALITY            (dari file, pos-13)\nPOST.UPDATE.RTN : CUST.POST.CHECK'}</div>
        <div className="sim-note">💡 Tip: buat DMD + Version otomatis dengan service AUTO.DMD.CREATION di jshell.</div>
      </div>;
      case 'prereq': return <div className="sim-screen">
        <div className="sim-title">DM.PREREQUISITE &gt; 001*DMUSER — hasil verify</div>
        <div className="code-block">{'DATA.IN/\n ├─ VERIFY01/  VERIFY02/  VERIFY03/\n ├─ LOAD01/    AUTH01/    DMV/\n │   └─ V.CUSTOM.01.202603221030.TXT  (disalin)\n └─ RECON.OUT/\n     └─ <folder recon spec>'}</div>
        <div className="sim-note">✅ Folder dibuat, file data disalin, DSC V.CUSTOM dibuat via OFS (OFS.SOURCE = DSC.CREATE).</div>
      </div>;
      case 'dmv': return <div className="sim-screen">
        <div className="sim-title">DATA.MAPPING.VERIFICATION &gt; CUSTOMER</div>
        <div className="code-block">{'CORE.FIELDS  : MNEMONIC, SHORT.NAME, SECTOR, NATIONALITY, ...\nLOCAL.FIELDS : (local ref site)\nMAPPING.STATUS : PASS'}</div>
        <div className="sim-note">✅ Field di DMD dan di mapping list sinkron. Bila FAIL — selaraskan DMD sebelum load.</div>
      </div>;
      case 'backup': return <div className="sim-screen">
        <div className="sim-title">DM.APP.BACKUP &gt; APP.CUSTOMER — hasil verify</div>
        <div className="code-block">{'TSA.WORKLOAD.PROFILE > DOB-APP.CUSTOMER   (dibuat)\nTSA.SERVICE         > DOB-APP.CUSTOMER   (dibuat, auto-start)\nBATCH               > DOB-APP.CUSTOMER   (dibuat)\n\nDM.BACKUP/CUSTOMER/   ← record CUSTOMER dipindah di sini'}</div>
        <div className="sim-note">✅ Record sebelum backup: 3 → folder DM.BACKUP/CUSTOMER berisi 3 file. Aplikasi target kini bersih, siap diload ulang.</div>
      </div>;
      case 'dsc': return <div className="sim-screen">
        <div className="sim-title">DM.SERVICE.CONTROL &gt; V.CUSTOM — eksekusi load</div>
        <div className="table-wrap"><table>
          <thead><tr><th className="ta-l">Record</th><th>VERIFY</th><th>LOAD</th><th>AUTH</th><th>Status</th></tr></thead>
          <tbody>
            {simSampleRecords.map(r=>{
              const ok=r.ok||fixed[r.id];
              return <tr key={r.id} className={!ok?'err':''}>
                <td className="ta-l"><b>{r.id}</b> {r.mnemonic}</td>
                <td>{ok?'✓':'✗'}</td><td>{ok?'✓':'—'}</td><td>{ok?'✓':'—'}</td>
                <td className="ta-l">{ok?'✅ OK':'⛔ ERROR'}</td>
              </tr>;})}
          </tbody>
        </table></div>
        {badRecs.length>0 && <>
          <div className="sim-note err-note">⛔ {badRecs.length} record gagal validasi:<br/>{badRecs.map(r=><span key={r.id}>· <b>{r.mnemonic}</b> — {r.err}<br/></span>)}</div>
          <button className="sim-btn" onClick={()=>badRecs.forEach(r=>fix(r.id))}>🔧 Perbaiki: translasi ID + ganti delimiter, lalu reload record</button>
        </>}
        {badRecs.length===0 && <div className="sim-note">✅ Semua record valid → load via OFS → authorize. NO.OF.ERROR = 0. Count CUSTOMER naik 0 → 3.</div>}
      </div>;
      case 'extract': return <div className="sim-screen">
        <div className="sim-title">Extract rekonsiliasi</div>
        <div className="code-block">{'RECON.OUT/ (extract dari T24 — DM.EXTRACTOR)\n  100001|MARKJ|Mark Josy|1001|US\n  100002|JANEF|Jane Foster|1001|US\n  100003|MARKH|Ahamed|1001|EG\n\nDATA.IN/ (extract legacy dari bank)\n  100001|MARKJ|Mark Josy|1001|US\n  100002|JANEF|Jane Foster|1001|US\n  100003|MARKH|Ahamed|1001|EG'}</div>
        <div className="sim-note">Kedua extract pakai struktur setara: ID + field bisnis kunci.</div>
      </div>;
      case 'compare': return <div className="sim-screen">
        <div className="sim-title">DM.DATA.COMPARE — hasil FILE.COMPARE</div>
        <div className="table-wrap"><table>
          <thead><tr><th className="ta-l">ID</th><th>Source (legacy)</th><th>Target (T24)</th><th>Result</th></tr></thead>
          <tbody>
            <tr><td className="ta-l"><b>100001</b></td><td>✓</td><td>✓</td><td className="ok-txt">MATCH</td></tr>
            <tr className="alt"><td className="ta-l"><b>100002</b></td><td>✓</td><td>✓</td><td className="ok-txt">MATCH</td></tr>
            <tr><td className="ta-l"><b>100003</b></td><td>✓</td><td>✓</td><td className="ok-txt">MATCH</td></tr>
          </tbody>
        </table></div>
        <div className="sim-note">✅ 3/3 MATCH — data legacy dan T24 identik. Output perbandingan tersimpan di OUTPUT.FILE.</div>
      </div>;
      default: return <div className="sim-screen">
        <div className="sim-title">DM.INFORMATION — count final</div>
        <div className="table-wrap"><table>
          <thead><tr><th className="ta-l">APPLICATION</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
          <tbody><tr><td className="ta-l"><b>CUSTOMER</b></td><td>0</td><td><b>3</b></td></tr></tbody>
        </table></div>
        <div className="sim-note">🎉 Rekonsiliasi match, data siap. Setelah go-live: jalankan DM.CLEANUP + simpan backup untuk audit.</div>
      </div>;
    }
  };

  const sceneStage = SIM_STAGE[step] ?? 0;
  const sceneErrors = s.ui==='dsc' && badRecs.length>0 ? 'stuck' : 'none';
  return <div className="sim">
    <Scene3D stage={sceneStage} errors={sceneErrors} compact label={`Animasi 3D simulasi, tahap ${s.title}`}/>
    <p className="scene-caption">
      {s.ui==='dsc' && badRecs.length>0
        ? 'Record merah tertahan di gerbang validasi DSC. Perbaiki datanya, lalu lihat record itu ikut ter-load ke T24.'
        : SIM_CAPTION[sceneStage]}
    </p>
    <div className="sim-progress">
      {simSteps.map((x,i)=><div key={x.title} className="sim-pbar">
        <button className={i===step?'sim-pdot active':i<step?'sim-pdot done':'sim-pdot'} onClick={()=>setStep(i)}>{i<step?'✓':i}</button>
        <div className={i===step?'sim-plabel active':'sim-plabel'}>{x.title}</div>
      </div>)}
    </div>
    <div className="sim-card">
      <div className="sim-head">
        <div className="sim-concept">{s.concept}</div>
        <div className="sim-step-title">{s.title}</div>
      </div>
      <p className="sim-detail">{s.detail}</p>
      {ui()}
      <div className="sim-nav">
        <button className="sim-btn ghost" disabled={step===0} onClick={()=>setStep(step-1)}>← Sebelumnya</button>
        <button className="sim-btn" disabled={step===simSteps.length-1} onClick={()=>setStep(step+1)}>Lanjut →</button>
      </div>
    </div>
  </div>;
}


const QUICK_QUESTIONS = ['Apa saja fase migrasi?', 'Apa itu DMS?', 'Bagaimana rekonsiliasi data?', 'Syarat jadi managed partner?'];
function Chatbot({open, setOpen}:{open:boolean; setOpen:(v:boolean)=>void}){
  const [log,setLog]=useState<{who:'bot'|'user';html:string}[]>([{
    who:'bot',
    html:'Halo! 👋 Saya asisten migrasi data Temenos T24. Tanyakan apa saja, atau pilih salah satu pertanyaan di bawah.',
  }]);
  const [val,setVal]=useState('');
  const [typing,setTyping]=useState(false);
  const logRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{ const el=logRef.current; if(el) el.scrollTop=el.scrollHeight; },[log,typing,open]);
  useEffect(()=>{
    if(!open) return;
    inputRef.current?.focus();
    const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') setOpen(false); };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[open,setOpen]);
  const ask=(text:string)=>{
    const q=text.trim(); if(!q||typing)return;
    setVal('');
    setLog(l=>[...l,{who:'user',html:esc(q)}]);
    setTyping(true);
    window.setTimeout(()=>{ setTyping(false); setLog(l=>[...l,{who:'bot',html:answer(q)}]); },450);
  };
  const asked=log.some(m=>m.who==='user');
  return <>
    <button className={open?'chat-fab is-open':'chat-fab'} onClick={()=>setOpen(!open)} title="Tanya tentang migrasi Temenos"
      aria-label={open?'Tutup asisten chat':'Buka asisten chat'} aria-expanded={open}>{open?'✕':'💬'}</button>
    {open && <div className="chat-box" role="dialog" aria-label="Asisten Migrasi T24">
      <div className="chat-header">
        <div>
          <div className="chat-title">Asisten Migrasi T24</div>
          <div className="chat-sub">Jawaban bersumber dari dokumen panduan</div>
        </div>
        <button className="chat-close" onClick={()=>setOpen(false)} aria-label="Tutup chat">✕</button>
      </div>
      <div className="chat-log" ref={logRef} aria-live="polite">
        {log.map((m,i)=><div key={i} className={m.who==='bot'?'chat-msg bot':'chat-msg user'}>
          <div className={m.who==='bot'?'bubble bot-bubble':'bubble user-bubble'} dangerouslySetInnerHTML={{__html:m.html}} />
        </div>)}
        {typing && <div className="chat-msg bot"><div className="bubble bot-bubble typing" aria-label="Asisten sedang mengetik"><i/><i/><i/></div></div>}
        {!asked && <div className="chat-chips">
          {QUICK_QUESTIONS.map(q=><button key={q} type="button" className="chip" onClick={()=>ask(q)}>{q}</button>)}
        </div>}
      </div>
      <form className="chat-input-row" onSubmit={e=>{e.preventDefault(); ask(val);}}>
        <input ref={inputRef} className="chat-input" value={val} onChange={e=>setVal(e.target.value)}
          placeholder="Contoh: apa itu DMS?" aria-label="Pertanyaan" />
        <button className="chat-send" type="submit" disabled={!val.trim()||typing}>Kirim</button>
      </form>
    </div>}
  </>;
}

function Glossary(){
  const [qv,setQv]=useState('');
  const term=qv.trim().toLowerCase();
  const items=Object.entries(glossary).filter(([k,v])=>!term || k.toLowerCase().includes(term) || v.toLowerCase().includes(term));
  return <>
    <div className="search-row">
      <input className="search-input" type="search" value={qv} onChange={e=>setQv(e.target.value)}
        placeholder="Cari istilah, mis. DMD, rekonsiliasi, OFS" aria-label="Cari istilah di glosarium"/>
      <span className="search-count">{items.length} dari {Object.keys(glossary).length} istilah</span>
    </div>
    {items.length>0
      ? <div className="grid-2">
          {items.map(([k,v])=><div className="mini-card" key={k}>
            <div className="mc-title term">{k}</div><div className="mc-desc">{v}</div>
          </div>)}
        </div>
      : <p className="empty">Tidak ada istilah yang cocok dengan “{qv.trim()}”. Coba kata lain, atau tanyakan ke asisten lewat tombol 💬.</p>}
  </>;
}

export function App(){
  const [tab,setTabState]=useState(readHash);
  const [navOpen,setNavOpen]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  useEffect(()=>{
    const onHash=()=>{ setTabState(readHash()); setNavOpen(false); };
    window.addEventListener('hashchange',onHash);
    return ()=>window.removeEventListener('hashchange',onHash);
  },[]);
  const setTab=(k:string)=>{
    setNavOpen(false);
    if(k!==tab) window.location.hash=k;
    window.scrollTo({top:0});
  };
  const current=NAV.find(n=>n[0]===tab)?.[1] ?? '';
  return (
    <div className="app-root">
      <a className="skip-link" href="#main">Langsung ke konten</a>
      <aside className={navOpen?'sidebar is-open':'sidebar'}>
        <div className="side-brand">
          <div className="brand-title">Panduan Migrasi Data<br/><span>Temenos T24</span></div>
          <div className="brand-sub">Berdasarkan dokumen TDM V15 (2011)</div>
          <button type="button" className="menu-btn" aria-expanded={navOpen} aria-controls="side-nav" onClick={()=>setNavOpen(o=>!o)}>
            {navOpen ? '✕ Tutup' : `☰ ${current.replace(/^\S+\s/,'')}`}
          </button>
        </div>
        <nav className="side-nav" id="side-nav" aria-label="Bagian panduan">
          {NAV.map(([k,label])=>
            <button key={k} onClick={()=>setTab(k)} aria-current={tab===k?'page':undefined} className={tab===k?'nav-btn active':'nav-btn'}>{label}</button>)}
        </nav>
        <div className="side-foot">Kontak TDM: dm@temenos.com</div>
      </aside>
      <main className="main" id="main">
       <div className="view" key={tab}>
        {tab==='overview' && <Hero onGo={setTab} onAsk={()=>setChatOpen(true)}/>}
        {tab==='overview' && <Card title="Ringkasan: Migrasi Data ke Temenos T24" icon="📊">
          <p>TEMENOS Data Migration Services (TDM) membantu <b>migrasi data dari sistem core banking client ke T24/Globus</b>, baik secara managed (dikerjakan TDM) maupun bersama <b>Managed Data Migration Partner</b>.</p>
          <ul className="bullet">
            <li><b>2 model layanan:</b> TDM Managed Migration dan Partner Migration (dengan TDM sebagai penasihat/eksekutor pendamping).</li>
            <li><b>5 fase migrasi:</b> Initiasi → Mapping → Preparation → Testing → Cutover.</li>
            <li><b>Dua role utama TDM:</b> consultancy pada tahap sales/engagement, dan eksekusi data load pada implementasi solusi.</li>
          </ul>
          <div className="callout">Butuh bantuan migrasi data ke T24? Hubungi <b>dm@temenos.com</b></div>
        </Card>}

        {tab==='scope' && <Card title="Objektif & Scope Migrasi" icon="🎯">
          <h3 className="section-title">Objektif</h3>
          <ul className="bullet">{objectives.map(o=><li key={o}>{o}</li>)}</ul>
          <h3 className="section-title">Kategori Data yang Dimigrasikan</h3>
          <div className="grid-2">
            {dataCategories.map(([t,d])=><div className="mini-card" key={t}>
              <div className="mc-title">{t}</div><div className="mc-desc">{d}</div>
            </div>)}
          </div>
          <p className="note">Perimeter data sangat luas dan berpotensi menyentuh <b>setiap modul Temenos T24</b>.</p>
          <h3 className="section-title">Di luar Scope (Out of Scope)</h3>
          <ul className="bullet out">
            {outOfScope.map(o=><li key={o}>{o}</li>)}
          </ul>
          <h3 className="section-title">Staging Database — 5 Tujuan</h3>
          <div className="flow">Source 1 / 2 / 3 → <b>Staging</b> → Upload OFS → <b>T24</b></div>
          <div className="grid-2">
            {stagingGoals.map(([t,d])=><div className="mini-card" key={t}>
              <div className="mc-title">{t}</div><div className="mc-desc">{d}</div>
            </div>)}
          </div>
        </Card>}

        {tab==='approach' && <Card title="Pendekatan Menyeluruh (Overall Approach)" icon="🔄">
          <p className="mb">Alur migrasi berjalan dalam konteks proyek T24 (sales → analysis/review → build/config → functional test → UAT → data migration/conversion → post live). Pendekatan terdiri dari 7 tahap:</p>
          <div className="approach-list">
            {approach.map(a=><div className="approach-item" key={a.name}>
              <div className="approach-head"><span className="approach-icon">{a.icon}</span> {a.name}</div>
              <ul className="bullet">{a.bullets.map(b=><li key={b}>{b}</li>)}</ul>
            </div>)}
          </div>
          <div className="callout">Ketiga milestone agreement — Migration Project Agreement Part I, II, dan III — mengikat perencanaan, kendali proyek, dan rekonsiliasi dalam satu dokumen hidup.</div>
        </Card>}

        {tab==='challenges' && <Card title="Tantangan Migrasi Data (Client → T24)" icon="⚠️">
          <div className="grid-2">
            {challenges.map(([t,d])=><div className="mini-card" key={t}>
              <div className="mc-title">{t}</div><div className="mc-desc">{d}</div>
            </div>)}
          </div>
          <p className="note">Sisi client: <i>source synchronization, non-mechanized data, free-form data</i>. Sisi T24: <i>target configuration, value transformation, loading performance</i>. Di antaranya: <i>structure clashes & interfaces</i>.</p>
        </Card>}

        {tab==='phases' && <div className="card">
          <h2 className="card-title">Roadmap Fase Migrasi</h2>
          <p className="sub">Distribusi effort: Initiasi 15% · Mapping 30% · Preparation 20% · Testing 30% · Cutover 5%</p>
          <PhaseView/>
        </div>}

        {tab==='tool' && <div className="card">
          <h2 className="card-title">DM Tool — Panduan Teknis</h2>
          <p className="sub">T24 Data Migration Tool (GPAC/R13) — referensi template, field, dan alur operasional. Menu utama: <b>MB.DMMAIN</b>.</p>
          <ToolView/>
        </div>}

        {tab==='sim' && <div className="card">
          <h2 className="card-title">Simulasi Migrasi CUSTOMER → T24</h2>
          <p className="sub">Simulasi sederhana namun sesuai alur nyata DM Tool: dari pre-requisite check sampai rekonsiliasi. Klik nomor tahap untuk melompat.</p>
          <Simulation/>
        </div>}

        {tab==='raci' && <Card title="Peran & Tanggung Jawab" icon="👥">
          <h3 className="section-title">Matriks R/P/S (TDM / Partner / Client)</h3>
          <p className="mb"><b>R</b> = Responsible (mengerjakan) · <b>P</b> = Participate (ikut serta) · <b>S</b> = Sign-off (menyetujui).</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th className="ta-l">Fase</th><th className="ta-l">Aktivitas</th><th>TDM</th><th>Partner</th><th>Client</th></tr></thead>
              <tbody>
                {phases.map(p=>p.items.map((it,i)=><tr key={p.key+i} className={i%2?'alt':''}>
                  {i===0 && <td className="ta-l phase-cell" rowSpan={p.items.length}>{p.name}</td>}
                  <td className="ta-l">{it[0]}</td>
                  <td className="ta-c">{mark(it[2],'TDM')}</td>
                  <td className="ta-c">{mark(it[2],'Partner')}</td>
                  <td className="ta-c">{mark(it[2],'Client')}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
          <p className="note mt">Peran disarikan dari matriks aktivitas DM per fase pada dokumen TDM V15.</p>

          <h3 className="section-title">Pembagian Peran Temenos vs Client (Overall Approach)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th className="ta-l">Deliverable</th><th className="ta-l">Temenos</th><th className="ta-l">Client</th></tr></thead>
              <tbody>
                {rrTable.map(([d,t,c],i)=><tr key={d} className={i%2?'alt':''}>
                  <td className="ta-l"><b>{d}</b></td>
                  <td className="ta-l soft">{t}</td>
                  <td className="ta-l soft">{c}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>}

        {tab==='prereq' && <Card title="Prasyarat Menjadi Managed DM Partner" icon="✅">
          <ol className="numbered">
            {prereq.map(([t,d])=><li key={t}><b>{t}</b> — <span className="soft">{d}</span></li>)}
          </ol>
          <div className="callout warn"><b>Total man-days support: 25.</b> Setelah memenuhi prasyarat, partner berhak atas seluruh manfaat program partner.</div>
        </Card>}

        {tab==='benefits' && <Card title="Manfaat Data Migration Partner" icon="💰">
          <div className="grid-2">
            {benefits.map(([t,d])=><div className="mini-card green" key={t}>
              <div className="mc-title">{t}</div><div className="mc-desc">{d}</div>
            </div>)}
          </div>
        </Card>}

        {tab==='glossary' && <Card title="Glosarium Istilah" icon="📖">
          <Glossary/>
        </Card>}

        {tab==='references' && <Card title="Materi Referensi (TIM Knowledge Base)" icon="📚">
          <ul className="ref-list">
            {references.map(([t,f])=><li key={t}><b>{t}</b><br/><span className="soft">{f}</span></li>)}
          </ul>
          <div className="links">
            <div>🔗 TIM: <a href="http://knowledgebase.temenosgroup.com/sites/tim/default.aspx" target="_blank" rel="noopener noreferrer">knowledgebase.temenosgroup.com/sites/tim</a></div>
            <div>🔗 Partner: <a href="https://tpsp.temenos.com/sites/tim/default.aspx" target="_blank" rel="noopener noreferrer">tpsp.temenos.com/sites/tim</a></div>
          </div>
        </Card>}

        {tab==='about' && <Card title="Tentang Panduan Ini" icon="ℹ️">
          <p>Panduan interaktif ini menggabungkan pengetahuan dari empat dokumen:</p>
          <ul className="bullet">
            <li><b>TEMENOS Data Migration Services — Managed Data Migration and Partner (V15, 19 Juli 2011)</b> — fase migrasi, aktivitas R/P/S, program partner TDM.</li>
            <li><b>Data Migration Overall Approach</b> (materi training) — objektif, scope data, pendekatan 7 tahap, staging, rekonsiliasi, dry run, decommission, backup & audit trail, serta pembagian peran Temenos vs Client.</li>
            <li><b>Data Migration Tool User Guide</b> (GPAC/R13, 308 halaman) — referensi teknis DM Tool: 13 template (DM.INFORMATION, DMD, DSC, DSS, DM.EXTRACTOR, DM.DATA.COMPARE, dll.), pre-requisite check, STP, audit, dan fitur tambahan; termasuk simulasi interaktif migrasi CUSTOMER.</li>
            <li><b>T24 Data Migration Tool (DMIG) Reference Guide V1.3</b> (2012, 165 halaman) — detail DM Tool Service Mode: riwayat versi (composite screen TO TEMENOS, sequential load gap), DM.APP.BACKUP, DM.EXTRACTOR dengan selection criteria & DATA.CAPTURE, DM.MAPPING.EXTRACT, serta langkah kerja per fitur tambahan.</li>
          </ul>
          <ul className="bullet">
            <li>Gunakan tombol 💬 untuk bertanya tentang migrasi data Temenos kapan saja.</li>
            <li>Semua jawaban chatbot bersumber dari isi keempat dokumen tersebut.</li>
          </ul>
        </Card>}
       </div>
      </main>
      <Chatbot open={chatOpen} setOpen={setChatOpen}/>
    </div>
  );
}
