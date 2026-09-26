import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  keys.default || Deno.env.get("SUPABASE_ANON_KEY") || ""
);

const spa = {
  name: "The Soleful Goddess",
  address: "4425 Plano Pkwy, Suite 803, Carrollton, TX 75010",
  hours: "Every day, 12 PM–9 PM",
  phone: "(214) 277-4853",
  email: "info@thesolefulgoddess.com",
  instagram: "https://www.instagram.com/soleful_goddess_healing/"
};

function reply(text: string, extra: Record<string, unknown> = {}) {
  return new Response(JSON.stringify({ reply: text, ...extra }), { headers: cors });
}

function textOf(messages: Array<{ role?: string; content?: string }>) {
  return messages.map((m) => m.content || "").join(" ").toLowerCase();
}

function centralToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function addDays(dateText: string, days: number) {
  const d = new Date(dateText + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  const iso = value.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return iso[0];
  const us = value.match(/\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](20\d{2}))?\b/);
  if (us) return (us[3] || String(new Date().getUTCFullYear())) + "-" + us[1].padStart(2, "0") + "-" + us[2].padStart(2, "0");
  const today = centralToday();
  if (/\btomorrow\b/.test(value)) return addDays(today, 1);
  if (/\btoday\b/.test(value)) return today;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const found = days.findIndex((day) => value.includes(day));
  if (found >= 0) {
    const now = new Date(today + "T12:00:00Z").getUTCDay();
    return addDays(today, (found - now + 7) % 7 || 7);
  }
  return null;
}

function parseTime(value: string) {
  const twelve = value.match(/\b(1[0-2]|[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (twelve) {
    let hour = Number(twelve[1]);
    if (twelve[3].toLowerCase().startsWith("p") && hour !== 12) hour += 12;
    if (twelve[3].toLowerCase().startsWith("a") && hour === 12) hour = 0;
    return String(hour).padStart(2, "0") + ":" + (twelve[2] || "00");
  }
  const twentyFour = value.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/);
  return twentyFour ? twentyFour[1] + ":" + twentyFour[2] : null;
}

function parseEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
}

function parsePhone(value: string) {
  return value.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/)?.[0] || null;
}

function parseName(value: string) {
  const m = value.match(/\b(?:my name is|i am|i'm|name:)\s+([A-Za-z][A-Za-z .'-]{1,60}?)(?=,|\.|;| email| phone| at | on |$)/i);
  return m?.[1]?.trim() || null;
}

function serviceName(value: string) {
  if (value.includes("reflex")) return "Reflexology";
  if (value.includes("thai")) return "Thai Massage";
  if (value.includes("sport")) return "Sports Massage";
  if (value.includes("full body") || value.includes("full-body")) return "Full Body Massage";
  return null;
}

function isOffTopic(value: string) {
  const unrelated = /\b(weather|forecast|sports|news|politics|recipe|movie|music|anime|crypto|stock|stocks|joke)\b/.test(value);
  const spaWords = ["massage", "spa", "reflex", "thai", "sport", "body", "book", "appointment", "available", "slot", "price", "cost", "hour", "location", "address", "carrollton", "relax", "contact", "prepare", "policy", "cancel", "reschedule", "name", "email", "date", "time", "today", "tomorrow"];
  return unrelated || (value.length > 2 && !spaWords.some((word) => value.includes(word)) && !/^(hi|hello|hey|thanks|thank you|help)\b/.test(value));
}

async function services() {
  const { data, error } = await supabase.from("services")
    .select("id,name,description,price_cents,duration_minutes,bookable")
    .eq("active", true).order("name");
  if (error) throw error;
  return data || [];
}

async function slots(start: string, end: string) {
  const { data, error } = await supabase.rpc("available_slots", { p_start: start, p_end: end });
  if (error) throw error;
  return data || [];
}

function slotLabel(item: { appointment_date: string; appointment_time: string; remaining?: number }) {
  const time = item.appointment_time.slice(0, 5);
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return item.appointment_date + " at " + hour + ":" + String(m).padStart(2, "0") + " " + suffix;
}

async function createBooking(args: { service_id: string; guest_name: string; guest_email: string; guest_phone?: string | null; appointment_date: string; appointment_time: string; notes?: string | null }) {
  const { data, error } = await supabase.rpc("create_appointment", {
    p_service_id: args.service_id,
    p_guest_name: args.guest_name,
    p_guest_email: args.guest_email,
    p_guest_phone: args.guest_phone || null,
    p_appointment_date: args.appointment_date,
    p_appointment_time: args.appointment_time,
    p_notes: args.notes || null
  });
  if (error) throw error;
  return data;
}

async function handle(messages: Array<{ role?: string; content?: string }>) {
  const all = textOf(messages);
  const latest = (messages.filter((m) => m.role === "user").at(-1)?.content || "").toLowerCase();
  if (/^(hi|hello|hey|help)\b/.test(latest)) {
    return "Welcome to The Soleful Goddess. I can answer questions about our massages, prices, hours, location, preparation, policies, live availability, and appointment requests.";
  }
  if (isOffTopic(latest)) {
    return "I can only help with The Soleful Goddess, our massage services, spa information, availability, and appointments.";
  }

  const wantsAvailability = /\b(available|availability|open slot|slots|calendar|free time)\b/.test(latest);
  const wantsBooking = /\b(book|booking|appointment|reserve|reservation|schedule)\b/.test(all);
  const info: string[] = [];
  if (/\b(hours?|open|close|when)\b/.test(latest)) {
    info.push(spa.name + " is open every day from 12 PM to 9 PM.");
  }
  if (/\b(where|location|address|located|directions|map)\b/.test(latest)) {
    info.push("We are located at " + spa.address + ".");
  }
  if (/\b(phone|call|email|contact|instagram)\b/.test(latest)) {
    info.push("Call " + spa.phone + ", email " + spa.email + ", or visit " + spa.instagram + ".");
  }
  if (/\b(prepare|preparation|before|wear|what should)\b/.test(latest)) {
    info.push("Arrive a few minutes early, wear comfortable clothing, share relevant health concerns before treatment, and communicate pressure preferences during your session.");
  }
  if (/\b(cancel|reschedule|policy|late|refund)\b/.test(latest)) {
    info.push("For cancellations, rescheduling, or policy questions, contact the spa directly at " + spa.phone + ". Online requests require spa confirmation.");
  }

  const wantsServices = /\b(service|services|massage|price|prices|cost|costs|how much|duration|minutes)\b/.test(latest);
  if (wantsServices && !wantsAvailability && !wantsBooking) {
    const list = await services();
    const lines = list.map((s) => {
      const price = s.price_cents == null ? "Call for pricing" : "$" + (s.price_cents / 100).toFixed(0);
      const duration = s.duration_minutes == null ? "duration by consultation" : s.duration_minutes + " minutes";
      return s.name + " — " + price + ", " + duration + (s.bookable ? "" : " (call to schedule)");
    });
    info.push("Our current services are:\n" + lines.join("\n"));
  }
  if (info.length && !wantsAvailability && !wantsBooking) return info.join("\n\n");

  const date = parseDate(all);
  const selectedService = serviceName(all);
  if (wantsAvailability && date) {
    const found = await slots(date, date);
    if (!found.length) return "There are no open slots on " + date + ". Please choose another date.";
    return "Open slots for " + date + ":\n" + found.map(slotLabel).join("\n");
  }
  if (wantsAvailability && !date) {
    return "Tell me the date you want to check, such as 2026-10-04, and I will show the live open slots.";
  }

  if (wantsBooking) {
    const list = await services();
    const service = list.find((s) => s.name === selectedService);
    const name = parseName(all);
    const email = parseEmail(all);
    const phone = parsePhone(all);
    const time = parseTime(all);
    const missing: string[] = [];
    if (!service) missing.push("service (Thai Massage or Reflexology)");
    if (!date) missing.push("date");
    if (!time) missing.push("time");
    if (!name) missing.push("full name");
    if (!email) missing.push("email");
    if (missing.length) {
      return "I can submit the appointment request. Please provide your " + missing.join(", ") + ". Online booking is currently available for Thai Massage ($100, 60 minutes) and Reflexology ($80, 60 minutes).";
    }
    if (!service.bookable) return service.name + " is not configured for online booking. Please call " + spa.phone + " to schedule it.";
    const open = await slots(date, date);
    const chosen = open.find((s) => s.appointment_time.slice(0, 5) === time);
    if (!chosen) {
      return "That time is not currently open on " + date + ". Available slots are:\n" + (open.length ? open.map(slotLabel).join("\n") : "none");
    }
    try {
      await createBooking({ service_id: service.id, guest_name: name, guest_email: email, guest_phone: phone, appointment_date: date, appointment_time: time + ":00" });
      return "Your appointment request was submitted for " + service.name + " on " + date + " at " + slotLabel({ appointment_date: date, appointment_time: time + ":00" }).split(" at ")[1] + ". The spa will confirm it using " + email + ".";
    } catch {
      return "That slot was just taken or could not be reserved. Refresh the calendar and choose another available time.";
    }
  }

  if (/\b(testimonial|review|reviews)\b/.test(latest)) {
    return "Guest experiences are published on the Testimonials page. For service-specific questions, I can explain Thai Massage and Reflexology.";
  }

  return "I can help with services, prices, hours, location, preparation, policies, live availability, and appointment requests for The Soleful Goddess.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (!messages.length) return new Response(JSON.stringify({ error: "Invalid conversation" }), { status: 400, headers: cors });
    return reply(await handle(messages));
  } catch {
    return new Response(JSON.stringify({ error: "The spa assistant could not complete that request. Please call (214) 277-4853." }), { status: 500, headers: cors });
  }
});
