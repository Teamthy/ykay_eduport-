"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReportCard from "@/components/ReportCard";
import {
  FileText, CheckCircle2, Send, Eye, Download, Lock, AlertTriangle,
  Printer, BellRing, Check, Mail, MessageCircle, ShieldCheck, Clock
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_REPORTS = [
  {
    id: "RPT-001",
    studentName: "Adeola Ogunlade",
    studentClass: "JSS1",
    studentId: "YKC/2025/001",
    term: "First Term 2025/2026",
    session: "2025/2026",
    status: "Released",
    generated: "2025-07-20",
    delivered: true,
    subjects: [
      { subject: "Mathematics", ca1: 8, ca2: 7, midterm: 9, assignment: 10, exam: 52, total: 86, grade: "A1" },
      { subject: "English Literature", ca1: 6, ca2: 7, midterm: 8, assignment: 8, exam: 48, total: 77, grade: "A1" },
      { subject: "Physics", ca1: 5, ca2: 6, midterm: 7, assignment: 7, exam: 42, total: 67, grade: "B2" },
    ],
    attendancePresent: 11,
    attendanceTotal: 13,
    overallTotal: 230,
    overallAverage: 77,
    overallGrade: "B2",
    classPosition: "3rd / 42",
    classTeacherRemark: "Adeola shows excellent commitment to her studies. Excellent performance in Mathematics and English. Recommended for honors list.",
    directorRemark: "Well done, Adeola. Keep up the excellent work. Your parents and teachers are proud of you.",
    nextResumption: "15 September 2025",
    feeBalance: 45000,
    reportNo: "YKC-RPT-2025-0001",
  },
  {
    id: "RPT-002",
    studentName: "Emmanuel Adebayo",
    studentClass: "SS2",
    studentId: "YKC/2025/002",
    term: "First Term 2025/2026",
    session: "2025/2026",
    status: "Released",
    generated: "2025-07-20",
    delivered: true,
    subjects: [
      { subject: "Physics", ca1: 5, ca2: 6, midterm: 7, assignment: 8, exam: 45, total: 71, grade: "A1" },
      { subject: "Chemistry", ca1: 7, ca2: 6, midterm: 8, assignment: 9, exam: 50, total: 80, grade: "A1" },
    ],
    attendancePresent: 12,
    attendanceTotal: 13,
    overallTotal: 151,
    overallAverage: 76,
    overallGrade: "A1",
    classPosition: "1st / 38",
    classTeacherRemark: "Emmanuel is a top performer. Excellent in all science subjects. Strong leadership qualities.",
    directorRemark: "Outstanding achievement. You are a shining example for the entire student body.",
    nextResumption: "15 September 2025",
    feeBalance: 0,
    reportNo: "YKC-RPT-2025-0002",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminReportCardsPage() {
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<typeof MOCK_REPORTS[0] | null>(null);
  const [bulkStatus, setBulkStatus] = useState<"idle" | "generating" | "done">("idle");
  const [releaseStatus, setReleaseStatus] = useState<Record<string, boolean>>({});

  const handleGenerate = () => {
    setBulkStatus("generating");
    setTimeout(() => {
      setBulkStatus("done");
      alert("Bulk report card generation complete (simulated). All 420 students processed. PDFs stored in simulated S3 storage. Performance: under 10s per card.");
      setTimeout(() => setBulkStatus("idle"), 3000);
    }, 2000);
  };

  const handlePreview = (report: typeof MOCK_REPORTS[0]) => {
    setPreviewData(report);
    setShowPreview(true);
  };

  const handleRelease = (reportId: string) => {
    setReleaseStatus({ ...releaseStatus, [reportId]: true });
    setReports(reports.map((r) => (r.id === reportId ? { ...r, status: "Released", delivered: true } : r)));
    alert(`Report card released for ${reports.find((r) => r.id === reportId)?.studentName} (simulated).\nEmail delivered (SendGrid simulated). WhatsApp delivered (Termii simulated). Parent portal updated.`);
  };

  const releasedCount = reports.filter((r) => r.status === "Released").length;

  return (
    <>
      <Header />
      <main className="bg-[#F5F7FA] min-h-screen">
        {/* Hero */}
        <section className="relative w-full bg-[#0F1F2E] pt-32 pb-14 md:pt-40 md:pb-20 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #52B848 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
          <div className="relative z-10 mx-auto max-w-7xl px-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-block px-3 py-1 rounded-full bg-ykay-green/10 text-ykay-green text-[10px] font-bold tracking-[0.2em] uppercase">Admin Portal</span>
              <span className="text-white/20 text-xs">Session 2025/2026</span>
            </div>
            <h1 className="font-display text-[42px] md:text-[72px] tracking-[4px] text-white leading-[1.05] mb-4">
              REPORT <span className="text-ykay-green">CARDS</span>
            </h1>
            <p className="font-body text-base md:text-lg text-white/30 max-w-2xl">Generate branded term report cards, preview before release, and deliver automatically via email and WhatsApp.</p>
          </div>
        </section>

        <section className="w-full pb-20 md:pb-28 -mt-8 relative z-20">
          <div className="mx-auto max-w-7xl px-6 space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: "Total Reports", value: reports.length.toString(), change: "This term", icon: FileText },
                { label: "Released", value: releasedCount.toString(), change: "Ready for download", icon: CheckCircle2 },
                { label: "Pending", value: (reports.length - releasedCount).toString(), change: "Awaiting admin release", icon: Lock },
                { label: "Delivery Method", value: "Email + WhatsApp", change: "Simulated (Termii + SendGrid)", icon: Mail },
              ].map((stat) => (
                <div key={stat.label} className="rounded-[2rem] bg-white border border-ykay-navy-05 p-6 shadow-sm shadow-ykay-green/5 hover:-translate-y-0.5 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body text-[10px] font-bold tracking-[0.15em] uppercase text-ykay-navy/20">{stat.label}</span>
                    <div className="w-9 h-9 rounded-xl bg-ykay-green/5 flex items-center justify-center text-ykay-green"><stat.icon size={18} strokeWidth={2} /></div>
                  </div>
                  <div className="font-display text-3xl tracking-[2px] text-ykay-navy mb-1">{stat.value}</div>
                  <div className="font-body text-xs text-ykay-green">{stat.change}</div>
                </div>
              ))}
            </div>

            {/* Bulk Generation */}
            <div className="rounded-[2rem] bg-gradient-to-br from-[#0F1F2E] to-[#1A3148] border border-white/5 p-8 md:p-10 shadow-xl shadow-ykay-green/5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="font-display text-2xl tracking-[2px] text-white mb-2">Generate Term Report Cards</h2>
                  <p className="font-body text-sm text-white/30">Bulk generation creates branded PDF report cards for all students. Performance target: under 10 seconds per card.</p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={bulkStatus !== "idle"}
                  className={`inline-flex items-center gap-2 rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] transition-all ${bulkStatus === "idle" ? "bg-ykay-green text-white hover:bg-ykay-green-dark hover:scale-[1.02] shadow-lg shadow-ykay-green-30" :
                      bulkStatus === "generating" ? "bg-ykay-orange text-white cursor-wait shadow-lg shadow-ykay-orange-20" :
                        "bg-ykay-green text-white shadow-lg shadow-ykay-green-20"
                    }`}
                >
                  {bulkStatus === "idle" ? <FileText size={18} /> : bulkStatus === "generating" ? <Clock size={18} /> : <CheckCircle2 size={18} />}
                  {bulkStatus === "idle" ? "Generate All Reports" : bulkStatus === "generating" ? "Generating..." : "Generation Complete"}
                </button>
              </div>
            </div>

            {/* Pre-generation Check */}
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-6">Pre-Generation Check</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "All Scores Entered", status: "Complete", desc: "Gradebook verified for all classes" },
                  { label: "Attendance Records", status: "Complete", desc: "Attendance locked for term" },
                  { label: "Fee Balances Updated", status: "Complete", desc: "All payments reconciled" },
                  { label: "Class Teacher Remarks", status: "Pending", desc: "2 teachers still need to submit remarks" },
                  { label: "Director's Remarks", status: "Complete", desc: "All remarks entered" },
                  { label: "Report Template Verified", status: "Complete", desc: "Branding and layout checked" },
                ].map((check) => (
                  <div key={check.label} className="rounded-xl bg-[#F5F7FA] border border-ykay-navy-05 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${check.status === "Complete" ? "bg-ykay-green" : "bg-ykay-orange"}`} />
                      <span className="font-body text-xs font-bold text-ykay-navy">{check.status}</span>
                    </div>
                    <h4 className="font-body text-sm font-bold text-ykay-navy mb-1">{check.label}</h4>
                    <p className="font-body text-xs text-ykay-navy/30">{check.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Report List */}
            <div className="rounded-[2rem] bg-white border border-ykay-navy-05 p-8 md:p-10 shadow-sm shadow-ykay-green/5">
              <h2 className="font-display text-xl tracking-[2px] text-ykay-navy mb-6">Report Cards</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ykay-navy-05">
                      {["Report No.", "Student", "Class", "Term", "Status", "Generated", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-display text-[10px] tracking-[0.2em] uppercase text-ykay-navy/30">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id} className="border-b border-ykay-navy-05 hover:bg-[#F5F7FA]/30 transition-colors">
                        <td className="px-4 py-4 font-body text-xs text-ykay-green font-bold">{report.reportNo}</td>
                        <td className="px-4 py-4 font-body text-sm font-bold text-ykay-navy">{report.studentName}</td>
                        <td className="px-4 py-4 font-body text-xs text-ykay-navy/40">{report.studentClass}</td>
                        <td className="px-4 py-4 font-body text-xs text-ykay-navy/30">{report.term}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${report.status === "Released" ? "bg-ykay-green/10 text-ykay-green" : "bg-ykay-orange/10 text-ykay-orange"
                            }`}>
                            {report.status === "Released" ? <Check size={9} strokeWidth={3} /> : <Lock size={9} strokeWidth={3} />}
                            {report.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-body text-xs text-ykay-navy/30">{report.generated}</td>
                        <td className="px-4 py-4 flex gap-2">
                          <button onClick={() => handlePreview(report)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-ykay-green/10 text-ykay-green text-[10px] font-bold hover:bg-ykay-green hover:text-white transition-all">
                            <Eye size={10} /> Preview
                          </button>
                          {!releaseStatus[report.id] && (
                            <button onClick={() => handleRelease(report.id)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 bg-ykay-orange/10 text-ykay-orange text-[10px] font-bold hover:bg-ykay-orange hover:text-white transition-all">
                              <Send size={10} /> Release
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 pb-10 px-4 overflow-y-auto" onClick={() => setShowPreview(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-[900px]">
            <ReportCard {...previewData} />
            <div className="flex justify-center mt-6 gap-3">
              <button onClick={() => setShowPreview(false)} className="rounded-full px-6 py-3 bg-white text-ykay-navy font-body text-sm font-bold hover:bg-ykay-green hover:text-white transition-all shadow-xl">Close Preview</button>
              <button onClick={() => window.print()} className="rounded-full px-6 py-3 bg-ykay-green text-white font-body text-sm font-bold hover:bg-ykay-green-dark transition-all shadow-xl shadow-ykay-green-20">Print / Download</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
