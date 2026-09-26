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
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return values.year + "-" + values.month + "-" + values.day;
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
  const lower = value.toLowerCase();
  if (lower.includes("reflex")) return "Reflexology";
  if (lower.includes("thai")) return "Thai Massage";
  if (lower.includes("sport")) return "Sports Massage";
  if (lower.includes("full body") || lower.includes("full-body")) return "Full Body Massage";
  return null;
}

function isOffTopic(value: string) {
  const unrelated = /\b(weather|forecast|news|politics|recipe|movie|music|anime|crypto|stock|stocks|joke)\b/.test(value);
  const spaContext = /\b(massage|spa|reflex|thai|sport|sports|body|book|appointment|available|availability|opening|openings|slot|price|cost|hour|open|location|address|located|carrollton|relax|contact|prepare|preparation|policy|cancel|reschedule|name|email|date|time|today|tomorrow|feet|foot|tired|stress|tension|muscle|recovery|wear|before|where|direction|recommend|what|which|treatment|service|how much|duration|minutes)\b/.test(value);
  return unrelated || (value.length > 2 && !spaContext && !/^(hi|hello|hey|thanks|thank you|help)\b/.test(value));
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

function recentAssistant(messages: Array<{ role?: string; content?: string }>) {
  return messages.filter((m) => m.role === "assistant").at(-1)?.content || "";
}

function conversational(text: string, messages: Array<{ role?: string; content?: string }>) {
  const previous = recentAssistant(messages);
  if (previous && previous.trim() === text.trim()) return "Absolutely. " + text;
  return text;
}

function conversationName(messages: Array<{ role?: string; content?: string }>) {
  let found: string | null = null;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const value = (message.content || "").trim();
    const explicit = parseName(value);
    if (explicit) found = explicit;
    const previous = (messages[i - 1]?.content || "").toLowerCase();
    const bare = /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(value) ? value : null;
    if (messages[i - 1]?.role === "assistant" && /\b(what name|name should|full name)\b/.test(previous) && bare && !parseEmail(value)) {
      found = bare;
    }
  }
  return found;
}

function conversationEmail(messages: Array<{ role?: string; content?: string }>) {
  for (const message of messages) {
    if (message.role === "user") {
      const email = parseEmail(message.content || "");
      if (email) return email;
    }
  }
  return null;
}

function conversationPhone(messages: Array<{ role?: string; content?: string }>) {
  for (const message of messages) {
    if (message.role === "user") {
      const phone = parsePhone(message.content || "");
      if (phone) return phone;
    }
  }
  return null;
}

function clientMessages(messages: Array<{ role?: string; content?: string }>) {
  return messages.filter((message) => message.role === "user");
}

function latestClientValue<T>(messages: Array<{ role?: string; content?: string }>, parser: (value: string) => T | null) {
  let found: T | null = null;
  for (const message of clientMessages(messages)) {
    const parsed = parser(message.content || "");
    if (parsed) found = parsed;
  }
  return found;
}

function conversationDate(messages: Array<{ role?: string; content?: string }>) {
  return latestClientValue(messages, parseDate);
}

function conversationTime(messages: Array<{ role?: string; content?: string }>) {
  return latestClientValue(messages, parseTime);
}

function conversationService(messages: Array<{ role?: string; content?: string }>) {
  return latestClientValue(messages, serviceName);
}

function serviceDetails(name: string, list: Array<{ name: string; description?: string; price_cents?: number | null; duration_minutes?: number | null; bookable?: boolean }>) {
  const service = list.find((item) => item.name === name);
  if (!service) return null;
  const price = service.price_cents == null ? "pricing is available by phone" : "$" + (service.price_cents / 100).toFixed(0);
  const duration = service.duration_minutes == null ? "duration is discussed when you call" : service.duration_minutes + " minutes";
  const descriptions: Record<string, string> = {
    "Thai Massage": "Assisted stretching, rhythmic compression, and mindful movement for a deeply restorative session",
    "Reflexology": "Focused pressure-point work on the feet to support relaxation, circulation, and whole-body balance",
    "Sports Massage": "Targeted bodywork for active bodies, muscle recovery, and areas of tension",
    "Full Body Massage": "A customized full-body session focused on relaxation and the areas that need attention most"
  };
  const costLine = service.price_cents == null ? "Pricing and duration are available by phone." : "It is " + price + " for " + duration + ".";
  const detail = descriptions[service.name] || service.description || "It can be tailored to your goals";
  return service.name + " — " + costLine + " " + detail + (service.bookable ? "." : ". Please call " + spa.phone + " to schedule this service.");
}

async function handle(messages: Array<{ role?: string; content?: string }>) {
  const all = textOf(messages);
  const latestRaw = messages.filter((m) => m.role === "user").at(-1)?.content || "";
  const latest = latestRaw.toLowerCase();
  const clientText = textOf(clientMessages(messages));
  const date = conversationDate(messages);
  const selectedService = conversationService(messages);
  const list = await services();
  const bookingIntent = /\b(book|booking|reserve|reservation|schedule)\b/.test(clientText) ||
    /\b(make|set up|request|arrange)\b.*\bappointment\b/.test(clientText) ||
    /\b(need|want|looking for)\b.*\b(massage|appointment|session)\b/.test(clientText) ||
    (date && conversationTime(messages));

  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(latest)) {
    const greeting = latest.includes("morning") ? "Good morning" : latest.includes("afternoon") ? "Good afternoon" : latest.includes("evening") ? "Good evening" : "Hi";
    return greeting + ". Welcome to The Soleful Goddess. What would feel best today: learning about a treatment, finding an opening, or starting an appointment request?";
  }
  const previousAssistant = recentAssistant(messages).toLowerCase();
  const isConversationReply = bookingIntent || /\b(name|email|phone|date|time|treatment|massage|appointment|which)\b/.test(previousAssistant);
  if (isOffTopic(latest) && !isConversationReply) {
    return "I’m here specifically for The Soleful Goddess. I can help with our massages, pricing, preparation, location, availability, and appointment requests.";
  }

  if (/\b(which|what|recommend|best|right|suggest)\b/.test(latest) && /\b(massage|treatment|service|feet|foot|tired|active|workout|stress|tight|muscle)\b/.test(latest)) {
    if (selectedService && /\b(what|tell|describe|about|includes|price|cost|duration|long|good)\b/.test(latest)) {
      return serviceDetails(selectedService, list) || "I can explain each treatment and help you choose one.";
    }
    if (/\b(feet|foot|reflex|circulation)\b/.test(latest)) {
      return "If your feet feel tired or you want focused pressure-point work, Reflexology is the best fit. It is $80 for 60 minutes.";
    }
    if (/\b(athlete|active|workout|sport|recovery|muscle)\b/.test(latest)) {
      return "If you are active or recovering from workouts, Sports Massage is the most natural fit. It is scheduled by phone at " + spa.phone + ".";
    }
    if (/\b(stretch|mobility|tight|flexib|deep)\b/.test(latest)) {
      return "If you want stretching and focused compression, Thai Massage is a strong fit. It is $100 for 60 minutes.";
    }
    return "I can help narrow it down. Reflexology is focused on the feet and costs $80 for 60 minutes. Thai Massage includes assisted stretching and costs $100 for 60 minutes. Sports Massage and Full Body Massage are scheduled by phone.";
  }

  if (/\b(hours?|open|close|when)\b/.test(latest) && !bookingIntent) {
    return conversational("We are open every day from 12 PM to 9 PM. If you tell me what day you are considering, I can check the live openings.", messages);
  }
  if (/\b(where|location|address|located|directions|map)\b/.test(latest) && !bookingIntent) {
    return conversational("We are at " + spa.address + ". We welcome guests 18 and older.", messages);
  }
  if (/\b(phone|call|email|contact|instagram)\b/.test(latest) && !bookingIntent) {
    return conversational("You can call " + spa.phone + ", email " + spa.email + ", or visit our Instagram at " + spa.instagram + ".", messages);
  }
  if (/\b(prepare|preparation|before|wear|what should)\b/.test(latest) && !bookingIntent) {
    return "For your visit, arrive a few minutes early, wear comfortable clothing, mention any relevant health concerns before the session, and let your therapist know how the pressure feels during the massage.";
  }
  if (/\b(cancel|reschedule|policy|late|refund)\b/.test(latest) && !bookingIntent) {
    return "For cancellations or rescheduling, please contact the spa directly at " + spa.phone + ". Online requests are submitted for spa confirmation.";
  }

  if (selectedService && /\b(what|tell|describe|about|includes|price|cost|duration|long)\b/.test(latest) && !bookingIntent) {
    return serviceDetails(selectedService, list) || "I can explain each treatment and help you choose one.";
  }

  const wantsAvailability = /\b(available|availability|opening|openings|open slot|slots|calendar|free time)\b/.test(latest);
  if (wantsAvailability && date) {
    const found = await slots(date, date);
    if (!found.length) return "I checked the live calendar, and there are no open slots on " + date + ". Another date may work better.";
    return "I checked the live calendar for " + date + ". The openings are:\n" + found.map(slotLabel).join("\n") + "\n\nTell me which time you prefer and which treatment you want.";
  }
  if (wantsAvailability && !date) {
    return "I can check that live. Which date would you like to look at? You can say “tomorrow” or send a date such as 2026-10-04.";
  }

  if (bookingIntent) {
    const service = list.find((s) => s.name === selectedService);
    const bareName = /^[A-Za-z][A-Za-z .'-]{1,60}$/.test(latestRaw.trim()) ? latestRaw.trim() : null;
    const name = conversationName(messages) || (/\bwhat name\b|\bname should\b/.test(previousAssistant) ? bareName : null);
    const email = conversationEmail(messages);
    const phone = conversationPhone(messages);
    const time = conversationTime(messages);

    if (!service) {
      return "I can help arrange that. Which treatment would you like: Thai Massage, Reflexology, Sports Massage, or Full Body Massage?";
    }
    if (!date) return service.name + " is a good choice. What date would you like to visit?";
    if (!time) {
      const changedDate = parseDate(latest);
      const dateLabel = /\btoday\b/.test(latest) ? "today" : /\btomorrow\b/.test(latest) ? "tomorrow" : date;
      return changedDate ? "Got it — I’ll use " + dateLabel + " for your " + service.name + ". What time would you prefer? Our standard appointment times are 12 PM, 2 PM, 4:30 PM, and 7 PM." : "I found the date. What time would you prefer? Our standard appointment times are 12 PM, 2 PM, 4:30 PM, and 7 PM.";
    }
    if (!name) return "That time can be checked for you. What name should I put on the appointment request?";
    if (!email) return "Thanks, " + name + ". What email should the spa use for confirmation?";
    if (!service.bookable) return service.name + " is scheduled by phone rather than online. Please call " + spa.phone + " and the spa can help you directly.";

    const open = await slots(date, date);
    const chosen = open.find((s) => s.appointment_time.slice(0, 5) === time);
    if (!chosen) return "I’m sorry, that time is no longer open on " + date + ". The remaining openings are:\n" + (open.length ? open.map(slotLabel).join("\n") : "none") + "\n\nTell me another time and I’ll check it.";
    try {
      await createBooking({ service_id: service.id, guest_name: name, guest_email: email, guest_phone: phone, appointment_date: date, appointment_time: time + ":00" });
      return "You’re all set. I submitted a " + service.name + " request for " + date + " at " + slotLabel({ appointment_date: date, appointment_time: time + ":00" }).split(" at ")[1] + " under " + name + ". The spa will confirm the appointment using " + email + ".";
    } catch {
      return "That opening was just taken or could not be reserved. Please choose another time from the live calendar.";
    }
  }

  if (/\b(testimonial|review|reviews)\b/.test(latest)) {
    return "You can browse guest experiences on our Testimonials page. If you tell me what you want help with—stress relief, foot work, stretching, or recovery—I can point you toward the most suitable treatment.";
  }

  if (/\b(service|services|massage|price|prices|cost|costs|how much|duration|minutes)\b/.test(latest)) {
    const lines = list.map((s) => serviceDetails(s.name, list));
    return "Here is the current treatment menu:\n" + lines.join("\n");
  }

  return "I can help with a treatment recommendation, service details, live openings, or an appointment request. What are you hoping to feel better from today?";
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
