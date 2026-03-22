# AI Healthcare Assistant
A hybrid rule-based and AI-assisted system to improve communication across the NHS care pathway.

---

## Overview

The AI Clinical Communication Assistant is a prototype system built for NHS Hack Day.  
It addresses one of the most widely documented challenges in NHS care: communication failures between patients, clinicians, and services.

- Research highlights that poor communication is a major driver of dissatisfaction in the NHS and contributes to delays, misunderstandings, and avoidable harm. (https://digital.nhs.uk/data-and-information/publications/statistical/nhs-workforce-statistics/december-2025)  
- Long‑term patients often experience fragmented communication that leads to missed symptoms or unsafe delays in escalation.   (https://www.england.nhs.uk/south/wp-content/uploads/sites/6/2021/08/nhsmail-guide-for-organisations.pdf)  
- Clinicians are simultaneously burdened by heavy documentation and admin workloads, highlighted in Microsoft’s 2025 Ignite healthcare briefing. (https://bradford.connecttosupport.org/media/xzjferi4/nhsmail-faqs-updated-12-02-21-pdf-version.pdf)

This project demonstrates how structured data collection, rule-based safety logic, and LLM-powered communication support can improve clarity and reduce cognitive load without making clinical decisions.

---

## 🧠 System Architecture

The system uses a hybrid AI architecture:

### 1. Deterministic Rule-Based Engine (Core Logic)
All risk scoring and classification is performed by a fully transparent, manually engineered rule-based model.  
The rule engine calculates scores from structured inputs such as:

- Pain characteristics  
- Radiation  
- Onset & duration  
- Associated symptoms  
- Triggers  
- Past medical history  
- Age  
- Sex  
- Risk factors  

Each feature contributes a fixed weight.  
The sum of these weights maps into 5 clear categories:

- Very Low
- Low
- Medium
- High
- Very High

This avoids black‑box decision making and ensures the logic is explainable, inspectable, and safe.

### 2. Large Language Model (LLM) Layer
Used only for:

- summarising free‑text messages  
- drafting safe, neutral responses  
- rewriting NHS letters in plain English  
- generating timelines and structured explanations  

The LLM does not perform any diagnosis or clinical risk classification.  
It acts purely as a language generation layer on top of deterministic logic.

This mirrors how Microsoft and Epic integrate AI into healthcare: AI assists documentation and communication, while clinical logic remains rule‑based.

---

## Features

### 1. Patient Message Triage
- Analyses vague or admin‑type messages  
- Surfaces potential hidden risks  
- Produces safe draft replies  
- Asks clarifying questions  
- Classifies messages into:  
  High Risk, Uncertain, Low Risk

### 2. Clinical Notes Summariser
- Summarises long patient histories  
- Extracts diagnoses, medications, recent events  
- Builds a readable timeline  
- Reduces clinician cognitive load  
- Inspired by productivity-focused AI work showcased at Microsoft Ignite 2025

### 3. NHS Letter & Results Explainer
- Converts complex NHS letters into plain English  
- Provides clear action steps  
- Highlights red flags  
- Addresses a major patient communication pain point identified in NHS research

### 4. Chest Pain Risk Scoring
A structured and transparent risk-scoring module using:

- deterministic rule-based algorithm  
- symptom weighting  
- duration  
- triggers  
- age & sex modifiers  
- cardiac/lung/digestive/musculoskeletal indicators  

Outputs a Very Low -> Very High risk score with safety-netting.

---

## Example Chest Pain Scoring Logic

| Feature | Example Weight |
|--------|----------------|
| Severe pressure / tightness | +5 |
| Radiation (jaw / left arm) | +4 |
| Shortness of breath | +5 |
| Cold sweat / nausea | +2–4 |
| Duration ≥ 15 min | +5 |
| Occurs at rest | +5 |
| Age ≥ 60 | +4 |
| Female atypical symptoms | +2 |
| Diabetes / Hypertension | +2–3 |

These features are summed to produce a final risk category.  
All scoring rules are visible inside the application.

---

## Tech Stack

- Frontend & Backend: Generated via Lovable AI  
- LLM: Language generation layer (summaries, explanations, replies)  
- Logic Layer: Custom rule-based scoring engine  
- Database: Supabase (used for storing assessments, notes, triage data)  

---

## Test Cases

TEST CASES FOR ALL FOUR MODULES

MODULE 1 — TRIAGE TOOL TEST CASES (/triage):

A. High Risk
Message:
“Hi, I’ve had tightness in my chest since this morning and now it’s spreading to my jaw. I’m feeling breathless too.”

B. Uncertain Risk (GOOD demo)
Message:
“Hi, I need to reschedule my appointment for next Wednesday. Can you help me book another time?”

C. Low Risk
Message:
“Hi, can you please send me a copy of my last blood test report?”

MODULE 2 — CLINICAL NOTES SUMMARISER TEST CASES (/notes):

A. Medium‑Complex Case (Great for timeline)
Past medical history includes type 2 diabetes since 2018.  
HbA1c last month was 64 mmol/mol.  
Reports increasing pins and needles in both feet.  
Retinal screening last year was normal.  
Current medications: Metformin 1g BD and Atorvastatin 20mg.

B. Acute Event
Patient admitted with community-acquired pneumonia.  
Treated with IV co-amoxiclav 3 days, then oral.  
Chest X-ray: right lower lobe consolidation.  
History of COPD diagnosed 2015.


MODULE 3 — LETTER / RESULT EXPLAINER TEST CASES (/explain):

A. NHS Jargon Letter
Dear Patient,  
Your spirometry shows moderate airflow obstruction consistent with COPD. No acute exacerbation noted.  
We advise commencing dual bronchodilator therapy and repeating tests in 12 months.

B. Ultrasound Result
Your ultrasound shows gallstones without duct dilation.  
Referral to surgery may be considered if symptoms continue.


MODULE 4 — CHEST PAIN SCORING TEST CASES (Very Low → Very High):

1. VERY LOW RISK
Musculoskeletal pain

Patient Information

Sex: Male
Age: 18
Past Medical History: None
Family History of Heart Disease: No
Smoking History: No
Current Medications: None

Chest Pain Characteristics

Pain Type: Sharp/stabbing pain; Pain only with movement or touch
Radiation: None
Duration: Seconds
Onset: Gradual
Triggers: Movement or twisting
Improves with Rest: Yes

Associated Symptoms: None
Cause Category: Musculoskeletal

2. LOW RISK
Heartburn/GERD-like

Patient Information

Sex: Female
Age: 24
Past Medical History: Mild reflux
Family History of Heart Disease: No
Smoking History: No
Current Medications: Omeprazole

Chest Pain Characteristics

Pain Type: Burning/heartburn-like; Indigestion-like
Radiation: None
Duration: 5–15 minutes
Onset: Gradual
Triggers: Eating
Improves with Rest: Yes

Associated Symptoms: None
Cause Category: Digestive

3. MEDIUM RISK
Pleuritic pain

Patient Information

Sex: Male
Age: 35
Past Medical History: Asthma
Family History of Heart Disease: No
Smoking History: Ex-smoker
Current Medications: Salbutamol

Chest Pain Characteristics

Pain Type: Sharp/stabbing pain
Radiation: None
Duration: 15 minutes or more
Onset: Sudden
Triggers: Deep breathing
Improves with Rest: No

Associated Symptoms: Cough
Cause Category: Lung-related

4. HIGH RISK
Exertional tightness

Patient Information

Sex: Male
Age: 52
Past Medical History: Hypertension
Family History of Heart Disease: No
Smoking History: No
Current Medications: Amlodipine

Chest Pain Characteristics

Pain Type: Tightness
Radiation: None
Duration: 5–15 minutes
Onset: Gradual
Triggers: Exercise or exertion
Improves with Rest: Yes

Associated Symptoms: Lightheadedness
Cause Category: Cardiac

5. VERY HIGH RISK
Classic cardiac cluster

Patient Information

Sex: Female
Age: 63
Past Medical History: Diabetes; Hypertension
Family History of Heart Disease: Yes
Smoking History: Yes
Current Medications: Metformin; Ramipril

Chest Pain Characteristics

Pain Type: Sudden severe pressure; Heaviness; Squeezing sensation
Radiation: Jaw; Left arm
Duration: 15 minutes or more
Onset: Sudden
Triggers: No clear trigger; Lying down
Improves with Rest: No

Associated Symptoms: Shortness of breath; Nausea; Cold sweat; Dizziness
Cause Category: Cardiac
