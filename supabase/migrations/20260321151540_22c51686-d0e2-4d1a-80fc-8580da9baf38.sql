CREATE TABLE public.chest_pain_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age INTEGER NOT NULL,
  pain_description TEXT NOT NULL,
  onset TEXT NOT NULL,
  duration TEXT NOT NULL,
  triggers TEXT,
  improves_with_rest TEXT NOT NULL,
  radiation TEXT,
  associated_symptoms TEXT,
  past_medical_history TEXT,
  family_history TEXT,
  smoking_history TEXT,
  medications TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ai_risk_level TEXT,
  ai_summary TEXT,
  ai_reasoning TEXT,
  ai_advice TEXT
);

ALTER TABLE public.chest_pain_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert access to chest_pain_assessments"
  ON public.chest_pain_assessments FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Allow public read access to chest_pain_assessments"
  ON public.chest_pain_assessments FOR SELECT TO public
  USING (true);

CREATE POLICY "Allow public update access to chest_pain_assessments"
  ON public.chest_pain_assessments FOR UPDATE TO public
  USING (true);