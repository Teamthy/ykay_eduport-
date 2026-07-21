import { CheckCircle2, Printer } from "lucide-react";

interface ReceiptProps {
  receiptNo: string;
  date: string;
  studentName: string;
  studentClass: string;
  studentId: string;
  parentName: string;
  parentPhone: string;
  feeItems: { label: string; amount: number; mandatory?: boolean }[];
  totalPaid: number;
  paymentMethod: string;
  paymentReference: string;
  balanceBefore?: number;
}

export default function Receipt({
  receiptNo,
  date,
  studentName,
  studentClass,
  studentId,
  parentName,
  parentPhone,
  feeItems,
  totalPaid,
  paymentMethod,
  paymentReference,
}: ReceiptProps) {
  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6 md:p-10 font-body">
      <div className="mx-auto max-w-[800px] bg-white rounded-[2rem] shadow-xl border border-neutral-200 overflow-hidden">
        {/* Header — Ykay Navy with green accent dots */}
        <div className="bg-brand-navy px-8 md:px-12 py-10 md:py-14 text-center relative overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full h-full opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 50%, #4EC54D 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative z-10">
            <h1 className="font-display text-[36px] md:text-[48px] tracking-[6px] text-white mb-1">
              YKAY COLLEGE
            </h1>
            <p className="font-body text-[11px] tracking-[0.3em] text-white/60 uppercase mb-6">
              Leadership Academy &middot; Sango Ota, Ogun State
            </p>
            <div className="inline-block px-4 py-1.5 rounded-full bg-brand-green/20 border border-brand-green/40 text-brand-green-light text-[10px] font-bold tracking-[0.2em] uppercase">
              Official Receipt
            </div>
          </div>
        </div>

        {/* Receipt number & date */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-8 md:px-12 pt-8 pb-4 border-b border-neutral-200">
          <div>
            <div className="font-display text-xs tracking-[0.2em] text-neutral-500 uppercase mb-1">
              Receipt No.
            </div>
            <div className="font-display text-xl tracking-[2px] text-brand-green">
              {receiptNo}
            </div>
          </div>
          <div>
            <div className="font-display text-xs tracking-[0.2em] text-neutral-500 uppercase mb-1">
              Date
            </div>
            <div className="font-display text-xl tracking-[2px] text-brand-navy">
              {date}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-brand-green/10 text-brand-green text-xs font-bold hover:bg-brand-green hover:text-white transition-all border border-brand-green/20"
          >
            <Printer size={14} /> Print / Download
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="px-8 md:px-12 py-6 border-b md:border-r md:border-b-0 border-neutral-200">
            <h3 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-3">
              Student
            </h3>
            <div className="font-body text-sm font-bold text-brand-navy">
              {studentName}
            </div>
            <div className="font-body text-xs text-neutral-600">Class: {studentClass}</div>
            <div className="font-body text-xs text-neutral-500">ID: {studentId}</div>
          </div>
          <div className="px-8 md:px-12 py-6 border-b border-neutral-200">
            <h3 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-3">
              Parent / Guardian
            </h3>
            <div className="font-body text-sm font-bold text-brand-navy">
              {parentName}
            </div>
            <div className="font-body text-xs text-neutral-600">Phone: {parentPhone}</div>
          </div>
        </div>

        {/* Fee items */}
        <div className="px-8 md:px-12 py-6">
          <h3 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-4">
            Fee Breakdown
          </h3>
          <div className="rounded-xl overflow-hidden border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-brand-navy">
                <tr>
                  <th className="text-left px-5 py-3 font-display text-[10px] tracking-[0.15em] uppercase text-white/80">
                    Item
                  </th>
                  <th className="text-right px-5 py-3 font-display text-[10px] tracking-[0.15em] uppercase text-white/80">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {feeItems.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-neutral-200 last:border-0 bg-white hover:bg-neutral-50 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-body text-sm text-brand-navy">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-green mr-2 align-middle" />
                      {item.label}
                    </td>
                    <td className="px-5 py-3.5 font-body text-sm font-bold text-brand-green text-right">
                      ₦{item.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-neutral-100">
                  <td className="px-5 py-3.5 font-display text-xs tracking-[0.15em] uppercase text-brand-navy">
                    Total Paid
                  </td>
                  <td className="px-5 py-3.5 font-display text-xl tracking-[2px] text-brand-green text-right">
                    ₦{totalPaid.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment details */}
        <div className="px-8 md:px-12 py-6 border-t border-neutral-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-1">
                Payment Method
              </h4>
              <div className="font-body text-sm font-bold text-brand-navy">
                {paymentMethod}
              </div>
            </div>
            <div>
              <h4 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-1">
                Transaction Reference
              </h4>
              <div className="font-body text-xs text-neutral-600 font-mono break-all">
                {paymentReference}
              </div>
            </div>
            <div>
              <h4 className="font-display text-[10px] tracking-[0.2em] text-neutral-500 uppercase mb-1">
                Status
              </h4>
              <div className="inline-flex items-center gap-1.5 text-brand-green font-body text-sm font-bold">
                <CheckCircle2 size={16} /> Confirmed
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-neutral-50 px-8 md:px-12 py-6 border-t border-neutral-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-body text-[11px] text-neutral-500 text-center md:text-left">
            Ykay College &amp; Leadership Academy &middot; Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State
          </div>
          <div className="font-body text-[10px] text-neutral-500 tracking-[0.1em]">
            RECEIPT GENERATED AUTOMATICALLY &middot; {receiptNo}
          </div>
        </div>
      </div>
    </div>
  );
}