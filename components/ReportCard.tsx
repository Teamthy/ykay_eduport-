import {
  Award,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Printer,
} from "lucide-react";

interface SubjectScore {
  subject: string;
  ca1: number;
  ca2: number;
  midterm: number;
  assignment: number;
  exam: number;
  total: number;
  grade: string;
}

export interface ReportCardProps {
  studentName: string;
  studentClass: string;
  studentId: string;
  session: string;
  term: string;
  studentPhoto?: string;
  subjects: SubjectScore[];
  attendancePresent: number;
  attendanceTotal: number;
  overallTotal: number;
  overallAverage: number;
  overallGrade: string;
  classPosition?: string;
  classTeacherRemark: string;
  directorRemark: string;
  nextResumption: string;
  feeBalance?: number;
  reportNo: string;
}

function gradeColor(grade: string): string {
  if (grade === "A1") return "text-ykay-green";
  if (grade.startsWith("A")) return "text-ykay-green";
  if (grade.startsWith("B")) return "text-ykay-green-dark";
  if (grade.startsWith("C")) return "text-ykay-orange";
  if (grade.startsWith("D")) return "text-ykay-orange";
  if (grade.startsWith("E")) return "text-red-400";
  return "text-red-500";
}

export default function ReportCard({
  studentName,
  studentClass,
  studentId,
  session,
  term,
  subjects,
  attendancePresent,
  attendanceTotal,
  overallTotal,
  overallAverage,
  overallGrade,
  classPosition,
  classTeacherRemark,
  directorRemark,
  nextResumption,
  feeBalance,
  reportNo,
}: ReportCardProps) {
  const attendanceRate = Math.round((attendancePresent / attendanceTotal) * 100);

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 md:p-8 font-body print:bg-white print:p-0">
      <div className="mx-auto max-w-[900px] bg-white rounded-[2rem] shadow-2xl shadow-ykay-green/10 border border-ykay-navy-03 overflow-hidden print:shadow-none print:rounded-none print:border-none">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-br from-[#0F1F2E] via-[#1A3148] to-[#0F1F2E] px-8 md:px-14 py-12 md:py-16 overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full h-full opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 50%, #52B848 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-ykay-green/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-ykay-orange/10 blur-2xl" />

          <div className="relative z-10 text-center">
            <h1 className="font-display text-[28px] md:text-[42px] tracking-[6px] text-white mb-1">
              YKAY COLLEGE
            </h1>
            <p className="font-display text-xs md:text-sm tracking-[0.3em] text-white/30 uppercase mb-1">
              Leadership Academy
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-ykay-green to-transparent mx-auto mb-4" />
            <h2 className="font-display text-lg md:text-2xl tracking-[3px] text-white">
              TERM REPORT CARD
            </h2>
            <div className="font-body text-[10px] md:text-xs text-white/20 tracking-[0.15em] mt-2 uppercase">
              {session} · {term} · {reportNo}
            </div>
          </div>
        </div>

        {/* Student Info */}
        <div className="px-8 md:px-14 py-8 border-b border-ykay-navy-05">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-display text-[10px] tracking-[0.2em] text-ykay-navy/20 uppercase mb-2">
                Student Information
              </h3>
              <div className="font-display text-xl tracking-[2px] text-ykay-navy">
                {studentName}
              </div>
              <div className="font-body text-sm text-ykay-navy/40">Class: {studentClass}</div>
              <div className="font-body text-xs text-ykay-navy/20">ID: {studentId}</div>
            </div>
            <div>
              <h3 className="font-display text-[10px] tracking-[0.2em] text-ykay-navy/20 uppercase mb-2">
                Academic Details
              </h3>
              <div className="font-body text-sm text-ykay-navy/60">{subjects.length} Subjects</div>
              <div className="font-body text-xs text-ykay-navy/20">{session}</div>
            </div>
            <div className="text-right md:text-right">
              <h3 className="font-display text-[10px] tracking-[0.2em] text-ykay-navy/20 uppercase mb-2">
                Overall Performance
              </h3>
              <div className="font-display text-4xl tracking-[2px] text-ykay-green">
                {overallAverage}%
              </div>
              <div className={`font-display text-xl tracking-[3px] ${gradeColor(overallGrade)}`}>
                {overallGrade}
              </div>
              {classPosition && (
                <div className="font-body text-xs text-ykay-navy/30 mt-1">
                  Position: {classPosition}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Subject Table */}
        <div className="px-8 md:px-14 py-8">
          <h3 className="font-display text-lg tracking-[2px] text-ykay-navy mb-4">
            Subject Scores
          </h3>
          <div className="overflow-x-auto rounded-xl border border-ykay-navy-05">
            <table className="w-full text-xs md:text-sm">
              <thead className="bg-[#0F1F2E]">
                <tr>
                  {[
                    "Subject",
                    "CA 1 (10)",
                    "CA 2 (10)",
                    "Mid-Term (10)",
                    "Assignment (10)",
                    "Exam (60)",
                    "Total",
                    "Grade",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-display text-[9px] md:text-[10px] tracking-[0.15em] uppercase text-white/50"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjects.map((subj) => (
                  <tr
                    key={subj.subject}
                    className="border-b border-ykay-navy-05 hover:bg-[#F5F7FA]/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-body text-sm font-bold text-ykay-navy">
                      {subj.subject}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ykay-navy/50 text-center">
                      {subj.ca1}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ykay-navy/50 text-center">
                      {subj.ca2}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ykay-navy/50 text-center">
                      {subj.midterm}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ykay-navy/50 text-center">
                      {subj.assignment}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-ykay-navy/50 text-center">
                      {subj.exam}
                    </td>
                    <td className="px-4 py-3 font-display text-base tracking-[1px] text-ykay-green font-bold text-center">
                      {subj.total}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.1em] ${
                          subj.total >= 70
                            ? "bg-ykay-green/10 text-ykay-green"
                            : subj.total >= 45
                              ? "bg-ykay-orange/10 text-ykay-orange"
                              : "bg-red-500/10 text-red-500"
                        }`}
                      >
                        {subj.grade}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-[#F5F7FA] font-bold">
                  <td className="px-4 py-3 font-display text-xs tracking-[2px] text-ykay-navy">
                    Overall
                  </td>
                  <td colSpan={5} className="px-4 py-3" />
                  <td className="px-4 py-3 font-display text-lg tracking-[2px] text-ykay-green text-center">
                    {overallTotal}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.1em] ${gradeColor(overallGrade)}`}
                    >
                      {overallGrade}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Attendance + Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 md:px-14 py-8">
          {/* Attendance */}
          <div className="rounded-2xl bg-[#F5F7FA] border border-ykay-navy-05 p-6">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={16} className="text-ykay-green" />
              <h3 className="font-display text-sm tracking-[2px] text-ykay-navy">Attendance</h3>
            </div>
            <div className="font-display text-4xl tracking-[2px] text-ykay-green">
              {attendanceRate}%
            </div>
            <div className="w-full h-2 rounded-full bg-ykay-navy-05 mt-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ykay-green to-ykay-green-light"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
            <p className="font-body text-[11px] text-ykay-navy/20 mt-2">
              {attendancePresent} / {attendanceTotal} days present
            </p>
          </div>

          {/* Teacher Remark */}
          <div className="rounded-2xl bg-[#F5F7FA] border border-ykay-navy-05 p-6 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} className="text-ykay-orange" />
              <h3 className="font-display text-sm tracking-[2px] text-ykay-navy">Remarks</h3>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-body text-[10px] font-bold tracking-[0.15em] uppercase text-ykay-navy/20 mb-1">
                  Class Teacher Remark
                </h4>
                <p className="font-body text-sm text-ykay-navy leading-relaxed">
                  {classTeacherRemark}
                </p>
              </div>
              <div className="pt-3 border-t border-ykay-navy-05">
                <h4 className="font-body text-[10px] font-bold tracking-[0.15em] uppercase text-ykay-navy/20 mb-1">
                  Director&apos;s Remark
                </h4>
                <p className="font-body text-sm text-ykay-navy leading-relaxed">{directorRemark}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Fee + Resumption + Signature */}
        <div className="px-8 md:px-14 py-8 border-t border-ykay-navy-05">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl bg-[#F5F7FA] border border-ykay-navy-05 px-6 py-5">
              <h4 className="font-display text-[10px] tracking-[0.15em] uppercase text-ykay-navy/20 mb-2">
                Next Term Resumption
              </h4>
              <div className="font-display text-xl tracking-[2px] text-ykay-green">
                {nextResumption}
              </div>
            </div>
            <div className="rounded-xl bg-[#F5F7FA] border border-ykay-navy-05 px-6 py-5">
              <h4 className="font-display text-[10px] tracking-[0.15em] uppercase text-ykay-navy/20 mb-2">
                Fee Balance
              </h4>
              <div
                className={`font-display text-xl tracking-[2px] ${feeBalance && feeBalance > 0 ? "text-ykay-orange" : "text-ykay-green"}`}
              >
                {feeBalance && feeBalance > 0 ? `₦${feeBalance.toLocaleString()}` : "Fully Paid"}
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-r from-[#0F1F2E] to-[#1A3148] border border-white/5 px-6 py-5 text-white">
              <h4 className="font-display text-[10px] tracking-[0.15em] uppercase text-white/30 mb-2">
                School Stamp / Signature
              </h4>
              <div className="font-display text-sm tracking-[2px] text-white/60">
                Ykay College &amp; Leadership Academy
              </div>
              <div className="font-body text-[10px] text-white/20 mt-1">
                Km 38, Lagos-Abeokuta Expressway, Sango Ota
              </div>
              <div className="w-12 h-0.5 bg-gradient-to-r from-ykay-green/40 to-transparent mt-3 rounded-full" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0F1F2E]/5 px-8 md:px-14 py-5 border-t border-ykay-navy-05 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="font-body text-[10px] text-ykay-navy/15 tracking-[0.1em]">
            OFFICIAL REPORT CARD · {reportNo}
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-ykay-green text-white font-body text-xs font-bold hover:bg-ykay-green-dark transition-all shadow-md shadow-ykay-green-20"
          >
            <Printer size={14} /> Print / Download
          </button>
        </div>
      </div>
    </div>
  );
}
