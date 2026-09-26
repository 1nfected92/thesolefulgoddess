# Live booking database

Supabase project: `the-soleful-goddess`.

The public site reads active services and open appointment slots from Supabase. The `appointments` table is protected by Row Level Security: visitors cannot list or directly insert appointment records. Public requests go through the validated `create_appointment` database function, which uses a unique partial index to prevent two requests from taking the same slot.

The `available_slots` function generates current openings for the spa's stated daily hours, 12 PM–9 PM, using the four configured start times. It excludes requested and confirmed appointments. There are no seeded appointments, mock availability files, or browser-local booking records.

The `soleful-assistant` Supabase Edge Function is a deterministic, spa-only assistant. It answers predefined questions about services, prices, hours, location, preparation, and policies; reads live availability from Supabase; and submits appointment requests through the validated database function. It has no OpenAI API dependency, no AI secret, and no external provider dependency.

Never place service-role keys, database passwords, or customer records in this public GitHub repository.
