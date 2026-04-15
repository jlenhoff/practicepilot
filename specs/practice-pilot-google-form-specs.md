# PRACTICE PILOT — GOOGLE FORM SPECS
## All Five Forms: Build Guide
### Version 1.0 — April 2026
### Houston Heights Consulting LLC · Practice Pilot

---

## HOW TO USE THIS DOCUMENT

This document contains the complete Google Form build spec for all five Practice Pilot forms. For each form you will find:

- Form title and description
- Section structure
- Every question, type, and options
- Required vs optional
- Conditional logic
- Confirmation message
- Google Form settings

Build each form in Google Forms, then paste the live responder URL into your CONFIG block in the corresponding Apps Script.

---

---

# FORM A — PRE-AUDIT QUESTIONNAIRE

**Form title:** Practice Pilot — Pre-Audit Questionnaire  
**Description:** Complete this before your free 30-minute audit. The more detail you give us, the more useful the call will be — we'll come prepared with specific recommendations for your stack.  
**Collect email addresses:** Yes — automatically  
**Restrict to one response:** No  
**Confirmation message:** You're on the runway. We'll review your responses before the call and come prepared with specific recommendations.  
**Send copy to respondent:** Yes

---

## SECTION 1 — About Your Practice

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Your name | Short answer | Yes | — |
| 2 | Your email | Short answer | Yes | — |
| 3 | Practice name | Short answer | Yes | — |
| 4 | Your role | Dropdown | No | Solo practitioner / Practice owner — group practice / Practice manager / Other |
| 5 | How many clinicians are in your practice? | Multiple choice | Yes | Just me / 2–3 / 4–6 / 7 or more |
| 6 | Do you have admin or office staff? | Multiple choice | Yes | Yes — full time / Yes — part time / No — I handle admin / No — clinicians share it |

---

## SECTION 2 — Your Tech Stack

**Section description:** Every Practice Pilot build is scoped to your existing tools. We don't make you switch systems — we build around what you already use.

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 7 | Which EHR do you use? | Dropdown | Yes | SimplePractice / TherapyNotes / Sessions Health / Jane App / TheraNest / Healthie / None — I don't use an EHR / Other |
| 8 | If you selected Other — which EHR? | Short answer | No | Show only if Q7 = Other |
| 9 | Which email and calendar system does your practice use? | Multiple choice | Yes | Google Workspace (Gmail + Google Calendar) / Microsoft 365 (Outlook + Outlook Calendar) / Personal Gmail or free Google / Other |
| 10 | Do you have a Business Associate Agreement (BAA) with your email or storage provider? | Multiple choice | Yes | Yes we have one / No / Not sure / N/A — no PHI in email |
| 11 | What form tool do you currently use for client intake? | Multiple choice | Yes | EHR built-in forms / Jotform / Google Forms / Typeform / No form — phone or email only / Other |
| 12 | How do new clients primarily reach your practice? (select all that apply) | Checkboxes | Yes | Website contact form / Psychology Today / Phone call / Email / Referrals / Insurance directory / Scheduling link (Calendly etc) / Other |

---

## SECTION 3 — Your Current Workflow

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 13 | How many new client intakes do you receive per month on average? | Multiple choice | Yes | 1–3 per month / 4–8 per month / 9–15 per month / 16 or more |
| 14 | What is your biggest admin time sink right now? (select your top one or two) | Checkboxes | Yes | Manually sending welcome and intake emails / Creating client folders and organizing files / Chasing no-shows and following up / Managing cancellations and reschedules / Tracking referral sources / Calculating and processing payroll / Managing waitlist outreach / Client offboarding and discharge documentation |
| 15 | Walk us through what happens right now when a new client reaches out. | Paragraph | No | Placeholder: Step by step — what do you or your staff do from first contact to first session? |

---

## SECTION 4 — Pain Points and Priorities

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 16 | Have you tried to automate anything in your practice before? | Multiple choice | Yes | Yes — and it worked / Yes — it didn't work out / No — never tried / Not sure what counts |
| 17 | If you could automate one thing starting Monday, what would it be? | Paragraph | No | — |
| 18 | Are there any tools or systems you absolutely cannot or will not change? | Paragraph | No | — |
| 19 | What concerns do you have about automating your practice workflows? | Checkboxes | No | HIPAA compliance and client privacy / Losing the personal touch with clients / Staff having to learn a new system / Cost / Something breaking with no one to fix it / No real concerns — ready to go |

---

## SECTION 5 — Investment and Timeline

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 20 | What investment range are you considering? | Multiple choice | Yes | $500–$1,500 (Tier 1 — Single automation) / $2,500–$4,500 (Tier 2 — Connected system) / $6,000–$10,000 (Tier 3 — Full build) / Not sure — tell me what I need |
| 21 | When are you looking to have something built and running? | Multiple choice | Yes | ASAP — within 2 weeks / Within the next month / 1–3 months / Just exploring for now |
| 22 | Anything else we should know before the call? | Paragraph | No | — |

---

---

# FORM B — PRACTICE PILOT TRIGGER FORM

**Form title:** Practice Pilot — Trigger Form  
**Description:** Use this form to trigger the correct automation sequence. One submit — everything fires automatically.  
**Collect email addresses:** Yes — automatically  
**Restrict to one response:** No  
**Confirmation message:** Sequence queued. Emails will send on schedule. Check your tracking sheet for status.  
**Send copy to respondent:** No

---

## SECTION 1 — Trigger Type

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Select trigger | Multiple choice | Yes | No-Show / Cancellation / New Client Confirmed / Client Discharge / Slot Available — Waitlist |

**Conditional logic:**
- If Q1 = No-Show → show Section 2A
- If Q1 = Cancellation → show Section 2B
- If Q1 = New Client Confirmed → show Section 2C
- If Q1 = Client Discharge → show Section 2D
- If Q1 = Slot Available → show Section 2E

---

## SECTION 1B — Core Client Fields (Always Shown)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 2 | Client name | Short answer | Yes | — |
| 3 | Client email | Short answer | Yes | — |
| 4 | Clinician | Multiple choice | Yes | Hannah / Ron / Other — add your clinicians here |
| 5 | Appointment date | Date | No | — |

---

## SECTION 2A — No-Show Details (Conditional)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 6 | Was this an intake or first appointment? | Multiple choice | No | Yes — first/intake appointment / No — existing client |
| 7 | Notes | Paragraph | No | Any context for this no-show |

---

## SECTION 2B — Cancellation Details (Conditional)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 8 | Cancellation type | Multiple choice | Yes | Standard cancel — outside policy window / Late cancel — within policy window / Practice cancelled |
| 9 | Was this an intake or first appointment? | Multiple choice | No | Yes — first/intake appointment / No — existing client |
| 10 | Notes | Paragraph | No | Any context |

---

## SECTION 2C — New Client Confirmed Details (Conditional)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 11 | Appointment time | Short answer | No | e.g. 2:00 PM |
| 12 | Office location | Short answer | No | Suite or address if multiple locations |
| 13 | Notes for client | Paragraph | No | Anything specific to include in onboarding emails |

---

## SECTION 2D — Discharge Details (Conditional)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 14 | Discharge type | Multiple choice | Yes | Planned / Mutual / Client initiated — ghosting / Practice initiated — hold for review / Unresponsive — went silent mid-scheduling |
| 15 | Was this client a minor? | Multiple choice | No | Yes / No |
| 16 | Notes | Paragraph | No | Any context |

---

## SECTION 2E — Slot Available Details (Conditional)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 17 | Available day and time | Short answer | No | e.g. Tuesdays 3PM |
| 18 | Insurance accepted for this slot | Short answer | No | e.g. Aetna, BCBS, self-pay |
| 19 | Notes | Paragraph | No | Any other details about this opening |

---

---

# FORM C — WAITLIST INTAKE FORM

**Form title:** Practice Pilot — Waitlist Request  
**Description:** Complete this form to be added to our waitlist. We'll reach out as soon as a matching opening becomes available.  
**Collect email addresses:** Yes — automatically  
**Restrict to one response:** No  
**Confirmation message:** You've been added to our waitlist. We'll contact you when a matching opening becomes available. Please check your spam folder if you don't hear from us within a week.  
**Send copy to respondent:** Yes

---

## SECTION 1 — About You

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Your full name | Short answer | Yes | — |
| 2 | Your email | Short answer | Yes | — |
| 3 | Your phone number | Short answer | No | — |
| 4 | Date of this request | Date | Yes | — |

---

## SECTION 2 — Your Preferences

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 5 | Do you have a clinician preference? | Multiple choice | Yes | Hannah / Ron / No preference — match me with whoever is available |
| 6 | What days and times work best for you? | Checkboxes | Yes | Monday mornings / Monday afternoons / Tuesday mornings / Tuesday afternoons / Wednesday mornings / Wednesday afternoons / Thursday mornings / Thursday afternoons / Friday mornings / Friday afternoons |
| 7 | How do you plan to pay? | Multiple choice | Yes | Insurance / Self-pay / Either |
| 8 | If insurance — which carrier? | Short answer | No | Show if Q7 = Insurance |
| 9 | What type of therapy are you looking for? | Multiple choice | Yes | Individual / Couples / Family / Group / Not sure |
| 10 | What brings you to therapy? | Paragraph | Yes | Brief description — this helps us match you with the right clinician |
| 11 | Where did you hear about us? | Short answer | No | — |

---

---

# FORM D — NEW CLIENT INTAKE GATE FORM

**Form title:** [Practice Name] — New Client Request  
**Description:** Before we confirm your consultation, we need a few details to make sure we're the right fit. This takes about 3 minutes.  
**Collect email addresses:** Yes — automatically  
**Restrict to one response:** No  
**Confirmation message:** Thank you — we've received your information and will be in touch shortly to confirm next steps.  
**Send copy to respondent:** Yes

**Note:** This form is the data collection layer for Automation 01 — Intake Flow. It replaces or supplements the practice's existing contact form.

---

## SECTION 1 — About You

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Your full name | Short answer | Yes | — |
| 2 | Your email | Short answer | Yes | — |
| 3 | Your phone number | Short answer | No | — |
| 4 | What type of therapy are you looking for? | Multiple choice | Yes | Individual / Couples / Family / Group / Not sure |
| 5 | How do you plan to pay? | Multiple choice | Yes | Insurance / Self-pay — routes to conditional sections |

---

## SECTION 2 — Insurance Path (Conditional — show if Q5 = Insurance)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 6 | Which insurance carrier? | Short answer | Yes | e.g. Aetna PPO |
| 7 | What brings you to therapy? | Paragraph | Yes | — |
| 8 | Where did you hear about us? | Short answer | No | — |

---

## SECTION 3 — Self-Pay Path (Conditional — show if Q5 = Self-pay)

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 9 | What brings you to therapy? | Paragraph | Yes | — |
| 10 | Where did you hear about us? | Short answer | No | — |

---

---

# FORM E — CLIENT SATISFACTION (POST-DISCHARGE)

**Form title:** [Practice Name] — We'd Love Your Feedback  
**Description:** Thank you for the time we spent together. If you're open to sharing a few thoughts, this takes about 2 minutes and helps us improve.  
**Collect email addresses:** Yes — automatically  
**Restrict to one response:** Yes  
**Confirmation message:** Thank you for taking the time. Your feedback means a lot to us.  
**Send copy to respondent:** No

**Note:** This form is triggered as part of the Client Offboarding sequence (Automation 08, Track A — Planned discharge only). It is not sent for practice-initiated or unresponsive discharge tracks.

---

## SECTION 1 — Your Experience

| # | Question | Type | Required | Options / Notes |
|---|---|---|---|---|
| 1 | Overall how would you rate your experience with our practice? | Linear scale | Yes | 1 (Poor) to 5 (Excellent) |
| 2 | What was most helpful about working with us? | Paragraph | No | — |
| 3 | Is there anything we could have done better? | Paragraph | No | — |
| 4 | Would you recommend us to someone you know? | Multiple choice | No | Yes / No / Maybe |
| 5 | If you're open to it, we'd love to share your feedback publicly. May we use your response as a testimonial? | Multiple choice | No | Yes — you may use my feedback / No — please keep this private |

---

---

# GOOGLE FORM SETTINGS — APPLY TO ALL FORMS

**Presentation:**
- Show progress bar: Yes
- Shuffle question order: No
- Show link to submit another response: Yes (except Form E)

**Responses:**
- Collect email addresses: Yes
- Send copy to respondent: See individual form specs above
- Allow response editing: No

**Access:**
- Restrict to users in your organization: No (clients need to access without a Google account)
- One response per person: See individual form specs above

**After creating each form:**
1. Click Send → get the responder link (not the edit link)
2. Paste the responder link into your Apps Script CONFIG block
3. Set up the onFormSubmit trigger in Apps Script for each form that needs automation
4. Test with a dummy submission before going live
5. Delete test submissions from the Form Responses sheet before launch

---

*Practice Pilot · Google Form Specs v1.0 · April 2026*  
*Houston Heights Consulting LLC · Private Praxis*
