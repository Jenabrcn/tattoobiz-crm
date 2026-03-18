-- TattooBiz CRM - Initial Database Schema

-- Custom types
CREATE TYPE appointment_type AS ENUM ('tattoo', 'consultation', 'retouche');
CREATE TYPE finance_type AS ENUM ('revenu', 'depense', 'arrhes');
CREATE TYPE payment_method AS ENUM ('carte', 'especes', 'virement');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  studio_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  tag TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  type appointment_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Finances table
CREATE TABLE public.finances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  description TEXT,
  amount NUMERIC(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  category TEXT,
  type finance_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Photos table
CREATE TABLE public.photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_finances_user_id ON public.finances(user_id);
CREATE INDEX idx_finances_date ON public.finances(date);
CREATE INDEX idx_photos_client_id ON public.photos(client_id);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Clients: users can only access their own clients
CREATE POLICY "Users can manage own clients"
  ON public.clients FOR ALL
  USING (auth.uid() = user_id);

-- Appointments: users can only access their own appointments
CREATE POLICY "Users can manage own appointments"
  ON public.appointments FOR ALL
  USING (auth.uid() = user_id);

-- Finances: users can only access their own finances
CREATE POLICY "Users can manage own finances"
  ON public.finances FOR ALL
  USING (auth.uid() = user_id);

-- Photos: users can access photos of their own clients
CREATE POLICY "Users can manage photos of own clients"
  ON public.photos FOR ALL
  USING (
    client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  );

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
