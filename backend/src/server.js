
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT || 5000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const PAYMENT_AMOUNT_INR = Number(process.env.PAYMENT_AMOUNT_INR || 2100);
const BRAND_NAME = process.env.BRAND_NAME || "Deepthi Sales Growth";
const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER || "918801028315";
const DATA_FILE = path.join(__dirname, "data", "leads.json");

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

function isConfigured() {
  return Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET &&
    !process.env.RAZORPAY_KEY_ID.includes("your_key") &&
    !process.env.RAZORPAY_KEY_SECRET.includes("your_key")
  );
}

const razorpay = isConfigured()
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
  : null;

async function readLeads() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw || "[]");
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
    return [];
  }
}

async function writeLeads(leads) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

function validateLead(body) {
  const clean = {
    name: String(body.name || "").trim(),
    phone: String(body.phone || "").trim(),
    profession: String(body.profession || "").trim(),
    details: String(body.details || "").trim()
  };

  const errors = {};
  if (clean.name.length < 2) errors.name = "Name is required.";
  if (!/^[6-9]\d{9}$/.test(clean.phone)) errors.phone = "Valid 10-digit Indian mobile number is required.";
  if (clean.profession.length < 2) errors.profession = "Profession is required.";
  if (clean.details.length > 1000) errors.details = "Details must be below 1000 characters.";

  return { clean, errors, valid: Object.keys(errors).length === 0 };
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Deepthi Razorpay backend running",
    razorpayConfigured: isConfigured()
  });
});

app.post("/api/payment/create-order", async (req, res) => {
  try {
    const validation = validateLead(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid form details.",
        errors: validation.errors
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: "Razorpay keys are not configured in backend .env."
      });
    }

    const leadId = "DPS-" + uuidv4().slice(0, 8).toUpperCase();
    const amountPaise = PAYMENT_AMOUNT_INR * 100;

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: leadId,
      notes: {
        leadId,
        name: validation.clean.name,
        phone: validation.clean.phone,
        profession: validation.clean.profession,
        program: "21 Magical Sales Online Boot Camp"
      }
    });

    const lead = {
      id: leadId,
      ...validation.clean,
      program: "21 Magical Sales Online Boot Camp",
      amountInr: PAYMENT_AMOUNT_INR,
      status: "PAYMENT_PENDING",
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      createdAt: new Date().toISOString(),
      paidAt: null
    };

    const leads = await readLeads();
    leads.unshift(lead);
    await writeLeads(leads);

    res.json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      leadId,
      brandName: BRAND_NAME,
      whatsappNumber: WHATSAPP_NUMBER,
      prefill: {
        name: validation.clean.name,
        contact: validation.clean.phone
      }
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Could not create Razorpay order."
    });
  }
});

app.post("/api/payment/verify", async (req, res) => {
  try {
    const {
      leadId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!leadId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification data."
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Success page blocked."
      });
    }

    const leads = await readLeads();
    const index = leads.findIndex(
      (item) => item.id === leadId && item.razorpayOrderId === razorpay_order_id
    );

    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: "Lead record not found."
      });
    }

    leads[index] = {
      ...leads[index],
      status: "PAID",
      razorpayPaymentId: razorpay_payment_id,
      paidAt: new Date().toISOString()
    };

    await writeLeads(leads);

    res.json({
      success: true,
      message: "Payment verified and lead marked as PAID.",
      lead: leads[index],
      whatsappNumber: WHATSAPP_NUMBER
    });
  } catch (error) {
    console.error("Verify error:", error);
    res.status(500).json({
      success: false,
      message: "Could not verify payment."
    });
  }
});

app.get("/api/leads", async (req, res) => {
  const leads = await readLeads();
  res.json({ success: true, count: leads.length, leads });
});

app.get("/api/leads/:id", async (req, res) => {
  const leads = await readLeads();
  const lead = leads.find((item) => item.id === req.params.id);
  if (!lead) return res.status(404).json({ success: false, message: "Lead not found." });
  res.json({ success: true, lead });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: "API not found." });
});

app.listen(PORT, () => {
  console.log(`Deepthi Razorpay backend running on http://localhost:${PORT}`);
  console.log(`Allowed frontend: ${FRONTEND_URL}`);
});
