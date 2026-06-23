
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import poster from "./assets/bootcamp-poster.jpeg";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const PROGRAMS = {
  "sales-growth-mentorship": {
    id: "sales-growth-mentorship",
    name: "Sales Growth Mentorship",
    amountInr: 5000,
    tagline: "Focused mentorship to improve sales confidence, process and conversion.",
    badge: "Mentorship"
  },
  "sales-shakthi": {
    id: "sales-shakthi",
    name: "Sales Shakthi",
    amountInr: 9999,
    tagline: "Premium sales transformation program for stronger sales execution.",
    badge: "Premium Program"
  }
};

const emptyForm = { name: "", phone: "", profession: "", details: "" };

function App() {
  const [selectedProgramId, setSelectedProgramId] = useState("sales-growth-mentorship");
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [paidLead, setPaidLead] = useState(null);

  const selectedProgram = PROGRAMS[selectedProgramId];

  const whatsappLink = useMemo(() => {
    if (!paidLead) return "#";
    const msg = `Hello Deepthi Madam,

Payment has been successfully completed and verified by Razorpay.

Lead ID: ${paidLead.id}
Name: ${paidLead.name}
Mobile: ${paidLead.phone}
Profession: ${paidLead.profession}
Program: ${paidLead.programName}
Amount Paid: Rs. ${paidLead.amountInr}
Payment ID: ${paidLead.razorpayPaymentId}

Registration has been automatically confirmed.`;
    return `https://wa.me/918801028315?text=${encodeURIComponent(msg)}`;
  }, [paidLead]);

  function validate() {
    const e = {};
    if (form.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = "Please enter a valid 10-digit mobile number.";
    if (form.profession.trim().length < 2) e.profession = "Please enter your profession.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!validate()) return;
    if (!window.Razorpay) {
      setStatus("Payment service not loaded. Please refresh and try again.");
      return;
    }

    setLoading(true);
    setStatus("Creating secure payment...");

    try {
      const orderRes = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, programId: selectedProgramId })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) throw new Error(orderData.message || "Unable to create payment order.");

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Deepthi Sales Growth",
        description: orderData.program.name,
        order_id: orderData.orderId,
        prefill: { name: form.name, contact: form.phone },
        notes: { leadId: orderData.leadId, programId: selectedProgramId, programName: orderData.program.name },
        theme: { color: "#F8C537" },
        handler: async function (response) {
          setStatus("Verifying payment...");
          const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leadId: orderData.leadId, ...response })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) throw new Error(verifyData.message || "Payment verification failed.");

          setPaidLead(verifyData.lead);
          setStatus("Payment verified successfully.");
          setForm(emptyForm);
        },
        modal: {
          ondismiss: function () {
            setStatus("Payment window closed. Registration is not completed.");
            setLoading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", function (response) {
        setStatus(response.error?.description || "Payment failed. Please try again.");
        setLoading(false);
      });
      razorpay.open();
    } catch (error) {
      setStatus(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (paidLead) {
    return (
      <main className="page">
        <section className="success-layout">
          <div className="success-card">
            <div className="check">✓</div>
            <p className="mini-tag">Payment Verified</p>
            <h1>Registration Successful</h1>
            <p className="sub">Your payment has been verified and your registration is marked as PAID.</p>
            <div className="lead-card">
              <p><strong>Lead ID:</strong> {paidLead.id}</p>
              <p><strong>Name:</strong> {paidLead.name}</p>
              <p><strong>Mobile:</strong> {paidLead.phone}</p>
              <p><strong>Profession:</strong> {paidLead.profession}</p>
              <p><strong>Program:</strong> {paidLead.programName}</p>
              <p><strong>Amount:</strong> ₹{paidLead.amountInr}</p>
              <p><strong>Payment ID:</strong> {paidLead.razorpayPaymentId}</p>
            </div>
            <a className="whatsapp-btn" href={whatsappLink} target="_blank" rel="noreferrer">Share Confirmation on WhatsApp</a>
            <button className="secondary-btn" onClick={() => setPaidLead(null)}>Register Another Person</button>
          </div>
          <div className="poster-card"><img src={poster} alt="Deepthi sales program" /></div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero-layout">
        <div className="content-card">
          <p className="mini-tag">Deepthi Sales Programs</p>
          <h1>Choose Your Sales Program</h1>
          <p className="sub">Register for the right program and complete payment securely through Razorpay.</p>
          <div className="program-options">
            {Object.values(PROGRAMS).map((program) => (
              <button key={program.id} type="button" className={selectedProgramId === program.id ? "program-card active" : "program-card"} onClick={() => { setSelectedProgramId(program.id); setStatus(""); }}>
                <span>{program.badge}</span>
                <strong>{program.name}</strong>
                <em>₹{program.amountInr.toLocaleString("en-IN")}</em>
                <p>{program.tagline}</p>
              </button>
            ))}
          </div>
          <img className="poster-inline" src={poster} alt="Deepthi sales bootcamp" />
        </div>

        <div className="form-card">
          <form onSubmit={submitForm}>
            <p className="mini-tag">{selectedProgram.badge}</p>
            <h3>{selectedProgram.name}</h3>
            <div className="price-box">₹{selectedProgram.amountInr.toLocaleString("en-IN")}</div>

            <label>Full Name *
              <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: "" }); }} placeholder="Enter full name" />
              {errors.name && <small>{errors.name}</small>}
            </label>

            <label>Mobile Number *
              <input value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/\D/g, "") }); setErrors({ ...errors, phone: "" }); }} maxLength="10" inputMode="numeric" placeholder="10-digit mobile number" />
              {errors.phone && <small>{errors.phone}</small>}
            </label>

            <label>Profession *
              <input value={form.profession} onChange={(e) => { setForm({ ...form, profession: e.target.value }); setErrors({ ...errors, profession: "" }); }} placeholder="Student / Employee / Business" />
              {errors.profession && <small>{errors.profession}</small>}
            </label>

            <label>Details
              <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} rows="3" placeholder="Any extra details" />
            </label>

            <button className="primary-btn" disabled={loading}>{loading ? "Please wait..." : `Pay ₹${selectedProgram.amountInr.toLocaleString("en-IN")} & Register`}</button>
            {status && <p className="status">{status}</p>}
            <p className="note">Success page opens only after Razorpay confirms the payment.</p>
          </form>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
