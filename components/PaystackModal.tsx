"use client";

import { useState } from "react";
import { X, CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  amount: number;
  email: string;
  onClose: () => void;
  onSuccess: (ref: string) => void;
}

export default function PaystackModal({ open, amount, email, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"details" | "processing" | "success">("details");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const handlePay = () => {
    setStep("processing");
    setTimeout(() => {
      setStep("success");
      setTimeout(() => {
        const ref = `PSK-${Date.now()}`;
        onSuccess(ref);
        setStep("details");
        onClose();
      }, 2000);
    }, 2500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={step === "details" ? onClose : undefined}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            <div className="bg-[#0ea5e9] p-6 text-white relative">
              {step === "details" && (
                <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0ea5e9] font-bold">P</div>
                <span className="font-bold text-lg">Paystack</span>
              </div>
              <div className="text-xs text-white/70">{email}</div>
              <div className="mt-4">
                <div className="text-xs text-white/70">You are paying</div>
                <div className="font-display text-3xl">₦{amount.toLocaleString()}</div>
              </div>
            </div>

            {step === "details" && (
              <div className="p-6 space-y-4 text-gray-800">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Card Number</label>
                  <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#0ea5e9] focus:outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Expiry</label>
                    <input value={expiry} onChange={e => setExpiry(e.target.value)} placeholder="MM/YY"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#0ea5e9] focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">CVV</label>
                    <input value={cvv} onChange={e => setCvv(e.target.value)} placeholder="123"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#0ea5e9] focus:outline-none" />
                  </div>
                </div>
                <button onClick={handlePay} className="w-full py-4 rounded-lg bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold transition-all flex items-center justify-center gap-2">
                  <Lock size={16} /> Pay ₦{amount.toLocaleString()}
                </button>
                <p className="text-[10px] text-center text-gray-400">Demo mode · No real transaction</p>
              </div>
            )}

            {step === "processing" && (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full border-4 border-[#0ea5e9] border-t-transparent animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Processing payment...</p>
              </div>
            )}

            {step === "success" && (
              <div className="p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="text-green-500" size={40} />
                </div>
                <h3 className="font-bold text-xl text-gray-800 mb-2">Payment Successful</h3>
                <p className="text-sm text-gray-500">Receipt sent to {email}</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
