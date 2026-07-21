"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { Clock, Flag, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Shield, BookOpen } from "lucide-react";

interface Opt { id: string; text: string; isCorrect: boolean; }
interface Q { id: string; type: string; topic: string; marks: number; questionText: string; options?: Opt[]; correctAnswer?: string; explanation?: string; }

const MQ: Q[] = [
  {id:"m1",type:"mcq",topic:"Algebra",marks:2,questionText:"Solve for x: 2x + 5 = 15",options:[{id:"a",text:"x = 3",isCorrect:false},{id:"b",text:"x = 5",isCorrect:true},{id:"c",text:"x = 7",isCorrect:false},{id:"d",text:"x = 10",isCorrect:false}],explanation:"2x=10, x=5"},
  {id:"m2",type:"mcq",topic:"Algebra",marks:2,questionText:"If 3(x-4) = 2(x+1), find x.",options:[{id:"a",text:"x=10",isCorrect:false},{id:"b",text:"x=14",isCorrect:true},{id:"c",text:"x=8",isCorrect:false},{id:"d",text:"x=12",isCorrect:false}],explanation:"3x-12=2x+2, x=14"},
  {id:"m3",type:"mcq",topic:"Quadratics",marks:3,questionText:"Roots of x\u00B2-5x+6=0?",options:[{id:"a",text:"x=1,6",isCorrect:false},{id:"b",text:"x=2,3",isCorrect:true},{id:"c",text:"x=-2,-3",isCorrect:false},{id:"d",text:"x=3,-2",isCorrect:false}],explanation:"(x-2)(x-3)=0"},
  {id:"m4",type:"mcq",topic:"Trigonometry",marks:2,questionText:"sin\u03B8=0.5, \u03B8=?",options:[{id:"a",text:"30\u00B0",isCorrect:true},{id:"b",text:"45\u00B0",isCorrect:false},{id:"c",text:"60\u00B0",isCorrect:false},{id:"d",text:"90\u00B0",isCorrect:false}],explanation:"sin30=0.5"},
  {id:"m5",type:"mcq",topic:"Geometry",marks:2,questionText:"Area of circle r=7cm (\u03C0=22/7):",options:[{id:"a",text:"154cm\u00B2",isCorrect:true},{id:"b",text:"44cm\u00B2",isCorrect:false},{id:"c",text:"22cm\u00B2",isCorrect:false},{id:"d",text:"77cm\u00B2",isCorrect:false}],explanation:"\u03C0r\u00B2=154"},
  {id:"m6",type:"true_false",topic:"Primes",marks:1,questionText:"17 is a prime number.",options:[{id:"true",text:"True",isCorrect:true},{id:"false",text:"False",isCorrect:false}],explanation:"Only 1 and 17"},
  {id:"m7",type:"fill_blank",topic:"Arithmetic",marks:2,questionText:"Square root of 144 is ___",correctAnswer:"12",explanation:"12x12=144"},
  {id:"m8",type:"mcq",topic:"Statistics",marks:2,questionText:"Mean of 4,7,8,11,15?",options:[{id:"a",text:"8",isCorrect:false},{id:"b",text:"9",isCorrect:true},{id:"c",text:"10",isCorrect:false},{id:"d",text:"11",isCorrect:false}],explanation:"45/5=9"},
  {id:"m9",type:"mcq",topic:"Logarithms",marks:3,questionText:"log10(1000)=?",options:[{id:"a",text:"2",isCorrect:false},{id:"b",text:"3",isCorrect:true},{id:"c",text:"4",isCorrect:false},{id:"d",text:"10",isCorrect:false}],explanation:"10^3=1000"},
  {id:"m10",type:"essay",topic:"Word Problem",marks:5,questionText:"A trader bought 100 oranges for N2000 and sold at N30 each. Calculate: (a) Total selling price (b) Profit (c) % Profit.",explanation:"TSP=N3000,Profit=N1000,50%"},
];

const PQ: Q[] = [
  {id:"p1",type:"mcq",topic:"Mechanics",marks:2,questionText:"SI unit of force?",options:[{id:"a",text:"Joule",isCorrect:false},{id:"b",text:"Newton",isCorrect:true},{id:"c",text:"Watt",isCorrect:false},{id:"d",text:"Pascal",isCorrect:false}],explanation:"Newton (N)"},
  {id:"p2",type:"mcq",topic:"Mechanics",marks:2,questionText:"5kg body, accel 4m/s2. Force?",options:[{id:"a",text:"10N",isCorrect:false},{id:"b",text:"20N",isCorrect:true},{id:"c",text:"25N",isCorrect:false},{id:"d",text:"40N",isCorrect:false}],explanation:"F=ma=20N"},
  {id:"p3",type:"true_false",topic:"Waves",marks:1,questionText:"Sound faster in air than water.",options:[{id:"true",text:"True",isCorrect:false},{id:"false",text:"False",isCorrect:true}],explanation:"Faster in denser media"},
  {id:"p4",type:"fill_blank",topic:"Electricity",marks:2,questionText:"Unit of resistance is ___",correctAnswer:"ohm",explanation:"Ohm"},
  {id:"p5",type:"mcq",topic:"Optics",marks:2,questionText:"Lens for myopia?",options:[{id:"a",text:"Convex",isCorrect:false},{id:"b",text:"Concave",isCorrect:true},{id:"c",text:"Bifocal",isCorrect:false},{id:"d",text:"Plano-convex",isCorrect:false}],explanation:"Concave diverges light"},
];

const EQ: Q[] = [
  {id:"e1",type:"mcq",topic:"Grammar",marks:2,questionText:"The teacher ___ the students to be quiet.",options:[{id:"a",text:"asked",isCorrect:true},{id:"b",text:"asking",isCorrect:false},{id:"c",text:"ask",isCorrect:false},{id:"d",text:"asks",isCorrect:false}],explanation:"Past tense"},
  {id:"e2",type:"mcq",topic:"Grammar",marks:2,questionText:"Which is a complex sentence?",options:[{id:"a",text:"I went to the market.",isCorrect:false},{id:"b",text:"I went and bought fruits.",isCorrect:false},{id:"c",text:"When I went, I bought fruits.",isCorrect:true},{id:"d",text:"I went. I bought.",isCorrect:false}],explanation:"Has dependent clause"},
  {id:"e3",type:"essay",topic:"Essay",marks:10,questionText:"Write about 250 words on Technology in Modern Education. Cover: Introduction, Benefits, Challenges, Conclusion."},
];

const EX: Record<string,{title:string;subject:string;dur:number;total:number;pass:number;inst:string;qs:Q[]}> = {
  "exam-math-ca1":{title:"Mathematics - CA Test 1",subject:"Mathematics",dur:30,total:24,pass:10,inst:"Answer ALL. No calculator.",qs:MQ},
  "exam-phy-mid":{title:"Physics - Mid-Term",subject:"Physics",dur:45,total:9,pass:4,inst:"Answer ALL. Calculator allowed.",qs:PQ},
  "exam-eng-ca1":{title:"English - CA Test 1",subject:"English",dur:60,total:14,pass:6,inst:"Answer all. Essay ~250 words.",qs:EQ},
};

function doGrade(qs:Q[],ans:Record<string,string>){let sc=0,tot=0;const rs:any[]=[];for(const q of qs){tot+=q.marks;if(q.type==="essay"){rs.push({qid:q.id,ok:null,got:0,mx:q.marks});continue;}let ok=false;if(q.type==="mcq"||q.type==="true_false")ok=ans[q.id]===q.options?.find(o=>o.isCorrect)?.id;else if(q.type==="fill_blank")ok=(ans[q.id]||"").toLowerCase().trim()===(q.correctAnswer||"").toLowerCase().trim();sc+=ok?q.marks:0;rs.push({qid:q.id,ok,got:ok?q.marks:0,mx:q.marks});}const p=tot>0?Math.round(sc/tot*100):0;const g=p>=75?"A1":p>=70?"B2":p>=65?"B3":p>=60?"C4":p>=55?"C5":p>=50?"C6":p>=45?"D7":p>=40?"E8":"F9";return{sc,tot,p,g,rs};}

export default function ExamPage(){
  const router=useRouter();const params=useParams();const{toast}=useToast();
  const eid=params.id as string;const exam=EX[eid];
  const[on,setOn]=useState(false);const[qi,setQi]=useState(0);
  const[ans,setAns]=useState<Record<string,string>>({});
  const[fl,setFl]=useState<string[]>([]);const[tl,setTl]=useState(0);
  const[done,setDone]=useState(false);const[tabs,setTabs]=useState(0);
  const[res,setRes]=useState<any>(null);

  useEffect(()=>{if(exam)setTl(exam.dur*60);},[exam]);
  useEffect(()=>{if(!on||done)return;const t=setInterval(()=>setTl(p=>{if(p<=1){clearInterval(t);sub();return 0;}return p-1;}),1000);return()=>clearInterval(t);},[on,done]);
  useEffect(()=>{if(!on||done)return;const h=()=>{if(document.hidden)setTabs(p=>{const n=p+1;if(n===1)toast("Tab switch detected!","warning");if(n===2)toast("Final warning!","error");if(n>=3)sub();return n;});};document.addEventListener("visibilitychange",h);return()=>document.removeEventListener("visibilitychange",h);},[on,done]);
  useEffect(()=>{if(!on||done)return;const b=(e:Event)=>e.preventDefault();document.addEventListener("copy",b);document.addEventListener("paste",b);return()=>{document.removeEventListener("copy",b);document.removeEventListener("paste",b);};},[on,done]);

  function fmtTime(s:number):string{const m=Math.floor(s/60);const sc=s%60;return String(m).padStart(2,"0")+":"+String(sc).padStart(2,"0");}

  const sub=useCallback(()=>{if(done||!exam)return;const r=doGrade(exam.qs,ans);setRes(r);setDone(true);toast("Score: "+r.sc+"/"+r.tot+" ("+r.p+"%)",r.p>=50?"success":"warning");},[done,exam,ans,toast]);

  if(!exam)return(<main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center"><div className="text-center"><AlertTriangle className="mx-auto text-brand-orange mb-4" size={48}/><h1 className="font-display text-3xl text-[var(--text-primary)] mb-4">Exam Not Found</h1><p className="text-[var(--text-muted)] mb-6">{"ID: "+eid}</p><button onClick={()=>router.push("/student/exams")} className="px-6 py-3 rounded-full bg-brand-green text-white font-bold">Back</button></div></main>);

  const qs=exam.qs;

  if(!on)return(
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full rounded-[2.5rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        <div className="bg-brand-navy p-8 text-center">
          <Shield className="mx-auto text-brand-green mb-4" size={40}/>
          <h1 className="font-display text-3xl text-white mb-2">{exam.title}</h1>
          <p className="text-white/60">{exam.subject}</p>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {[{l:"Duration",v:exam.dur+"m"},{l:"Questions",v:String(qs.length)},{l:"Marks",v:String(exam.total)},{l:"Pass",v:String(exam.pass)}].map(s=>(
              <div key={s.l} className="p-3 rounded-xl bg-[var(--surface-disabled)] text-center"><div className="font-display text-lg text-[var(--text-primary)]">{s.v}</div><div className="text-[9px] text-[var(--text-muted)] uppercase">{s.l}</div></div>
            ))}
          </div>
          <div className="p-4 rounded-xl bg-brand-green/5 border border-brand-green/20 text-sm text-[var(--text-secondary)]"><strong className="text-brand-green">Instructions:</strong> {exam.inst}</div>
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-[var(--text-secondary)]"><p className="font-bold text-red-500 mb-2">Anti-Cheat Active</p><p>Tab switching: 3 = auto-submit. Copy/paste disabled. Auto-submit on timer.</p></div>
          <button onClick={()=>setOn(true)} className="w-full py-4 rounded-full bg-brand-green text-white font-bold uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"><Shield size={16}/> Begin Exam</button>
          <button onClick={()=>router.push("/student/exams")} className="w-full text-center text-sm text-[var(--text-muted)]">Back to Exams</button>
        </div>
      </div>
    </main>
  );

  if(done&&res)return(
    <main className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-16">
      <div className="max-w-3xl w-full rounded-[2.5rem] bg-[var(--surface-card)] border border-[var(--border-subtle)] shadow-2xl p-10">
        <div className="text-center mb-8">
          <div className={"w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center "+(res.p>=50?"bg-brand-green/20 text-brand-green":"bg-red-500/20 text-red-500")}><CheckCircle2 size={48}/></div>
          <h1 className="font-display text-4xl text-[var(--text-primary)]">EXAM COMPLETE</h1>
          <div className="font-display text-[80px] leading-none text-brand-green mt-4">{res.p+"%"}</div>
          <div className="text-2xl font-display text-[var(--text-primary)]">{"Grade: "+res.g}</div>
          <div className="text-sm text-[var(--text-muted)]">{res.sc+"/"+res.tot+" marks"}</div>
          {tabs>0&&<div className="text-xs text-red-500 mt-2">{tabs+" tab switch(es)"}</div>}
        </div>
        <div className="space-y-3 mb-8">
          <h3 className="font-bold text-[var(--text-primary)]">Question Breakdown</h3>
          {res.rs.map((r:any,i:number)=>{const q=qs.find((x:Q)=>x.id===r.qid);return(
            <div key={r.qid} className={"p-4 rounded-xl border "+(r.ok===true?"bg-brand-green/5 border-brand-green/30":r.ok===false?"bg-red-500/5 border-red-500/30":"bg-brand-orange/5 border-brand-orange/30")}>
              <div className="flex justify-between items-start"><div><div className="text-xs text-[var(--text-muted)]">{"Q"+(i+1)+" - "+q?.topic}</div><div className="text-sm text-[var(--text-primary)]">{q?.questionText.substring(0,80)+"..."}</div></div>
              <span className={"text-xs font-bold px-2 py-0.5 rounded-full "+(r.ok===true?"bg-brand-green/20 text-brand-green":r.ok===false?"bg-red-500/20 text-red-500":"bg-brand-orange/20 text-brand-orange")}>{(r.ok===true?"Correct":r.ok===false?"Wrong":"Pending")+" "+r.got+"/"+r.mx}</span></div>
              {q?.explanation&&r.ok!==null&&<div className="mt-2 text-xs bg-[var(--surface-disabled)] p-2 rounded-lg text-[var(--text-muted)]">{q.explanation}</div>}
            </div>
          );})}
        </div>
        <div className="flex justify-center gap-3">
          <button onClick={()=>router.push("/student/exams")} className="px-6 py-3 rounded-full bg-brand-green text-white font-bold">Back to Exams</button>
          <button onClick={()=>router.push("/student/dashboard")} className="px-6 py-3 rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold">Dashboard</button>
        </div>
      </div>
    </main>
  );

  const q=qs[qi];const ac=Object.keys(ans).length;
  return(
    <main className="min-h-screen bg-[var(--bg-primary)]">
      <div className="sticky top-0 z-40 bg-brand-navy text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div><div className="text-[10px] text-white/60">{exam.subject}</div><div className="font-display text-lg tracking-widest">{exam.title}</div></div>
          <div className="flex items-center gap-4">
            {tabs>0&&<span className="text-[10px] px-2 py-1 rounded-full bg-red-500/20 text-red-500 font-bold">{tabs+" switches"}</span>}
            <div className={"flex items-center gap-2 px-4 py-2 rounded-full font-display "+(tl<300?"bg-red-500 animate-pulse":"bg-brand-green/20")}><Clock size={16}/>{fmtTime(tl)}</div>
            <button onClick={()=>{if(confirm("Submit exam?"))sub();}} className="px-5 py-2 rounded-full bg-brand-orange text-white font-bold text-sm">Submit</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[1fr_300px] gap-8">
        <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-[2rem] p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-brand-green uppercase tracking-widest">{"Q"+(qi+1)+"/"+qs.length}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[var(--surface-disabled)] text-[var(--text-muted)]">{q.type.replace("_"," ")}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green">{q.marks+" marks"}</span>
            </div>
            <button onClick={()=>setFl(p=>p.includes(q.id)?p.filter(f=>f!==q.id):[...p,q.id])} className={"text-xs px-3 py-1.5 rounded-full "+(fl.includes(q.id)?"bg-brand-orange text-white":"bg-[var(--surface-disabled)] text-[var(--text-muted)]")}>
              <Flag size={12} className="inline mr-1"/>{fl.includes(q.id)?"Flagged":"Flag"}
            </button>
          </div>
          <h2 className="font-display text-xl text-[var(--text-primary)] mb-8 leading-relaxed">{q.questionText}</h2>
          {(q.type==="mcq"||q.type==="true_false")&&q.options&&(
            <div className="space-y-3 mb-8">{q.options.map((o,i)=>(
              <button key={o.id} onClick={()=>setAns({...ans,[q.id]:o.id})} className={"w-full text-left p-5 rounded-xl border-2 transition-all "+(ans[q.id]===o.id?"border-brand-green bg-brand-green/5":"border-[var(--border-subtle)] hover:border-brand-green/50")}>
                <span className="inline-flex items-center gap-3"><span className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm "+(ans[q.id]===o.id?"bg-brand-green text-white":"bg-[var(--surface-disabled)] text-[var(--text-muted)]")}>{String.fromCharCode(65+i)}</span><span className="text-[var(--text-primary)]">{o.text}</span></span>
              </button>
            ))}</div>
          )}
          {q.type==="fill_blank"&&<input type="text" value={ans[q.id]||""} onChange={e=>setAns({...ans,[q.id]:e.target.value})} placeholder="Type answer..." className="w-full p-4 rounded-xl bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--input-text)] text-lg font-bold focus:outline-none focus:border-brand-green mb-8"/>}
          {q.type==="essay"&&<div className="mb-8"><textarea value={ans[q.id]||""} onChange={e=>setAns({...ans,[q.id]:e.target.value})} rows={10} placeholder="Write your answer..." className="w-full p-4 rounded-xl bg-[var(--input-bg)] border-2 border-[var(--input-border)] text-[var(--input-text)] focus:outline-none focus:border-brand-green resize-none"/><div className="text-xs text-[var(--text-muted)] mt-1 text-right">{(ans[q.id]||"").split(/\s+/).filter(Boolean).length+" words"}</div></div>}
          <div className="flex justify-between pt-4 border-t border-[var(--border-subtle)]">
            <button onClick={()=>setQi(Math.max(0,qi-1))} disabled={qi===0} className="px-5 py-2.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-sm disabled:opacity-40"><ChevronLeft size={16} className="inline"/> Prev</button>
            <button onClick={()=>qi<qs.length-1?setQi(qi+1):confirm("Submit?")?sub():null} className={"px-5 py-2.5 rounded-full font-bold text-sm text-white "+(qi>=qs.length-1?"bg-brand-orange":"bg-brand-green")}>{qi>=qs.length-1?"Submit":"Next"} <ChevronRight size={16} className="inline"/></button>
          </div>
        </div>
        <aside className="space-y-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6"><div className="text-xs text-[var(--text-muted)] uppercase mb-2">Progress</div><div className="font-display text-3xl text-brand-green">{ac+"/"+qs.length}</div><div className="w-full h-2 rounded-full bg-[var(--surface-disabled)] overflow-hidden mt-2"><div className="h-full bg-brand-green" style={{width:(ac/qs.length*100)+"%"}}/></div></div>
          <div className="bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-2xl p-6"><div className="text-xs text-[var(--text-muted)] uppercase mb-4">Navigator</div><div className="grid grid-cols-5 gap-2">{qs.map((_:Q,i:number)=>(<button key={i} onClick={()=>setQi(i)} className={"aspect-square rounded-lg text-sm font-bold "+(i===qi?"bg-brand-navy text-white ring-2 ring-brand-green":fl.includes(qs[i].id)?"bg-brand-orange/20 text-brand-orange":ans[qs[i].id]?"bg-brand-green/10 text-brand-green":"bg-[var(--surface-disabled)] text-[var(--text-muted)]")}>{i+1}</button>))}</div></div>
          <div className="bg-brand-orange/10 border border-brand-orange/30 rounded-2xl p-4 text-xs text-brand-orange"><Shield size={14} className="inline mr-1"/>{"Anti-Cheat - Tabs: "+tabs+"/3"}</div>
        </aside>
      </div>
    </main>
  );
}
