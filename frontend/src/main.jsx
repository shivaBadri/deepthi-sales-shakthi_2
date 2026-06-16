
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import poster from "./assets/bootcamp-poster.jpeg";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const emptyForm = {
  name: "",
  phone: "",
  profession: "",
  details: ""
};

function App() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [paidLead, setPaidLead] = useState(null);

  const whatsappLink = useMemo(() => {
    if (!paidLead) return "#";

    const msg = `Hello Deepthi Madam,

My payment is completed for 21 Magical Sales Online Boot Camp.

Lead ID: ${paidLead.id}
Name: ${paidLead.name}
Mobile: ${paidLead.phone}
Profession: ${paidLead.profession}
Program: ${paidLead.program}
Amount Paid: Rs. ${paidLead.amountInr}
Payment ID: ${paidLead.razorpayPaymentId}

Please confirm my registration.`;

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
        body: JSON.stringify(form)
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.message || "Unable to create payment order.");
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Deepthi Sales Growth",
        description: "21 Magical Sales Online Boot Camp",
        order_id: orderData.orderId,
        prefill: {
          name: form.name,
          contact: form.phone
        },
        notes: {
          leadId: orderData.leadId,
          program: "21 Magical Sales Online Boot Camp"
        },
        theme: {
          color: "#F8C537"
        },
        handler: async function (response) {
          setStatus("Verifying payment...");

          const verifyRes = await fetch(`${API_BASE_URL}/api/payment/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: orderData.leadId,
              ...response
            })
          });

          const verifyData = await verifyRes.json();

          if (!verifyRes.ok || !verifyData.success) {
            throw new Error(verifyData.message || "Payment verification failed.");
          }

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
            <p className="sub">
              Your payment has been verified and your registration is marked as PAID.
            </p>

            <div className="lead-card">
              <p><strong>Lead ID:</strong> {paidLead.id}</p>
              <p><strong>Name:</strong> {paidLead.name}</p>
              <p><strong>Mobile:</strong> {paidLead.phone}</p>
              <p><strong>Profession:</strong> {paidLead.profession}</p>
              <p><strong>Amount:</strong> ₹{paidLead.amountInr}</p>
              <p><strong>Payment ID:</strong> {paidLead.razorpayPaymentId}</p>
            </div>

            <a className="whatsapp-btn" href={whatsappLink} target="_blank" rel="noreferrer">
              Share Confirmation on WhatsApp
            </a>

            <button className="secondary-btn" onClick={() => setPaidLead(null)}>
              Register Another Person
            </button>
          </div>

          <div className="poster-card">
            <img src={poster} alt="21 Magical Sales Bootcamp" />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="hero-layout">
        <div className="content-card">
          <p className="mini-tag">Online Boot Camp</p>
          <h1>21 Magical Sales</h1>
          <h2>21 Days Transformation Journey</h2>
          <p className="sub">
            Transform your mindset, master sales, and create freedom with Deepthi, Sales Growth Coach & Strategist.
          </p>

          <div className="program-grid">
            <div><span>Starts From</span><strong>1st July</strong></div>
            <div><span>Ends On</span><strong>21st July</strong></div>
            <div><span>Timing</span><strong>6:30 AM - 7:30 AM</strong></div>
            <div><span>Fee</span><strong>₹2,100</strong></div>
          </div>

          <img className="poster-inline" src={poster} alt="Deepthi bootcamp" />
        </div>

        <div className="form-card">
          <form onSubmit={submitForm}>
            <h3>Register Now</h3>

            <label>
              Full Name *
              <input
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setErrors({ ...errors, name: "" });
                }}
                placeholder="Enter full name"
              />
              {errors.name && <small>{errors.name}</small>}
            </label>

            <label>
              Mobile Number *
              <input
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, "") });
                  setErrors({ ...errors, phone: "" });
                }}
                maxLength="10"
                inputMode="numeric"
                placeholder="10-digit mobile number"
              />
              {errors.phone && <small>{errors.phone}</small>}
            </label>

            <label>
              Profession *
              <input
                value={form.profession}
                onChange={(e) => {
                  setForm({ ...form, profession: e.target.value });
                  setErrors({ ...errors, profession: "" });
                }}
                placeholder="Student / Employee / Business"
              />
              {errors.profession && <small>{errors.profession}</small>}
            </label>

            <label>
              Details
              <textarea
                value={form.details}
                onChange={(e) => setForm({ ...form, details: e.target.value })}
                rows="3"
                placeholder="Any extra details"
              />
            </label>

            <button className="primary-btn" disabled={loading}>
              {loading ? "Please wait..." : "Pay ₹2,100 & Register"}
            </button>

            {status && <p className="status">{status}</p>}

            <p className="note">
              Success page opens only after Razorpay confirms the payment.
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
