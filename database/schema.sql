-- Live schema for The Soleful Goddess. Applied to Supabase project aqxuzjnlfjfcvjdlrheu.
-- This file documents the deployed database; it contains no customer records or mock availability.

create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  description text not null, price_cents integer, duration_minutes integer,
  active boolean not null default true, bookable boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id),
  guest_name text not null, guest_email text not null, guest_phone text,
  appointment_date date not null, appointment_time time not null,
  status text not null default 'requested' check (status in ('requested','confirmed','cancelled','completed','no_show')),
  notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create unique index if not exists one_active_appointment_per_slot
on public.appointments(appointment_date, appointment_time)
where status in ('requested','confirmed');

alter table public.services enable row level security;
alter table public.appointments enable row level security;

-- Public service reads are allowed. Appointment rows are private.
create policy "Public can read active services" on public.services for select to anon, authenticated using (active = true);
create policy "No public appointment reads" on public.appointments for select to anon, authenticated using (false);
create policy "No direct public appointment writes" on public.appointments for insert to anon, authenticated with check (false);

-- The deployed available_slots and create_appointment functions are the public booking API.
-- They validate service status, date range, approved start times, and duplicate slots.
