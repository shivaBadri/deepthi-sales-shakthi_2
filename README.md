
# Deepthi Razorpay Verified Registration

Production-style flow:

Form with poster → Razorpay payment ₹2,100 → Backend verifies payment → Lead updates as PAID → Success page → WhatsApp receipt option

## Important

This is the correct version when you want success page only after real payment verification.

## Folder Structure

```txt
frontend/   React + Vite website
backend/    Node + Express + Razorpay API + local JSON database
```

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Update `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxx
PAYMENT_AMOUNT_INR=2100
```

Backend health:

```txt
http://localhost:5000/api/health
```

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Deployment

Frontend: Vercel  
Backend: Render / Railway

For Vercel frontend env:

```env
VITE_API_BASE_URL=https://your-backend-url.onrender.com
```

For backend env on Render/Railway:

```env
PORT=5000
FRONTEND_URL=https://your-vercel-url.vercel.app
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
PAYMENT_AMOUNT_INR=2100
```

## Note

Local JSON database is used in:

```txt
backend/src/data/leads.json
```

For long-term production, replace with MongoDB/Supabase.
