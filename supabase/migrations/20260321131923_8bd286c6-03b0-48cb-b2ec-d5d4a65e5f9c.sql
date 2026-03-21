-- Create patient_messages table
CREATE TABLE public.patient_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_summary TEXT,
  ai_risk_level TEXT,
  ai_draft_reply TEXT,
  ai_reasoning TEXT
);

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to patient_messages"
  ON public.patient_messages FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to patient_messages"
  ON public.patient_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to patient_messages"
  ON public.patient_messages FOR UPDATE USING (true);

-- Create clinical_notes table
CREATE TABLE public.clinical_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_summary TEXT,
  ai_timeline TEXT,
  ai_key_points TEXT,
  ai_reasoning TEXT
);

ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to clinical_notes"
  ON public.clinical_notes FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to clinical_notes"
  ON public.clinical_notes FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to clinical_notes"
  ON public.clinical_notes FOR UPDATE USING (true);

-- Create patient_letters table
CREATE TABLE public.patient_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  letter_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_plain_english TEXT,
  ai_next_steps TEXT,
  ai_important_warnings TEXT,
  ai_reasoning TEXT
);

ALTER TABLE public.patient_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to patient_letters"
  ON public.patient_letters FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to patient_letters"
  ON public.patient_letters FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to patient_letters"
  ON public.patient_letters FOR UPDATE USING (true);