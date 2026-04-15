# PRACTICE PILOT — MARKETING AUTOMATION SYSTEM
## Setup Guide + Google Form Specs
### Version 1.0 — April 2026
### Houston Heights Consulting LLC · Practice Pilot

---

## SYSTEM OVERVIEW

Three automations. Zero PHI. No HIPAA complexity.

| Automation | What it does | Trigger | Human touchpoint |
|---|---|---|---|
| Social Content Engine | Generates a month of social posts → Buffer drafts | 1st of each month | Owner approves drafts in Buffer |
| GBP Keeper | Weekly Google Business Profile post + quarterly audit | Every Monday | Internal alert only — fully auto |
| Referral Partner Outreach | Quarterly touchpoints + new partner welcome | Quarterly + new row added | Review summary email |

---

## WHAT YOU NEED BEFORE SETUP

### Accounts required (client must have or create):

| Tool | Purpose | Cost | Notes |
|---|---|---|---|
| Google Workspace | Runs the script, sends emails | Client already has this | BAA already in place |
| Buffer | Social scheduling | Free tier works, paid for more profiles | buffer.com |
| Google Business Profile | Local search presence | Free | Must be verified 60+ days for API |
| Anthropic API | Content generation | ~$5–10/month at this usage | platform.anthropic.com |

### API keys to collect before going live:

| Key | Where to get it | Store as (Script Property name) |
|---|---|---|
| Anthropic API key | platform.anthropic.com → API Keys | ANTHROPIC_API_KEY |
| Buffer API key | buffer.com → Settings → Developer → Generate API Key | BUFFER_API_KEY |
| GBP Account ID | GBP API setup → account resource name | GBP_ACCOUNT_ID |
| GBP Location ID | GBP API setup → location resource name | GBP_LOCATION_ID |
| GBP Access Token | Google OAuth flow | GBP_ACCESS_TOKEN |

### To store API keys in Script Properties:
1. Open Apps Script editor
2. Go to Project Settings (gear icon)
3. Scroll to Script Properties
4. Add each key-value pair
5. Never paste keys directly in the code

---

## GOOGLE FORM SPECS

---

### FORM 1 — CONTENT PROFILE FORM

**Form title:** Practice Pilot — Marketing Content Profile  
**Description:** Complete this once. We'll use it every month to generate content that actually sounds like your practice. Takes about 10 minutes.  
**Collect email addresses:** Yes  
**Confirmation message:** Content profile saved. Your practice voice and preferences will be used for all content generation going forward.  
**Send copy to respondent:** Yes

---

#### SECTION 1 — Practice Identity

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Practice name | Short answer | Yes |
| 2 | Your name | Short answer | Yes |
| 3 | City or neighborhood | Short answer | Yes |
| 4 | Practice type | Multiple choice | Yes |
| 5 | Website URL | Short answer | No |

**Q4 options:** Solo practice / Small group practice (2–5) / Group practice (6+)

---

#### SECTION 2 — Who You Serve

| # | Question | Type | Required |
|---|---|---|---|
| 6 | Primary clients | Checkboxes | Yes |
| 7 | Specialties | Checkboxes | Yes |
| 8 | Other specialties not listed | Short answer | No |
| 9 | Modalities used | Checkboxes | Yes |

**Q6 options:** Adults 18–35 / Adults 35–60 / Older adults 60+ / Adolescents 13–17 / Children under 13 / Couples / Families / Groups

**Q7 options:** Trauma / PTSD / Anxiety / Depression / LGBTQ+ affirming / Neurodivergent / ADHD / Autism / Relationship issues / Life transitions / Grief and loss / Burnout / Identity and self-esteem / Addiction / OCD

**Q9 options:** IFS / EMDR / CBT / DBT / ACT / Somatic approaches / Mindfulness-based / Psychodynamic / Narrative therapy / Motivational interviewing

---

#### SECTION 3 — Voice and Tone

| # | Question | Type | Required |
|---|---|---|---|
| 10 | Practice tone | Multiple choice | Yes |
| 11 | What posts should NEVER do | Checkboxes | No |
| 12 | Describe your practice personality in 2–3 sentences | Paragraph | No |
| 13 | Phrases or words you love | Short answer | No |
| 14 | Phrases or words you want to avoid | Short answer | No |

**Q10 options:** Warm and nurturing / Professional and clinical / Direct and empowering / Conversational and relatable / Thoughtful and reflective / Community-oriented

**Q11 options:** Never use jargon without explaining it / Never imply therapy is a quick fix / Never use fear or shame as motivation / Never post about diagnoses without care / Never be preachy / Never make it sound like a sales pitch

---

#### SECTION 4 — Content Preferences

| # | Question | Type | Required |
|---|---|---|---|
| 15 | Platforms posting to | Checkboxes | Yes |
| 16 | Posts per week | Multiple choice | Yes |
| 17 | Content mix | Checkboxes | Yes |
| 18 | Accepting new clients | Multiple choice | Yes |
| 19 | Insurance accepted | Short answer | No |

**Q15 options:** Facebook Page / Facebook Groups / Instagram / LinkedIn / Google Business Profile / Threads

**Q16 options:** 1–2 per week / 3–4 per week / 5–7 per week / GBP only — weekly

**Q17 options:** Psychoeducation / Myth-busting / Normalizing therapy / Seasonal and awareness posts / Clinician spotlights / Practice updates / Reflective prompts / Resources and tips

**Q18 options:** Yes — include CTAs / Limited — mention selectively / No — don't mention availability / Waitlist only

---

#### SECTION 5 — Referral Partners

| # | Question | Type | Required |
|---|---|---|---|
| 20 | Types of providers who refer to you | Checkboxes | Yes |
| 21 | One-sentence description for referral partners | Paragraph | No |
| 22 | Anything specific for referral partners to know | Paragraph | No |

**Q20 options:** Primary care physicians / Psychiatrists / School counselors / Other therapists / Employee assistance programs / Pediatricians / OB/GYN providers / Community organizations

---

### FORM 2 — REFERRAL PARTNER INTAKE FORM

**Note:** This is the form you use internally when adding a new referral partner to the system. It feeds directly into the Referral Partners sheet and triggers the welcome sequence automatically.

**Form title:** Practice Pilot — New Referral Partner  
**Description:** Add a new referral partner to your outreach system. A welcome email will fire automatically within 24 hours.  
**Collect email addresses:** No (admin form — not for partners to fill out)  
**Confirmation message:** Partner added. Welcome email scheduled for 24 hours from now.

---

#### SECTION 1 — Partner Details

| # | Question | Type | Required |
|---|---|---|---|
| 1 | Partner full name | Short answer | Yes |
| 2 | Role | Multiple choice | Yes |
| 3 | If other — specify role | Short answer | No |
| 4 | Organization or practice name | Short answer | Yes |
| 5 | Email address | Short answer | Yes |
| 6 | Phone number | Short answer | No |
| 7 | What kind of clients do they typically refer? | Paragraph | No |
| 8 | Notes | Paragraph | No |
| 9 | How did you connect? | Short answer | No |

**Q2 options:** Primary care physician / Psychiatrist / School counselor / Other therapist / Pediatrician / OB/GYN / EAP / Community organization / Other

**Note:** When this form is submitted, the script will:
1. Write the row to the Referral Partners sheet with Status = "New"
2. Schedule a welcome email for 24 hours later
3. Update Status to "Active" and log the welcome date after sending

---

## SETUP CHECKLIST

### Step 1 — Script setup
- [ ] Create a new Google Sheet called "Practice Pilot Marketing"
- [ ] Run `setupMarketingSheets()` to create all tabs automatically
- [ ] Paste the marketing Apps Script into the editor
- [ ] Add all API keys to Script Properties (never in the code)
- [ ] Update the MKTG_CONFIG block with practice details

### Step 2 — Buffer setup
- [ ] Client creates or logs into buffer.com
- [ ] Connects Facebook Page, Instagram, LinkedIn to Buffer
- [ ] Generates API key in Settings → Developer
- [ ] Provides Buffer profile IDs (run getBufferProfiles() helper to find them)
- [ ] Add key to Script Properties as BUFFER_API_KEY
- [ ] Paste profile IDs into MKTG_CONFIG.bufferProfileIds

### Step 3 — Google Business Profile API setup
- [ ] Confirm GBP is verified and has been active 60+ days
- [ ] Create a Google Cloud Console project
- [ ] Request GBP API access via the contact form (approval takes a few days)
- [ ] After approval, set up OAuth 2.0 credentials
- [ ] Run the OAuth flow to get an access token
- [ ] Store account ID, location ID, and access token in Script Properties
- [ ] **If GBP API setup is too complex:** Skip it. The script will still generate the post and email it to the owner for manual posting. This is acceptable for Tier 1 builds.

### Step 4 — Anthropic API setup
- [ ] Create account at platform.anthropic.com
- [ ] Generate an API key
- [ ] Add to Script Properties as ANTHROPIC_API_KEY
- [ ] Note: Estimated cost at this usage is $3–8/month

### Step 5 — Content Profile
- [ ] Client completes the Content Profile form
- [ ] Review responses and update MKTG_CONFIG accordingly
- [ ] This is the only manual translation step — content profile → CONFIG values

### Step 6 — Referral Partners
- [ ] Create a spreadsheet tab "Referral Partners" (or run setupMarketingSheets())
- [ ] Import existing referral contacts with status = "Active" and last contact = today's date
  (This prevents the quarterly trigger from blasting everyone on day one)
- [ ] New partners added going forward will get the welcome sequence automatically

### Step 7 — Test and launch
- [ ] Run `testSocialEngine()` — verify posts generate and Buffer receives them
- [ ] Run `testGBPPost()` — verify post generates and publishes (or emails if no credentials)
- [ ] Run `testReferralOutreach()` — verify emails send correctly
- [ ] Run `testProfileAudit()` — verify audit reminder email looks right
- [ ] Run `deleteTriggers()` then `createMarketingTriggers()`
- [ ] Confirm all triggers appear in Extensions → Apps Script → Triggers

---

## HIPAA COMPLIANCE NOTE

All three marketing automations are **PHI-free** by design:

- Social media content contains no client information — only general mental health topics
- Google Business Profile posts contain no client information
- Referral partner outreach contains no client information — practice info only
- No BAA is required for any of these automations
- Buffer, Google Business Profile API, and Anthropic API are all acceptable tools for this use case

This is one of the few Practice Pilot products that does not require a PHI audit or BAA verification step.

---

## PRICING GUIDANCE

| Build | Complexity | Price Range |
|---|---|---|
| Social Content Engine only | Low — Buffer API is simple | $500–$750 |
| GBP Keeper only | Medium — GBP API setup is fiddly | $500–$750 |
| Referral Outreach only | Low-Medium | $500–$750 |
| All three as Marketing Pack | High — full setup + content profile | $1,500–$2,500 |
| Marketing Pack + Intake System | Very high — full practice automation | Bundle at Tier 2 price |

**Note:** The GBP API setup (OAuth, project creation, API approval wait) is the most time-consuming part. Price accordingly. If the client is not technical, the "manual GBP posting from email" fallback is a legitimate v1 — upgrade to API publishing later.

---

## ONGOING MAINTENANCE

| Task | Frequency | Who |
|---|---|---|
| Review Buffer drafts before publish | Monthly | Practice owner |
| Update MKTG_CONFIG if practice info changes | As needed | Practice Pilot |
| Refresh GBP OAuth token (expires) | Every 6–12 months | Practice Pilot during support window |
| Add new referral partners to sheet | As needed | Admin or practice owner |
| Update content profile seasonally | Quarterly | Practice owner via form |
| Review and update Anthropic API key if revoked | As needed | Practice Pilot |

---

*Practice Pilot · Marketing Automation Setup Guide v1.0 · April 2026*  
*Houston Heights Consulting LLC · Private Praxis · practicepilot.app*
