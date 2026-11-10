import { useState } from 'react';
import { phases, challenges, benefits, prereq, glossary, references, KB, objectives, dataCategories, outOfScope, approach, stagingGoals, rrTable, toolOverview, prereqChecks, toolTemplates, toolVersionNotes, stpMessage, dmdAuto, featureDetails, simSteps, simSampleRecords, type Phase } from './data';

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

function esc(s: string){return s.replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));}

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
    {icon && <div className="card-icon">{icon}</div>}
    <h2 className="card-title">{title}</h2>
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

function PhaseView(){
  const [idx,setIdx]=useState(0);
  const p: Phase = phases[idx];
  return <>
    <div className="effort-bar">
      {phases.map(x=><div key={x.key} style={{width:`${x.pct*2}%`, background:x.color}}>{x.pct}%</div>)}
    </div>
    <div className="phase-tabs">
      {phases.map((x,i)=>
        <button key={x.key} onClick={()=>setIdx(i)} className={i===idx?'phase-tab active':'phase-tab'}>{x.name}</button>)}
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

// Interactive simulation
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

  return <div className="sim">
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


function Chatbot(){
  const [open,setOpen]=useState(false);
  const [log,setLog]=useState<{who:'bot'|'user';html:string}[]>([{
    who:'bot',
    html:'Halo! 👋 Saya asisten migrasi data Temenos T24. Silakan bertanya, contoh: <i>"apa itu DMS?"</i>, <i>"apa saja fase migrasi?"</i>, atau <i>"syarat jadi managed partner?"</i>',
  }]);
  const [val,setVal]=useState('');
  const send=()=>{
    const q=val.trim(); if(!q)return;
    setVal('');
    setLog(l=>[...l,{who:'user',html:esc(q)}]);
    setTimeout(()=>setLog(l=>[...l,{who:'bot',html:answer(q)}]),250);
  };
  return <>
    <button className="chat-fab" onClick={()=>setOpen(!open)} title="Tanya tentang migrasi Temenos" aria-label="Buka asisten chat">💬</button>
    {open && <div className="chat-box">
      <div className="chat-header">
        <div>
          <div className="chat-title">Asisten Migrasi T24</div>
          <div className="chat-sub">Tanya apa saja tentang migrasi data ke Temenos T24</div>
        </div>
        <button className="chat-close" onClick={()=>setOpen(false)} aria-label="Tutup chat">✕</button>
      </div>
      <div className="chat-log">
        {log.map((m,i)=><div key={i} className={m.who==='bot'?'chat-msg bot':'chat-msg user'}>
          <div className={m.who==='bot'?'bubble bot-bubble':'bubble user-bubble'} dangerouslySetInnerHTML={{__html:m.html}} />
        </div>)}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')send();}} placeholder="Contoh: apa itu DMS?" />
        <button className="chat-send" onClick={send}>Kirim</button>
      </div>
    </div>}
  </>;
}

export function App(){
  const [tab,setTab]=useState('overview');
  return (
    <div className="app-root">
      <aside className="sidebar">
        <div className="side-brand">
          <div className="brand-title">Panduan Migrasi Data<br/><span>Temenos T24</span></div>
          <div className="brand-sub">Berdasarkan dokumen TDM V15 (2011)</div>
        </div>
        <nav className="side-nav">
          {NAV.map(([k,label])=>
            <button key={k} onClick={()=>setTab(k)} className={tab===k?'nav-btn active':'nav-btn'}>{label}</button>)}
        </nav>
        <div className="side-foot">dm@temenos.com · TEMENOS Data Migration Services</div>
      </aside>
      <main className="main">
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
          <div className="grid-2">
            {Object.entries(glossary).map(([k,v])=><div className="mini-card" key={k}>
              <div className="mc-title term">{k}</div><div className="mc-desc">{v}</div>
            </div>)}
          </div>
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
          <p>Panduan interaktif ini menggabungkan pengetahuan dari dua dokumen:</p>
          <ul className="bullet">
            <li><b>TEMENOS Data Migration Services — Managed Data Migration and Partner (V15, 19 Juli 2011)</b> — fase migrasi, aktivitas R/P/S, program partner TDM.</li>
            <li><b>Data Migration Overall Approach</b> (materi training) — objektif, scope data, pendekatan 7 tahap, staging, rekonsiliasi, dry run, decommission, backup & audit trail, serta pembagian peran Temenos vs Client.</li>
            <li><b>Data Migration Tool User Guide</b> (GPAC/R13, 308 halaman) — referensi teknis DM Tool: 13 template (DM.INFORMATION, DMD, DSC, DSS, DM.EXTRACTOR, DM.DATA.COMPARE, dll.), pre-requisite check, STP, audit, dan fitur tambahan; termasuk simulasi interaktif migrasi CUSTOMER.</li>
            <li><b>T24 Data Migration Tool (DMIG) Reference Guide V1.3</b> (2012, 165 halaman) — detail DM Tool Service Mode: riwayat versi (composite screen TO TEMENOS, sequential load gap), DM.APP.BACKUP, DM.EXTRACTOR dengan selection criteria & DATA.CAPTURE, DM.MAPPING.EXTRACT, serta langkah kerja per fitur tambahan.</li>
          </ul>
          <ul className="bullet">
            <li>Gunakan tombol 💬 untuk bertanya tentang migrasi data Temenos kapan saja.</li>
            <li>Semua jawaban chatbot bersumber dari isi kedua dokumen tersebut.</li>
          </ul>
        </Card>}
      </main>
      <Chatbot/>
    </div>
  );
}
