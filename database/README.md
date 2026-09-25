# Live booking database

Supabase project: `the-soleful-goddess`.

The public site reads active services and open appointment slots from Supabase. The `appointments` table is protected by Row Level Security: visitors cannot list or directly insert appointment records. Public requests go through the validated `create_appointment` database function, which uses a unique partial index to prevent two requests from taking the same slot.

The `available_slots` function generates current openings for the spa's stated daily hours, 12 PM–9 PM, using the four configured start times. It excludes requested and confirmed appointments. There are no seeded appointments, mock availability files, or browser-local booking records.

The chatbot is served by the `soleful-assistant` Supabase Edge Function. It is restricted to spa information and can query live services, availability, and create appointment requests after collecting the required details. Add an `OPENAI_API_KEY` secret in Supabase Edge Function secrets to enable the conversational AI provider. Without that secret, the function returns a setup message and the calendar remains fully functional.

Never place service-role keys, database passwords, AI keys, or customer records in this public GitHub repository.
