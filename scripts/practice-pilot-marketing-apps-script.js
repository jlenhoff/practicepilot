/**
 * ============================================================
 * PRACTICE PILOT — HHT MARKETING AUTOMATION v5.7
 * ============================================================
 *
 * Built by Practice Pilot (Houston Heights Consulting LLC)
 * For: Houston Heights Therapy
 *
 * WHAT THIS DOES:
 * 1. Social Content Engine — Generates 12 AI posts/month with
 *    unique branded images, schedules to Facebook, queues to
 *    Instagram (2/week drip via Monday trigger)
 * 2. GBP Keeper — Weekly Google Business Profile post
 * 3. Referral Partner Outreach — Quarterly personalized emails
 * 4. Flyer Rotation — Weekly clinician/team flyer posts (Fridays)
 *
 * ============================================================
 * v5.7 changes from v5.6
 * ============================================================
 * - CLINICIAN ONBOARDED: Thunder Chen joins at week 1 (priority
 *   "urgent" — new hire needs clients).
 * - ROTATION RENUMBERED 1-4 (thunder, team, hannah, ron).
 * - Added CLINICIAN_FACTS.thunder (credential + schedule fact lock)
 *   and postThunderWelcomeNow() — manual, out-of-band welcome post,
 *   fact-gated like the scheduled path, does not touch the counter.
 * - resetFlyerRotation() log text updated (week 1 is now "thunder").
 *
 * AFTER SAVING THIS FILE, RUN IN THIS ORDER:
 *   1. validateAllFlyers()    -> expect all clean
 *   2. resetFlyerRotation()   -> pointer lands on week 1 (thunder)
 *   3. viewFlyerRotation()    -> expect week1=thunder, no mismatches
 *
 * ============================================================
 * v5.6 changes from v5.5
 * ============================================================
 * - CLINICIAN DEPARTURE: Dami Ezekiel is no longer with the practice.
 *   Removed from CLINICIAN_FACTS and from FLYER_CONFIG.rotation.
 * - ROTATION RENUMBERED 1-3 (team, hannah, ron). Deleting a flyer
 *   without renumbering would have stranded the rotation: the stored
 *   FLYER_ROTATION_WEEK pointer could land on a week number that no
 *   longer exists, find() would return undefined, and postWeeklyFlyer()
 *   would return SILENTLY with no email. The weekly flyer would simply
 *   stop forever and only the 10-day heartbeat would notice.
 * - NEW SELF-HEAL: postWeeklyFlyer() now clamps an out-of-range week
 *   pointer back to 1, emails that it did so, and continues posting.
 *   This makes any future clinician removal safe by default.
 * - TEAM CAPTION DE-COUNTED: it said "Three therapists, one mission."
 *   That count is now wrong, and the team flyer is intentionally NOT
 *   covered by CLINICIAN_FACTS, so validateFlyerFacts_() would not have
 *   caught it. Rewritten with no headcount so it survives staffing
 *   changes without another edit.
 * - resetFlyerRotation() log text updated (week 1 is now "team").
 *
 * AFTER SAVING THIS FILE, RUN IN THIS ORDER:
 *   1. resetFlyerRotation()   -> guarantees a valid stored pointer
 *   2. validateAllFlyers()    -> confirms Hannah + Ron facts still match
 *   3. viewFlyerRotation()    -> eyeball the new 3-week cycle
 *
 * ============================================================
 * v5.5 changes from v5.4
 * ============================================================
 * - FIXED: every Claude call broke when the resolver rotated to
 *   claude-sonnet-5. Extended-thinking models return a "thinking"
 *   block as content[0], so the old data.content[0].text read got
 *   undefined and every generation failed ("unexpected response").
 *   GBP was first to hit it on the Jul 27 2026 Monday run; social,
 *   referral, and pull-quote calls would all have followed.
 * - New helper extractClaudeText_(data) finds the first block whose
 *   type is "text", ignoring thinking/other blocks. Backward-compatible
 *   with text-first models. All 5 Claude parse sites now route through
 *   it: pull quote, social content, GBP, referral touchpoint, welcome.
 * - This is the response-SHAPE analogue of the v5.2 model-NAME resolver:
 *   the system now self-heals against both a model rename and a model
 *   response-format change.
 *
 * ============================================================
 * v5.4 changes from v5.3
 * ============================================================
 * - FIXED: MKTG_CONFIG.practicePhone was still the placeholder
 *   "(713) 000-0000". It is injected into every referral partner
 *   WELCOME email. Corrected to the real number, (281) 245-0123.
 *   Any welcome email sent before this release contains a fake number.
 * - FIXED: MKTG_CONFIG.insuranceAccepted listed United Healthcare
 *   (not a panel) and omitted Beacon. Corrected to the actual Headway
 *   panels: Aetna, Anthem BCBS, Cigna/Evernorth, Beacon, and self-pay.
 *   This value feeds the social content prompt and the welcome email.
 *
 * ============================================================
 * v5.3 changes from v5.2
 * ============================================================
 * - CLINICIAN FACT LOCK: new CLINICIAN_FACTS block is the single
 *   source of truth for each clinician's credential and available
 *   days. validateFlyerFacts_() gates every flyer post; a caption
 *   whose text does not contain the exact locked strings ABORTS the
 *   post and emails why, instead of publishing wrong info.
 * - Gate wired into postWeeklyFlyer() AND postHannahFlyerNow().
 *   Rotation is NOT advanced on a fact-check abort.
 * - FIXED: Ron's caption said "LCSW" (he is LMSW) and "Monday through
 *   Thursday" (he works Monday through Wednesday). Both corrected.
 *   This shipped live to FB + IG in July 2026 and was manually fixed
 *   on-platform; this release fixes the source.
 * - New: validateAllFlyers() — run after any FLYER_CONFIG edit.
 * - New test: testValidateFlyers()
 *
 * Carried from v5.2:
 * - CLAUDE MODEL RESOLVER: no more hardcoded model strings. The
 *   current Sonnet is resolved at runtime from /v1/models and cached
 *   30 days. Self-heals when models retire — getClaudeModel().
 * - SELF-HEAL RETRY: generateGBPPost + generatePostsWithClaude clear
 *   the model cache and retry once on a not_found_error.
 * - deriveAndStorePageToken(): converts the System User token into the
 *   PAGE token (required for FB Page posting).
 *
 * Carried from v5.1 ("zero silent failures"):
 * - System User token aware on META_PAGE_ACCESS_TOKEN (existing prop).
 * - Weekly token check (Sunday), not monthly-on-1st.
 * - refreshMetaToken() deprecated -> loud no-op.
 * - Flyer rotation only advances on real post success.
 * - GBP: all three silent-exit paths now email.
 * - IG queue: only removes published items; retry counter; always reports.
 * - Heartbeat watchdog catches jobs that never ran (orphaned triggers).
 *
 * SETUP:
 * 1. META_PAGE_ACCESS_TOKEN = System User token (Expiration: Never)
 * 2. Run deriveAndStorePageToken()  -> swaps in the Page token
 * 3. Run testModelResolver()        -> confirms current Claude model
 * 4. Run validateAllFlyers()        -> confirms clinician facts clean
 * 5. Run deleteTriggers() then createMarketingTriggers()
 * 6. Run testFlyerPost() / testGBPPost() to verify
 * ============================================================
 */


// ============================================================
// CONFIG
// ============================================================

const MKTG_CONFIG = {
  practiceName:    "Houston Heights Therapy",
  practiceEmail:   "admin@houstonheightstherapy.com",
  ownerEmail:      "joe@houstonheightstherapy.com",
  practicePhone:   "(281) 245-0123",
  practiceWebsite: "https://houstonheightstherapy.com",
  practiceCity:    "Houston Heights, TX",
  practiceType:    "group practice",

  specialties: [
    "trauma and PTSD",
    "anxiety",
    "LGBTQ+ affirming therapy",
    "neurodivergent clients",
    "depression",
    "life transitions"
  ],
  modalities: ["IFS", "EMDR", "CBT", "trauma-informed approaches"],
  clientTypes: ["adults", "couples"],
  insuranceAccepted: "Aetna, Anthem BCBS, Cigna/Evernorth, Beacon, and self-pay",

  tone: "warm, direct, and human — we avoid jargon and toxic positivity",
  avoidPhrases: ["mental health journey", "safe space", "it's okay not to be okay"],
  brandVoice: "We're a trauma-informed group practice that takes a real, human approach to therapy. We don't do toxic positivity or generic advice. Our clients are smart, self-aware people who are ready to do real work.",

  postsPerMonth:    12,
  igPostsPerMonth:  8,
  igPostsPerWeek:   2,
  acceptingClients: true,
  waitlistAvailable: false,

  adminEmail:  "admin@houstonheightstherapy.com",
  notifyEmail: "joe@houstonheightstherapy.com",

  sheets: {
    contentLog:   "Content Log",
    gbpLog:       "GBP Log",
    referralList: "Referral Partners",
    outreachLog:  "Outreach Log"
  },

  referralCadenceDays: 90,
  postIntervalDays: 2,

  githubRepo:  "jlenhoff/practicepilot",
  githubPath:  "generated-images",

  ensoUrl: "https://raw.githubusercontent.com/jlenhoff/practicepilot/main/generated-images/enso.png"
};


// ============================================================
// CLAUDE MODEL RESOLVER — self-healing against model retirement
// ============================================================
//
// Instead of hardcoding a model string that dies when models rotate,
// we resolve the current Sonnet at runtime and cache it for 30 days.
// If a call later 404s on a retired model, forceReresolveModel() clears
// the cache so the next call picks the new one automatically.

const MODEL_FALLBACK   = "claude-sonnet-4-6";   // only used if /v1/models is unreachable
const MODEL_CACHE_KEY  = "RESOLVED_CLAUDE_MODEL";
const MODEL_CACHE_TS   = "RESOLVED_CLAUDE_MODEL_TS";
const MODEL_CACHE_DAYS = 30;

/**
 * Returns the current Sonnet model id. Cached for 30 days.
 */
function getClaudeModel() {
  const props = PropertiesService.getScriptProperties();
  const cached = props.getProperty(MODEL_CACHE_KEY);
  const ts = Number(props.getProperty(MODEL_CACHE_TS) || 0);
  const fresh = cached && (Date.now() - ts < MODEL_CACHE_DAYS * 86400000);
  if (fresh) return cached;

  const resolved = resolveClaudeModel_();
  if (resolved) {
    props.setProperty(MODEL_CACHE_KEY, resolved);
    props.setProperty(MODEL_CACHE_TS, String(Date.now()));
    return resolved;
  }
  return cached || MODEL_FALLBACK;
}

/**
 * Hits /v1/models and returns the newest Sonnet id, or null on failure.
 */
function resolveClaudeModel_() {
  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) return null;
  try {
    const res = UrlFetchApp.fetch("https://api.anthropic.com/v1/models?limit=100", {
      method: "get",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      Logger.log("Model resolve HTTP " + res.getResponseCode() + ": " + res.getContentText().substring(0, 200));
      return null;
    }
    const data = JSON.parse(res.getContentText()).data || [];
    // List comes back newest-first and excludes retired models.
    const sonnet = data.find(m => /sonnet/i.test(m.id));
    if (sonnet) { Logger.log("Resolved Claude model: " + sonnet.id); return sonnet.id; }
    if (data[0]) { Logger.log("No Sonnet found; using newest: " + data[0].id); return data[0].id; }
    return null;
  } catch (e) {
    Logger.log("Model resolve error: " + e.message);
    return null;
  }
}

/**
 * Clears the model cache so the next call re-resolves.
 */
function forceReresolveModel() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty(MODEL_CACHE_KEY);
  props.deleteProperty(MODEL_CACHE_TS);
  Logger.log("Model cache cleared. Next Claude call will re-resolve.");
}

/**
 * Pulls the assistant's text out of a Claude Messages API response,
 * regardless of what other block types precede it.
 *
 * WHY THIS EXISTS: extended-thinking models (Sonnet 5 and later) return
 * a "thinking" block as content[0], with the actual text in a LATER
 * block. Code that reads content[0].text directly gets undefined and
 * silently fails. This finds the first block whose type is "text".
 * On older text-first models it still returns content[0], so it is
 * safe everywhere. Route ALL Claude response parsing through this.
 *
 * Returns the trimmed text string, or null if no text block exists.
 */
function extractClaudeText_(data) {
  if (!data || !Array.isArray(data.content)) return null;
  const textBlock = data.content.find(b => b && b.type === "text" && typeof b.text === "string");
  return textBlock ? textBlock.text.trim() : null;
}


// ============================================================
// CLINICIAN FACTS — LOCKED SOURCE OF TRUTH
// ============================================================
//
// This block governs the two facts that must NEVER drift on a public
// post: license credential and available days.
//
// HOW IT WORKS:
//   Every flyer caption MUST contain these exact substrings, verbatim.
//   validateFlyerFacts_() is called as a pre-flight gate before any
//   flyer posts. If a caption does not contain the locked string, the
//   post ABORTS, the rotation does NOT advance, and Joe gets an email
//   naming the exact mismatch.
//
// WHEN A CLINICIAN'S CREDENTIAL OR SCHEDULE CHANGES:
//   1. Update the value HERE first.
//   2. Update the caption text in FLYER_CONFIG to match.
//   3. Run validateAllFlyers() to confirm they agree.
//   If you forget step 2, nothing posts. That is the intended behavior.
//
// WHEN A CLINICIAN LEAVES:
//   1. Delete their entry here.
//   2. Delete their flyer from FLYER_CONFIG.rotation.
//   3. RENUMBER the remaining rotation weeks so they run 1..N with no
//      gaps. postWeeklyFlyer() will self-heal an out-of-range stored
//      pointer, but renumbering is still the correct fix.
//   4. Run resetFlyerRotation(), then validateAllFlyers().
//   5. Check the "team" caption for any headcount that is now wrong —
//      the team flyer is NOT fact-gated, so nothing will catch it.
//
// NOTE: credentialLine is the full "Name, CRED" string, not just the
// credential, so a caption can't pass by containing "LMSW" somewhere
// unrelated. daysLine may be null for a flyer that makes no day claim.
//
// The "team" flyer is intentionally absent — it makes no individual
// credential or schedule claims, so there is nothing to lock.

const CLINICIAN_FACTS = {
  thunder: {
    credentialLine: "Thunder Chen, LMSW",
    daysLine: "Tuesday, Thursday, and Friday"
  },
  hannah: {
    credentialLine: "Hannah Drury, LMSW",
    daysLine: "Monday through Friday"
  },
  ron: {
    credentialLine: "Ron Youngblut, LMSW",
    daysLine: "Monday through Wednesday"
  }
};

/**
 * Checks a single flyer's caption against CLINICIAN_FACTS.
 * Returns { ok: true } or { ok: false, reason: "..." }.
 */
function validateFlyerFacts_(flyer) {
  const facts = CLINICIAN_FACTS[flyer.name];
  if (!facts) return { ok: true }; // no locked facts for this flyer (e.g. "team")

  if (facts.credentialLine && flyer.caption.indexOf(facts.credentialLine) === -1) {
    return {
      ok: false,
      reason: 'Caption for "' + flyer.name + '" does not contain the required credential line: "' +
              facts.credentialLine + '". The caption may be stating the WRONG LICENSE TYPE.'
    };
  }

  if (facts.daysLine && flyer.caption.indexOf(facts.daysLine) === -1) {
    return {
      ok: false,
      reason: 'Caption for "' + flyer.name + '" does not contain the required schedule: "' +
              facts.daysLine + '". The caption may be stating the WRONG DAYS.'
    };
  }

  return { ok: true };
}

/**
 * Runs validateFlyerFacts_ against every flyer in the rotation.
 * Run this any time you edit FLYER_CONFIG or CLINICIAN_FACTS.
 * Returns true if all clean.
 */
function validateAllFlyers() {
  let allOk = true;
  const failures = [];

  FLYER_CONFIG.rotation.forEach(flyer => {
    const result = validateFlyerFacts_(flyer);
    if (!result.ok) {
      allOk = false;
      failures.push(result.reason);
      Logger.log("🔴 FLYER FACT MISMATCH — " + result.reason);
    } else {
      const locked = CLINICIAN_FACTS[flyer.name] ? "facts OK" : "no locked facts (skipped)";
      Logger.log("✅ " + flyer.name + " — " + locked);
    }
  });

  if (!allOk) {
    sendMarketingAlert("🔴 Flyer fact-check FAILED",
      "One or more flyer captions do not match CLINICIAN_FACTS. " +
      "These flyers will NOT post until fixed.<br><br>" +
      failures.join("<br><br>") +
      "<br><br>Fix either CLINICIAN_FACTS or the caption in FLYER_CONFIG so they agree, " +
      "then run validateAllFlyers() again.");
  } else {
    Logger.log("All flyers passed fact validation.");
  }
  return allOk;
}


// ============================================================
// FLYER ROTATION CONFIG
// ============================================================
//
// WARNING: credential and day claims in these captions are enforced
// against CLINICIAN_FACTS above. Do not edit a credential or schedule
// here without updating CLINICIAN_FACTS to match.
//
// WARNING 2: week numbers must run 1..N with NO GAPS. If you remove a
// flyer, renumber the rest. See the "WHEN A CLINICIAN LEAVES" note in
// the CLINICIAN_FACTS block above.
//
// WARNING 3: the "team" caption is NOT fact-gated. Any headcount or
// factual claim in it must be checked by hand.

const FLYER_CONFIG = {

  baseUrl: "https://raw.githubusercontent.com/jlenhoff/practicepilot/main/flyers",

  rotation: [
    {
      week: 1,
      name: "thunder",
      priority: "urgent", // new hire needs clients
      caption: "We're growing. Meet Thunder Chen, LMSW — the newest therapist at Houston Heights Therapy. Thunder works with couples and adults navigating trauma, anxiety, ADHD, neurodivergence, and questions of identity, and brings a queer- and neurodivergent-affirming, trauma-informed lens to the work. Drawing on person-centered, relational, and motivational approaches — plus experience facilitating The Daring Way™ and supporting 12-step recovery — he creates a collaborative space where you don't have to do it alone. Now accepting new clients Tuesday, Thursday, and Friday, with daytime and evening slots, in-person in Houston Heights & telehealth across Texas. Free 15-minute intro call. Link in bio to get started."
    },
    {
      week: 2,
      name: "team",
      priority: "brand",
      caption: "Real healing for real people. Houston Heights Therapy serves adults and couples navigating trauma, anxiety, life transitions, and the work of becoming who they really are. We use IFS, EMDR, CBT, and trauma-informed approaches — no toxic positivity, no generic advice. Currently accepting new clients for in-person sessions in Houston Heights and telehealth across Texas. Link in bio."
    },
    {
      week: 3,
      name: "hannah",
      priority: "urgent",
      caption: "Hannah Drury, LMSW, works with adults and couples healing from trauma, managing anxiety, and navigating life transitions. She draws on CBT and somatic approaches to help clients reconnect with their bodies and trust their own wisdom. Hannah is currently accepting new clients — Monday through Friday afternoons and evenings, in-person in Houston Heights & telehealth across Texas. She also facilitates our Seeking Safety group for trauma and substance use. Link in bio."
    },
    {
      week: 4,
      name: "ron",
      priority: "maintenance",
      caption: "Ron Youngblut, LMSW, specializes in helping adults navigate anxiety, depression, and major life transitions. With a direct, solution-focused approach rooted in CBT and mindfulness, Ron creates a space where clients can process challenges without judgment and build practical skills for moving forward. Currently accepting a limited number of new clients — Monday through Wednesday, in-person in Houston Heights & telehealth across Texas. Link in bio."
    }
  ]
};


// ============================================================
// COLUMN MAP — REFERRAL PARTNERS SHEET
// ============================================================

const REF_COLS = {
  name:         0,
  role:         1,
  org:          2,
  email:        3,
  phone:        4,
  lastOutreach: 5,
  nextOutreach: 6,
  notes:        7,
  welcomeSent:  8,
};


// ============================================================
// CARD BACKGROUNDS — CANVA-DESIGNED, HOSTED ON GITHUB
// ============================================================

const CARD_TEMPLATES = [
  {
    name:      "teal",
    bgUrl:     "https://raw.githubusercontent.com/jlenhoff/practicepilot/main/generated-images/bg-teal.png",
    textColor: "#FFFFFF",
    isLight:   false
  },
  {
    name:      "cream",
    bgUrl:     "https://raw.githubusercontent.com/jlenhoff/practicepilot/main/generated-images/bg-cream.png",
    textColor: "#2C3E35",
    isLight:   true
  },
  {
    name:      "mauve",
    bgUrl:     "https://raw.githubusercontent.com/jlenhoff/practicepilot/main/generated-images/bg-mauve.png",
    textColor: "#FFFFFF",
    isLight:   false
  }
];


// ============================================================
// SHARED HELPERS
// ============================================================

/**
 * Records the timestamp of a job's last start.
 * The heartbeat watchdog reads these to detect jobs that stopped running.
 */
function recordRun_(jobName) {
  PropertiesService.getScriptProperties().setProperty('LASTRUN_' + jobName, String(Date.now()));
}


// ============================================================
// IMAGE CARD BUILDER — PNG FOR BOTH INSTAGRAM AND FACEBOOK
// ============================================================

function buildCardPNG(quote, templateIndex) {
  const tmpl = CARD_TEMPLATES[templateIndex % CARD_TEMPLATES.length];
  const PT = 540;

  try {
    const token = ScriptApp.getOAuthToken();
    const headers = {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    };

    Logger.log("Step 1: creating presentation");
    const createResp = UrlFetchApp.fetch("https://slides.googleapis.com/v1/presentations", {
      method: "post",
      headers: headers,
      payload: JSON.stringify({
        title: "_temp_card_" + Date.now(),
        pageSize: {
          width:  { magnitude: PT, unit: "PT" },
          height: { magnitude: PT, unit: "PT" }
        }
      }),
      muteHttpExceptions: true
    });

    if (createResp.getResponseCode() !== 200) {
      Logger.log("Create failed: " + createResp.getContentText().substring(0, 300));
      return null;
    }

    const presData  = JSON.parse(createResp.getContentText());
    const presId    = presData.presentationId;
    const slideId   = presData.slides[0].objectId;
    Logger.log("Step 1 done: " + presId);

    Logger.log("Step 2: fetching background");
    const bgResp = UrlFetchApp.fetch(tmpl.bgUrl, { muteHttpExceptions: true });
    Logger.log("BG HTTP: " + bgResp.getResponseCode());

    let bgImageId = null;
    if (bgResp.getResponseCode() === 200) {
      Logger.log("Step 2b: inserting background via batchUpdate");
      const insertBgResp = UrlFetchApp.fetch(
        "https://slides.googleapis.com/v1/presentations/" + presId + ":batchUpdate",
        {
          method: "post",
          headers: headers,
          payload: JSON.stringify({
            requests: [{
              createImage: {
                url: tmpl.bgUrl,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width:  { magnitude: 720, unit: "PT" },
                    height: { magnitude: 405, unit: "PT" }
                  },
                  transform: {
                    scaleX: 1, scaleY: 1,
                    translateX: 0, translateY: 0,
                    unit: "PT"
                  }
                }
              }
            }]
          }),
          muteHttpExceptions: true
        }
      );
      Logger.log("BG insert HTTP: " + insertBgResp.getResponseCode());
      if (insertBgResp.getResponseCode() === 200) {
        const bgResult = JSON.parse(insertBgResp.getContentText());
        bgImageId = bgResult.replies[0].createImage.objectId;
        Logger.log("BG image inserted: " + bgImageId);
      } else {
        Logger.log("BG insert failed: " + insertBgResp.getContentText().substring(0, 300));
      }
    }

    Logger.log("Step 3: inserting text box");
    const slideW   = 720;
    const slideH   = 405;
    const marginPT = slideW * 0.08;
    const boxW     = slideW - (marginPT * 2);
    const boxH     = slideH * 0.50;
    const boxTop   = (slideH / 2) - (boxH / 2) + 10;
    const textBoxId = "quote_box";

    const textResp = UrlFetchApp.fetch(
      "https://slides.googleapis.com/v1/presentations/" + presId + ":batchUpdate",
      {
        method: "post",
        headers: headers,
        payload: JSON.stringify({
          requests: [
            {
              createShape: {
                objectId: textBoxId,
                shapeType: "TEXT_BOX",
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width:  { magnitude: boxW, unit: "PT" },
                    height: { magnitude: boxH, unit: "PT" }
                  },
                  transform: {
                    scaleX: 1, scaleY: 1,
                    translateX: marginPT, translateY: boxTop,
                    unit: "PT"
                  }
                }
              }
            },
            {
              insertText: {
                objectId: textBoxId,
                text: quote
              }
            },
            {
              updateTextStyle: {
                objectId: textBoxId,
                style: {
                  fontFamily: "Georgia",
                  fontSize: { magnitude: 28, unit: "PT" },
                  foregroundColor: {
                    opaqueColor: {
                      rgbColor: tmpl.isLight
                        ? { red: 0.17, green: 0.24, blue: 0.21 }
                        : { red: 1,    green: 1,    blue: 1    }
                    }
                  },
                  bold: false
                },
                fields: "fontFamily,fontSize,foregroundColor,bold",
                textRange: { type: "ALL" }
              }
            },
            {
              updateParagraphStyle: {
                objectId: textBoxId,
                style: {
                  alignment: "CENTER",
                  lineSpacing: 140,
                  spaceAbove: { magnitude: 0, unit: "PT" },
                  spaceBelow: { magnitude: 0, unit: "PT" }
                },
                fields: "alignment,lineSpacing,spaceAbove,spaceBelow",
                textRange: { type: "ALL" }
              }
            },
            {
              updateShapeProperties: {
                objectId: textBoxId,
                shapeProperties: {
                  shapeBackgroundFill: {
                    propertyState: "NOT_RENDERED"
                  }
                },
                fields: "shapeBackgroundFill"
              }
            }
          ]
        }),
        muteHttpExceptions: true
      }
    );
    Logger.log("Text insert HTTP: " + textResp.getResponseCode());
    if (textResp.getResponseCode() !== 200) {
      Logger.log("Text insert failed: " + textResp.getContentText().substring(0, 300));
    }

    if (bgImageId) {
      UrlFetchApp.fetch(
        "https://slides.googleapis.com/v1/presentations/" + presId + ":batchUpdate",
        {
          method: "post",
          headers: headers,
          payload: JSON.stringify({
            requests: [{
              updatePageElementsZOrder: {
                pageElementObjectIds: [bgImageId],
                operation: "SEND_TO_BACK"
              }
            }]
          }),
          muteHttpExceptions: true
        }
      );
      Logger.log("BG sent to back");
    }

    Utilities.sleep(2000);

    Logger.log("Step 5: exporting PNG via thumbnail API");
    const slideId2 = presData.slides[0].objectId;
    const exportUrl = "https://slides.googleapis.com/v1/presentations/" + presId + "/pages/" + slideId2 + "/thumbnail?thumbnailProperties.mimeType=PNG&thumbnailProperties.thumbnailSize=LARGE";

    let thumbResp;
    try {
      thumbResp = UrlFetchApp.fetch(exportUrl, {
        headers: { "Authorization": "Bearer " + token },
        muteHttpExceptions: true
      });
      Logger.log("Thumbnail API HTTP: " + thumbResp.getResponseCode());
    } catch(e) {
      Logger.log("Thumbnail fetch threw: " + e.message);
      try { DriveApp.getFileById(presId).setTrashed(true); } catch(e2) {}
      return null;
    }

    try { DriveApp.getFileById(presId).setTrashed(true); } catch(e) {}

    if (thumbResp.getResponseCode() !== 200) {
      Logger.log("Thumbnail failed: " + thumbResp.getContentText().substring(0, 300));
      return null;
    }

    const thumbData = JSON.parse(thumbResp.getContentText());
    Logger.log("Thumbnail contentUrl: " + thumbData.contentUrl.substring(0, 80));

    const pngResp = UrlFetchApp.fetch(thumbData.contentUrl, { muteHttpExceptions: true });
    Logger.log("PNG fetch HTTP: " + pngResp.getResponseCode());

    const rawBytes = pngResp.getContent();
    Logger.log("Raw bytes length: " + rawBytes.length);

    const blob = Utilities.newBlob(rawBytes, MimeType.PNG, "card.png");
    Logger.log("Card ready (" + rawBytes.length + " bytes)");
    return blob;

  } catch (e) {
    Logger.log("buildCardPNG failed: " + e.message);
    return null;
  }
}


function sanitizeForSVG(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\u2018/g, "&#39;")
    .replace(/\u2019/g, "&#39;")
    .replace(/\u201C/g, "&#34;")
    .replace(/\u201D/g, "&#34;")
    .replace(/\u2014/g, "&#8212;")
    .replace(/\u2013/g, "&#8211;")
    .replace(/'/g, "&#39;")
    .replace(/"/g, "&#34;");
}


function wrapSVGText(text, maxWidth, fontSize) {
  const avgCharWidth = fontSize * 0.48;
  const maxChars = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(" ");
  const lines = [];
  let currentLine = "";
  words.forEach(word => {
    const testLine = currentLine ? currentLine + " " + word : word;
    if (testLine.length > maxChars && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });
  if (currentLine) lines.push(currentLine);
  return lines;
}


function buildPostCardSVG(quote, templateIndex) {
  return null;
}

function buildPNGCard(quote, templateIndex) {
  return buildCardPNG(quote, templateIndex);
}


// ============================================================
// GITHUB FILE UPLOAD
// ============================================================

function pushFileToGitHub(content, filename, githubToken, isBinary) {
  const repo = MKTG_CONFIG.githubRepo;
  const path = MKTG_CONFIG.githubPath + "/" + filename;
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  let base64Content;
  if (isBinary && content.getBytes) {
    base64Content = Utilities.base64Encode(content.getBytes());
  } else {
    base64Content = Utilities.base64Encode(content);
  }

  let sha = null;
  try {
    const check = UrlFetchApp.fetch(apiUrl, {
      method: "get",
      headers: { "Authorization": "token " + githubToken, "Accept": "application/vnd.github.v3+json" },
      muteHttpExceptions: true
    });
    if (check.getResponseCode() === 200) sha = JSON.parse(check.getContentText()).sha;
  } catch (e) {}

  const payload = { message: `Add ${filename}`, content: base64Content };
  if (sha) payload.sha = sha;

  try {
    const response = UrlFetchApp.fetch(apiUrl, {
      method: "put",
      headers: {
        "Authorization": "token " + githubToken,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
      const rawUrl = `https://raw.githubusercontent.com/${repo}/main/${path}`;
      Logger.log("Pushed to GitHub: " + rawUrl);
      return rawUrl;
    }
    Logger.log("GitHub push failed: " + response.getContentText());
    return null;
  } catch (e) {
    Logger.log("GitHub push error: " + e.message);
    return null;
  }
}


// ============================================================
// PULL QUOTE EXTRACTION
// ============================================================

function extractPullQuote(postText, apiKey) {
  const payload = {
    model: getClaudeModel(),
    max_tokens: 100,
    messages: [{
      role: "user",
      content: `Extract the single most powerful, quotable phrase from this social media post.

Rules:
- 6 to 10 words maximum
- Must be a complete thought that stands alone
- Should feel like something you'd see on a poster or Instagram card
- Use proper punctuation including apostrophes (you're, don't, it's, etc.)
- Do NOT use all caps
- Do NOT add quotation marks around the phrase
- Return ONLY the phrase, nothing else

Post:
${postText}`
    }]
  };

  try {
    const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
      method: "post",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const data = JSON.parse(response.getContentText());
    let quote = extractClaudeText_(data);
    if (quote) {
      quote = quote.replace(/^["'\u201C\u201D\u2018\u2019]+|["'\u201C\u201D\u2018\u2019]+$/g, "");
      return quote;
    }
    return null;
  } catch (e) {
    Logger.log("Pull quote extraction failed: " + e.message);
    return null;
  }
}


// ============================================================
// IMAGE PIPELINE
// ============================================================

function generatePostImage(postText, postIndex, apiKey, githubToken) {
  const monthStamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMM");
  const postNum = postIndex + 1;

  const quote = extractPullQuote(postText, apiKey);
  if (!quote) {
    Logger.log(`Post ${postNum}: Failed to extract pull quote`);
    return { svgUrl: null, pngUrl: null, quote: null };
  }
  Logger.log(`Post ${postNum} quote: "${quote}"`);

  const monthNum = parseInt(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M"));
  const templateIndex = (postIndex + monthNum) % CARD_TEMPLATES.length;
  Logger.log(`Post ${postNum} template: ${CARD_TEMPLATES[templateIndex].name}`);

  let svgUrl = null;
  let pngUrl = null;
  try {
    const pngBlob = buildCardPNG(quote, templateIndex);
    if (pngBlob) {
      const pngFilename = `post-${monthStamp}-${postNum}.png`;
      pngUrl = pushFileToGitHub(pngBlob, pngFilename, githubToken, true);
      svgUrl = pngUrl;
    }
  } catch (e) {
    Logger.log(`Post ${postNum}: card build failed — ${e.message}`);
  }

  return { svgUrl, pngUrl, quote };
}


// ============================================================
// TRIGGER MANAGEMENT
// ============================================================

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log("All triggers deleted.");
}

function createMarketingTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ScriptApp.newTrigger("runSocialContentEngine").timeBased().onMonthDay(1).atHour(8).create();
  ScriptApp.newTrigger("drainInstagramQueue").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  ScriptApp.newTrigger("runGBPKeeper").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  ScriptApp.newTrigger("runReferralOutreach").timeBased().onMonthDay(1).atHour(9).create();
  ScriptApp.newTrigger("onReferralSheetEdit").forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger("runProfileAuditReminder").timeBased().onMonthDay(1).atHour(10).create();

  // Weekly token check (Sunday) — replaces the broken monthly-on-1st cadence.
  ScriptApp.newTrigger("checkMetaTokenExpiry").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(7).create();

  // Weekly flyer posting trigger (Friday 11am).
  ScriptApp.newTrigger("postWeeklyFlyer").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(11).create();

  // Heartbeat watchdog (Saturday) — catches jobs that silently stop running.
  ScriptApp.newTrigger("weeklyHeartbeat").timeBased().everyWeeks(1).onWeekDay(ScriptApp.WeekDay.SATURDAY).atHour(7).create();

  Logger.log("Marketing triggers created (weekly token check + heartbeat added).");
}


// ============================================================
// AUTOMATION 1 — SOCIAL CONTENT ENGINE
// ============================================================

function runSocialContentEngine() {
  Logger.log("Social Content Engine v5.7: starting...");
  recordRun_('runSocialContentEngine');

  const props = PropertiesService.getScriptProperties();
  const anthropicKey = props.getProperty("ANTHROPIC_API_KEY");
  const metaToken    = props.getProperty("META_PAGE_ACCESS_TOKEN");
  const pageId       = props.getProperty("META_PAGE_ID");
  const igId         = props.getProperty("META_INSTAGRAM_ID");
  const githubToken  = props.getProperty("GITHUB_TOKEN");

  if (!anthropicKey) {
    Logger.log("ERROR: ANTHROPIC_API_KEY not set");
    sendMarketingAlert("🔴 Content engine ABORTED", "ANTHROPIC_API_KEY not set.");
    return;
  }

  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🟠 Meta token dead at content-gen time",
      "Code " + health.code + ": " + health.message + "<br><br>" +
      "Content will still be generated, but Facebook scheduling and Instagram " +
      "queueing will fail until the token is fixed.");
  }

  const prompt = buildSocialContentPrompt();
  const posts  = generatePostsWithClaude(prompt, anthropicKey);

  if (!posts || posts.length === 0) {
    Logger.log("No posts generated");
    sendMarketingAlert("Content Generation Failed", "Monthly social content generation failed. Check logs.");
    return;
  }
  Logger.log(`Generated ${posts.length} posts`);

  const postsWithImages = [];
  posts.forEach((post, i) => {
    Logger.log(`Generating image ${i + 1}/${posts.length}...`);
    const imageResult = generatePostImage(post.text, i, anthropicKey, githubToken);
    postsWithImages.push({ ...post, quote: imageResult.quote, svgUrl: imageResult.svgUrl, pngUrl: imageResult.pngUrl });
    Utilities.sleep(2000);
  });

  let fbCount = 0;
  if (metaToken && pageId && health.ok) {
    const scheduleStart = getNextMonday();
    postsWithImages.forEach((post, i) => {
      const scheduledAt = new Date(scheduleStart.getTime() + (i * MKTG_CONFIG.postIntervalDays * 24 * 60 * 60 * 1000));
      const success = postToFacebook(post.text, scheduledAt, pageId, metaToken, post.pngUrl || null);
      if (success) fbCount++;
      Utilities.sleep(1000);
    });
  }

  let igQueued = 0;
  if (metaToken && igId) {
    const igIndices = selectIGPosts(postsWithImages.length, MKTG_CONFIG.igPostsPerMonth);
    const igQueue = igIndices.map(idx => ({
      text: postsWithImages[idx].text,
      imageUrl: postsWithImages[idx].svgUrl,
      quote: postsWithImages[idx].quote
    }));
    props.setProperty("IG_QUEUE", JSON.stringify(igQueue));
    igQueued = igQueue.length;
    Logger.log(`Queued ${igQueued} posts for Instagram weekly drain`);
    drainInstagramQueue();
  }

  logContentGeneration(postsWithImages, fbCount);
  sendContentSummaryEmail(postsWithImages, fbCount, igQueued);
  Logger.log(`Social Content Engine complete. ${posts.length} posts, ${fbCount} FB, ${igQueued} IG queued.`);
}

function selectIGPosts(total, count) {
  if (count >= total) return Array.from({ length: total }, (_, i) => i);
  const indices = [];
  const step = total / count;
  for (let i = 0; i < count; i++) indices.push(Math.floor(i * step));
  return indices;
}


// ============================================================
// INSTAGRAM QUEUE DRAIN  (hardened — only removes published items)
// ============================================================

function drainInstagramQueue() {
  recordRun_('drainInstagramQueue');

  const props = PropertiesService.getScriptProperties();
  const metaToken = props.getProperty("META_PAGE_ACCESS_TOKEN");
  const igId = props.getProperty("META_INSTAGRAM_ID");
  const queueRaw = props.getProperty("IG_QUEUE");

  if (!queueRaw) { Logger.log("Instagram queue is empty"); return; }

  let queue;
  try {
    queue = JSON.parse(queueRaw);
  } catch (e) {
    Logger.log("Failed to parse IG queue: " + e.message);
    sendMarketingAlert("🔴 IG queue corrupt",
      "IG_QUEUE could not be parsed and was left untouched. Error: " + e.message);
    return;
  }
  if (!queue || queue.length === 0) { props.deleteProperty("IG_QUEUE"); return; }

  // PRE-FLIGHT: do not touch the queue if the token is dead.
  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🔴 IG drain ABORTED — token dead",
      "Code " + health.code + ": " + health.message + "<br><br>" +
      "Instagram queue preserved (" + queue.length + " posts still waiting). " +
      "Fix META_PAGE_ACCESS_TOKEN, then run drainInstagramQueue manually.");
    Logger.log("IG drain aborted: token dead. Queue preserved (" + queue.length + ").");
    return;
  }

  const MAX_RETRIES = 3;
  const target = MKTG_CONFIG.igPostsPerWeek;

  let posted = 0;
  let attempted = 0;
  const remaining = [];
  const giveUps = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    if (posted >= target) { remaining.push(item); continue; }

    attempted++;
    const success = postToInstagram(item.text, item.imageUrl, igId, metaToken);

    if (success) {
      posted++;
    } else {
      const retries = (item._retries || 0) + 1;
      if (retries >= MAX_RETRIES) {
        giveUps.push({ quote: item.quote || "(no quote)", imageUrl: item.imageUrl, retries });
        Logger.log("IG item gave up after " + retries + " tries: " + (item.quote || ""));
      } else {
        item._retries = retries;
        remaining.push(item);
        Logger.log("IG item failed (retry " + retries + "/" + MAX_RETRIES + "): " + (item.quote || ""));
      }
    }

    if (i < queue.length - 1 && posted < target) Utilities.sleep(3000);
  }

  if (remaining.length > 0) {
    props.setProperty("IG_QUEUE", JSON.stringify(remaining));
  } else {
    props.deleteProperty("IG_QUEUE");
  }

  Logger.log("IG drain done. Posted " + posted + "/" + attempted +
    " attempted. " + remaining.length + " remaining. " + giveUps.length + " gave up.");

  const failedThisRun = attempted - posted;
  if (failedThisRun > 0 || giveUps.length > 0) {
    let body = "<h3>Instagram drain — attention needed</h3>";
    body += "<p>Posted: <b>" + posted + "</b> of " + attempted + " attempted.</p>";
    body += "<p>Still queued for retry: <b>" + remaining.length + "</b></p>";
    if (giveUps.length > 0) {
      body += "<hr><p><b>Dropped after " + MAX_RETRIES + " failed tries</b> " +
        "(likely a bad/unreachable image URL — check these):</p><ul>";
      giveUps.forEach(g => {
        body += "<li>\"" + g.quote + "\" — <a href=\"" + (g.imageUrl || "") + "\">image</a></li>";
      });
      body += "</ul>";
    }
    sendMarketingAlert("🟠 Instagram drain — some posts failed", body);
  } else if (posted > 0) {
    Logger.log("IG drain clean — " + posted + " posted, no failures.");
  }
}


// ============================================================
// META GRAPH API — FACEBOOK
// ============================================================

function postToFacebook(text, scheduledAt, pageId, metaToken, imageUrl) {
  const scheduledTime = Math.floor(scheduledAt.getTime() / 1000);
  try {
    if (imageUrl) {
      const photoResp = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: "post",
        payload: {
          url: imageUrl,
          caption: text,
          scheduled_publish_time: scheduledTime.toString(),
          published: "false",
          access_token: metaToken
        },
        muteHttpExceptions: true
      });
      const photoResult = JSON.parse(photoResp.getContentText());
      if (photoResult.id) { Logger.log("FB photo post scheduled: " + photoResult.id); return true; }
      Logger.log("FB photo failed: " + (photoResult.error ? photoResult.error.message : JSON.stringify(photoResult)));
      Logger.log("Falling back to text-only...");
    }
    const feedResp = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: "post",
      payload: {
        message: text,
        scheduled_publish_time: scheduledTime.toString(),
        published: "false",
        access_token: metaToken
      },
      muteHttpExceptions: true
    });
    const feedResult = JSON.parse(feedResp.getContentText());
    if (feedResult.id) { Logger.log("FB text post scheduled: " + feedResult.id); return true; }
    Logger.log("FB text post failed: " + JSON.stringify(feedResult));
    return false;
  } catch (e) {
    Logger.log("FB post error: " + e.message);
    return false;
  }
}


// ============================================================
// META GRAPH API — INSTAGRAM
// ============================================================

function postToInstagram(caption, imageUrl, igId, metaToken) {
  if (!imageUrl) { Logger.log("Instagram requires an image — skipping"); return false; }
  try {
    const createResp = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
      method: "post",
      payload: { image_url: imageUrl, caption: caption, access_token: metaToken },
      muteHttpExceptions: true
    });
    const createResult = JSON.parse(createResp.getContentText());
    if (!createResult.id) { Logger.log("IG container failed: " + JSON.stringify(createResult)); return false; }
    Logger.log("IG container created: " + createResult.id);
    Utilities.sleep(5000);
    const publishResp = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
      method: "post",
      payload: { creation_id: createResult.id, access_token: metaToken },
      muteHttpExceptions: true
    });
    const publishResult = JSON.parse(publishResp.getContentText());
    if (publishResult.id) { Logger.log("IG post published: " + publishResult.id); return true; }
    Logger.log("IG publish failed: " + JSON.stringify(publishResult));
    return false;
  } catch (e) {
    Logger.log("IG post error: " + e.message);
    return false;
  }
}


// ============================================================
// CONTENT GENERATION — CLAUDE API
// ============================================================

function buildSocialContentPrompt() {
  const month = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy");
  const specialties = MKTG_CONFIG.specialties.join(", ");
  const modalities  = MKTG_CONFIG.modalities.join(", ");
  const clientTypes = MKTG_CONFIG.clientTypes.join(", ");
  const acceptingLine = MKTG_CONFIG.acceptingClients
    ? `The practice is currently accepting new clients. Include a soft call to action in 3-4 posts (e.g. "We're currently accepting new clients — reach out to learn more").`
    : `The practice is not currently accepting new clients. Do not include calls to book or reach out.`;

  return `You are writing social media content for ${MKTG_CONFIG.practiceName}, a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity}.

PRACTICE VOICE:
${MKTG_CONFIG.brandVoice}

TONE: ${MKTG_CONFIG.tone}

NEVER use these phrases: ${MKTG_CONFIG.avoidPhrases.join(", ")}

SPECIALTIES: ${specialties}
MODALITIES: ${modalities}
CLIENT TYPES: ${clientTypes}
INSURANCE: ${MKTG_CONFIG.insuranceAccepted}

${acceptingLine}

CRITICAL — NEVER STATE THESE FACTS:
Do NOT name any individual clinician. Do NOT state any clinician's license
type, credential, or letters (LMSW, LCSW, LPC, etc). Do NOT state any
clinician's schedule, available days, or hours. These facts are managed
elsewhere in the system and any version you invent will be wrong and may
misrepresent licensure. Write about the practice, not about named people.

Generate exactly ${MKTG_CONFIG.postsPerMonth} social media posts for ${month}.

POST MIX (vary across these types):
- Psychoeducation: explain a concept like nervous system regulation, window of tolerance, or attachment styles in plain language
- Myth-busting: correct a common misconception about therapy or mental health
- Normalizing therapy: reduce stigma, make therapy feel accessible and human
- Reflective prompt: invite the reader to pause and notice something about themselves
- Seasonal relevance: tie to something relevant this month
- Practice voice: share the practice's perspective or approach in 1-3 sentences

RULES FOR ALL POSTS:
- 100-200 words maximum per post
- No clinical jargon without explanation
- No toxic positivity or empty validation
- No fear or shame as motivation
- No generic therapy-speak
- Sound like a real person, not a marketing department
- Each post should stand alone and be complete
- No hashtags unless genuinely relevant (1-2 max per post if used)
- Use proper punctuation including apostrophes

RESPOND WITH VALID JSON ONLY. No preamble, no markdown backticks.

Response format:
[
  { "text": "Post content here...", "type": "psychoeducation" },
  { "text": "Post content here...", "type": "myth_busting" }
]`;
}

function generatePostsWithClaude(prompt, apiKey) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
        method: "post",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        payload: JSON.stringify({
          model: getClaudeModel(),
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }]
        }),
        muteHttpExceptions: true
      });
      const data = JSON.parse(response.getContentText());

      // Self-heal: model retired mid-month -> clear cache and retry once.
      if (data.error && data.error.type === "not_found_error" && attempt === 0) {
        Logger.log("Model not found — re-resolving and retrying.");
        forceReresolveModel();
        continue;
      }
      let text = extractClaudeText_(data);
      if (!text) {
        Logger.log("Claude unexpected response: " + JSON.stringify(data).substring(0, 300));
        return null;
      }
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      const posts = JSON.parse(text);
      Logger.log("Parsed " + posts.length + " posts");
      return posts;
    } catch (e) {
      Logger.log("Claude API error: " + e.message);
      return null;
    }
  }
  return null;
}


// ============================================================
// SCHEDULING HELPERS
// ============================================================

function getNextMonday() {
  const now = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? 1 : (day === 1 ? 7 : 8 - day);
  const nextMon = new Date(now.getTime() + diff * 24 * 60 * 60 * 1000);
  nextMon.setHours(9, 0, 0, 0);
  return nextMon;
}


// ============================================================
// LOGGING
// ============================================================

function logContentGeneration(posts, fbCount) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(MKTG_CONFIG.sheets.contentLog);
    if (!sheet) {
      sheet = ss.insertSheet(MKTG_CONFIG.sheets.contentLog);
      sheet.appendRow(["Date", "Post #", "Type", "Pull Quote", "Text Preview", "SVG URL", "PNG URL", "FB Status", "IG Status"]);
    }
    const now = new Date();
    posts.forEach((post, i) => {
      sheet.appendRow([
        now, i + 1, post.type || "general", post.quote || "",
        (post.text || "").substring(0, 100) + "...",
        post.svgUrl || "", post.pngUrl || "",
        i < fbCount ? "Scheduled" : "Failed", "Queued"
      ]);
    });
  } catch (e) {
    Logger.log("Content logging error: " + e.message);
  }
}


// ============================================================
// EMAIL NOTIFICATIONS
// ============================================================

function sendContentSummaryEmail(posts, fbCount, igQueued) {
  const subject = `[Practice Pilot] ${posts.length} posts generated — ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM yyyy")}`;
  let body = `<h2>Monthly Content Generation Complete</h2>`;
  body += `<p><strong>${posts.length}</strong> posts generated</p>`;
  body += `<p><strong>${fbCount}</strong> scheduled to Facebook</p>`;
  body += `<p><strong>${igQueued}</strong> queued for Instagram (2/week)</p><hr>`;
  posts.forEach((post, i) => {
    const monthNum = parseInt(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "M"));
    const tIdx = (i + monthNum) % CARD_TEMPLATES.length;
    body += `<h3>Post ${i + 1} — ${post.type || "general"} — ${CARD_TEMPLATES[tIdx].name}</h3>`;
    if (post.quote) body += `<p><em>"${post.quote}"</em></p>`;
    body += `<p>${(post.text || "").replace(/\n/g, "<br>")}</p>`;
    if (post.svgUrl) body += `<p><a href="${post.svgUrl}">SVG</a>`;
    if (post.pngUrl) body += ` | <a href="${post.pngUrl}">PNG</a>`;
    if (post.svgUrl || post.pngUrl) body += `</p>`;
    body += `<hr>`;
  });
  MailApp.sendEmail({ to: MKTG_CONFIG.notifyEmail, subject: subject, htmlBody: body });
}

function sendMarketingAlert(subject, message) {
  MailApp.sendEmail({
    to: MKTG_CONFIG.notifyEmail,
    subject: `[Practice Pilot] ALERT: ${subject}`,
    htmlBody: `<h3>${subject}</h3><p>${message}</p>`
  });
}


// ============================================================
// AUTOMATION 2 — GBP KEEPER  (no silent paths)
// ============================================================

function runGBPKeeper() {
  Logger.log("GBP Keeper: starting...");
  recordRun_('runGBPKeeper');

  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  if (!apiKey) {
    sendMarketingAlert("🔴 GBP ABORTED — no API key", "ANTHROPIC_API_KEY not set.");
    return;
  }

  const post = generateGBPPost(buildGBPPrompt(), apiKey);
  if (!post || !post.text) {
    sendMarketingAlert("🔴 GBP post generation FAILED",
      "Claude returned no usable post (bad/empty JSON). No post created this week. Check logs.");
    Logger.log("GBP post generation failed");
    return;
  }

  const props = PropertiesService.getScriptProperties();
  const gbpAccountId  = props.getProperty("GBP_ACCOUNT_ID");
  const gbpLocationId = props.getProperty("GBP_LOCATION_ID");
  const gbpToken      = props.getProperty("GBP_ACCESS_TOKEN");

  if (gbpAccountId && gbpLocationId && gbpToken) {
    const published = publishToGBP(post, gbpAccountId, gbpLocationId, gbpToken);
    if (published) {
      sendMarketingAlert("🟢 GBP post published",
        "Auto-posted to Google Business Profile this week.<br><br>" +
        "<blockquote>" + post.text + "</blockquote>");
    } else {
      Logger.log("GBP API publish failed — falling back to manual-paste email.");
      sendGBPPostEmail(post);
    }
  } else {
    sendGBPPostEmail(post);
  }

  logGBPPost(post);
  Logger.log("GBP Keeper: complete.");
}

function buildGBPPrompt() {
  const week = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMMM d, yyyy");
  return `Write a Google Business Profile post for ${MKTG_CONFIG.practiceName}, a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity}.

Week of: ${week}

80-150 words. Warm and professional. Highlight one specialty or service. Include a soft call to action. Use proper punctuation.

Specialties: ${MKTG_CONFIG.specialties.join(", ")}
Modalities: ${MKTG_CONFIG.modalities.join(", ")}
${MKTG_CONFIG.acceptingClients ? "Currently accepting new clients." : ""}

CRITICAL — NEVER STATE THESE FACTS:
Do NOT name any individual clinician. Do NOT state any clinician's license
type, credential, or letters (LMSW, LCSW, LPC, etc). Do NOT state any
clinician's schedule, available days, or hours. Write about the practice,
not about named people.

RESPOND WITH VALID JSON ONLY:
{ "text": "Post content here...", "category": "specialty_highlight" }`;
}

function generateGBPPost(prompt, apiKey) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
        method: "post",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        payload: JSON.stringify({ model: getClaudeModel(), max_tokens: 500, messages: [{ role: "user", content: prompt }] }),
        muteHttpExceptions: true
      });
      const data = JSON.parse(response.getContentText());

      // Self-heal: model retired mid-month -> clear cache and retry once.
      if (data.error && data.error.type === "not_found_error" && attempt === 0) {
        Logger.log("Model not found — re-resolving and retrying.");
        forceReresolveModel();
        continue;
      }
      let text = extractClaudeText_(data);
      if (!text) {
        Logger.log("GBP gen unexpected response: " + JSON.stringify(data).substring(0, 300));
        return null;
      }
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(text);
    } catch (e) {
      Logger.log("GBP generation error: " + e.message);
      return null;
    }
  }
  return null;
}

/**
 * Returns true on confirmed publish, false otherwise.
 * Checks HTTP status; no longer swallows failures silently.
 */
function publishToGBP(post, accountId, locationId, token) {
  try {
    const res = UrlFetchApp.fetch(
      `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`,
      {
        method: "post",
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        payload: JSON.stringify({ languageCode: "en", summary: post.text, topicType: "STANDARD" }),
        muteHttpExceptions: true
      }
    );
    const code = res.getResponseCode();
    if (code === 200 || code === 201) {
      Logger.log("GBP post published");
      return true;
    }
    Logger.log("GBP publish failed (" + code + "): " + res.getContentText().substring(0, 300));
    return false;
  } catch (e) {
    Logger.log("GBP publish error: " + e.message);
    return false;
  }
}

function sendGBPPostEmail(post) {
  MailApp.sendEmail({
    to: MKTG_CONFIG.notifyEmail,
    subject: `[Practice Pilot] Weekly GBP Post — ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MMM d")}`,
    htmlBody: `<h3>Your GBP Post for This Week</h3>
      <p>Copy and paste into Google Business Profile:</p>
      <blockquote style="border-left: 3px solid #1A9E9E; padding-left: 12px; color: #333;">${post.text}</blockquote>
      <p><a href="https://business.google.com">Open GBP</a></p>`
  });
}

function logGBPPost(post) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(MKTG_CONFIG.sheets.gbpLog);
    if (!sheet) { sheet = ss.insertSheet(MKTG_CONFIG.sheets.gbpLog); sheet.appendRow(["Date", "Category", "Text", "Published"]); }
    sheet.appendRow([new Date(), post.category || "standard", post.text, "Logged"]);
  } catch (e) {
    Logger.log("GBP logging error: " + e.message);
  }
}


// ============================================================
// AUTOMATION 3 — REFERRAL PARTNER OUTREACH
// ============================================================

function runReferralOutreach() {
  Logger.log("Referral Outreach: starting...");
  recordRun_('runReferralOutreach');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MKTG_CONFIG.sheets.referralList);
  if (!sheet) { Logger.log("Referral Partners sheet not found"); return; }
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) { Logger.log("No referral partners"); return; }
  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  const now = new Date();
  let sentCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row  = data[i];
    const name  = row[REF_COLS.name];
    const email = row[REF_COLS.email];
    const lastOutreach = row[REF_COLS.lastOutreach];
    const role  = row[REF_COLS.role];
    const org   = row[REF_COLS.org];
    if (!name || !email) continue;
    if (lastOutreach) {
      const daysSince = (now - new Date(lastOutreach)) / (1000 * 60 * 60 * 24);
      if (daysSince < MKTG_CONFIG.referralCadenceDays) continue;
    }
    const emailContent = generateReferralEmail(name, role, org, apiKey);
    if (!emailContent) continue;
    try {
      MailApp.sendEmail({ to: email, subject: emailContent.subject, htmlBody: emailContent.body, name: MKTG_CONFIG.practiceName, replyTo: MKTG_CONFIG.practiceEmail });
      sheet.getRange(i + 1, REF_COLS.lastOutreach + 1).setValue(now);
      sheet.getRange(i + 1, REF_COLS.nextOutreach + 1).setValue(new Date(now.getTime() + MKTG_CONFIG.referralCadenceDays * 24 * 60 * 60 * 1000));
      logReferralOutreach(name, email, emailContent.subject);
      sentCount++;
      Utilities.sleep(1000);
    } catch (e) {
      Logger.log("Failed to email " + name + ": " + e.message);
    }
  }
  if (sentCount > 0) sendMarketingAlert("Referral Outreach Complete", `Sent ${sentCount} quarterly touchpoint emails.`);
  Logger.log("Referral Outreach: complete. Sent " + sentCount);
}

function generateReferralEmail(name, role, org, apiKey) {
  const prompt = `Write a brief, warm quarterly touchpoint email from ${MKTG_CONFIG.practiceName} to a referral partner.

Partner: ${name}
Role: ${role || "Healthcare professional"}
Organization: ${org || "their practice"}

3-4 short paragraphs. Personal, not templated. Mention something recent the practice is doing. Reaffirm the referral relationship. Warm and professional. NOT salesy.

CRITICAL — NEVER STATE THESE FACTS:
Do NOT name any individual clinician other than the sign-off below. Do NOT
state any clinician's license type, credential, or letters. Do NOT state any
clinician's schedule, available days, or hours. Write about the practice.

Sign off as: The ${MKTG_CONFIG.practiceName} Team

RESPOND WITH VALID JSON:
{ "subject": "Subject line", "body": "HTML body" }`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
        method: "post",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        payload: JSON.stringify({ model: getClaudeModel(), max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
        muteHttpExceptions: true
      });
      const data = JSON.parse(response.getContentText());
      if (data.error && data.error.type === "not_found_error" && attempt === 0) {
        forceReresolveModel();
        continue;
      }
      let text = extractClaudeText_(data);
      if (!text) { Logger.log("Referral email: no text block in response"); return null; }
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(text);
    } catch (e) {
      Logger.log("Referral email error: " + e.message);
      return null;
    }
  }
  return null;
}

function onReferralSheetEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== MKTG_CONFIG.sheets.referralList) return;
  const row = e.range.getRow();
  if (row < 2) return;
  const data = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const name  = data[REF_COLS.name];
  const email = data[REF_COLS.email];
  const welcomeSent = data[REF_COLS.welcomeSent];
  if (!name || !email || welcomeSent) return;
  const apiKey = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  const emailContent = generateWelcomeReferralEmail(name, data[REF_COLS.role], data[REF_COLS.org], apiKey);
  if (emailContent) {
    try {
      MailApp.sendEmail({ to: email, subject: emailContent.subject, htmlBody: emailContent.body, name: MKTG_CONFIG.practiceName, replyTo: MKTG_CONFIG.practiceEmail });
      sheet.getRange(row, REF_COLS.welcomeSent + 1).setValue(new Date());
      Logger.log("Welcome email sent to: " + name);
    } catch (e) {
      Logger.log("Welcome email failed: " + e.message);
    }
  }
}

function generateWelcomeReferralEmail(name, role, org, apiKey) {
  const prompt = `Write a welcome email from ${MKTG_CONFIG.practiceName} to a new referral partner.

Partner: ${name}
Role: ${role || "Healthcare professional"}
Organization: ${org || "their practice"}

Welcome them. Introduce the practice (${MKTG_CONFIG.specialties.join(", ")}). Explain client types accepted. Include phone: ${MKTG_CONFIG.practicePhone}. Warm, brief, professional.

CRITICAL — NEVER STATE THESE FACTS:
Do NOT name any individual clinician other than the sign-off below. Do NOT
state any clinician's license type, credential, or letters. Do NOT state any
clinician's schedule, available days, or hours. Write about the practice.

Sign off as: Joe Lenhoff, LCSW-S, ${MKTG_CONFIG.practiceName}

RESPOND WITH VALID JSON:
{ "subject": "Subject line", "body": "HTML body" }`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = UrlFetchApp.fetch("https://api.anthropic.com/v1/messages", {
        method: "post",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        payload: JSON.stringify({ model: getClaudeModel(), max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
        muteHttpExceptions: true
      });
      const data = JSON.parse(response.getContentText());
      if (data.error && data.error.type === "not_found_error" && attempt === 0) {
        forceReresolveModel();
        continue;
      }
      let text = extractClaudeText_(data);
      if (!text) { Logger.log("Welcome email: no text block in response"); return null; }
      text = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(text);
    } catch (e) {
      Logger.log("Welcome email error: " + e.message);
      return null;
    }
  }
  return null;
}

function logReferralOutreach(name, email, subject) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(MKTG_CONFIG.sheets.outreachLog);
    if (!sheet) { sheet = ss.insertSheet(MKTG_CONFIG.sheets.outreachLog); sheet.appendRow(["Date", "Partner", "Email", "Subject", "Type"]); }
    sheet.appendRow([new Date(), name, email, subject, "Quarterly Touchpoint"]);
  } catch (e) {
    Logger.log("Outreach logging error: " + e.message);
  }
}


// ============================================================
// AUTOMATION 4 — FLYER ROTATION SYSTEM  (fact-gated + rotation guarded)
// ============================================================

function postWeeklyFlyer() {
  Logger.log('Weekly Flyer Post: starting...');
  recordRun_('postWeeklyFlyer');

  const props = PropertiesService.getScriptProperties();
  const metaToken = props.getProperty('META_PAGE_ACCESS_TOKEN');
  const pageId = props.getProperty('META_PAGE_ID');
  const igId = props.getProperty('META_INSTAGRAM_ID');

  if (!metaToken || !pageId || !igId) {
    Logger.log('ERROR: Meta credentials not configured');
    sendMarketingAlert("🔴 Flyer ABORTED — missing credentials",
      "One of META_PAGE_ACCESS_TOKEN / META_PAGE_ID / META_INSTAGRAM_ID is not set. Rotation NOT advanced.");
    return;
  }

  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🔴 Flyer ABORTED — token dead",
      "Code " + health.code + ": " + health.message + "<br><br>" +
      "Rotation NOT advanced. This week's flyer is preserved. Fix the token, then run postWeeklyFlyer manually.");
    Logger.log('Aborted: token dead. Rotation preserved.');
    return;
  }

  let currentWeek = getCurrentFlyerWeek();
  let flyer = FLYER_CONFIG.rotation.find(f => f.week === currentWeek);

  // SELF-HEAL: the stored pointer can land outside the rotation after a
  // clinician is removed (a 4-week rotation shrinking to 3 strands week 4).
  // Without this, find() returns undefined and the weekly flyer silently
  // stops forever. Clamp to week 1, say so out loud, and keep posting.
  if (!flyer) {
    Logger.log('Stored week ' + currentWeek + ' is not in the rotation. Clamping to week 1.');
    sendMarketingAlert("🟠 Flyer rotation pointer was out of range",
      "FLYER_ROTATION_WEEK was " + currentWeek + ", but the rotation has only " +
      FLYER_CONFIG.rotation.length + " weeks. This normally happens after a flyer is " +
      "removed from FLYER_CONFIG. The pointer has been reset to week 1 and posting continues.");
    props.setProperty('FLYER_ROTATION_WEEK', '1');
    currentWeek = 1;
    flyer = FLYER_CONFIG.rotation.find(f => f.week === 1);
    if (!flyer) {
      sendMarketingAlert("🔴 Flyer rotation is empty",
        "No flyer is defined for week 1 in FLYER_CONFIG.rotation. Nothing was posted.");
      Logger.log('ERROR: rotation has no week 1. Nothing posted.');
      return;
    }
  }

  // PRE-FLIGHT: clinician facts must match CLINICIAN_FACTS exactly.
  // A credential or schedule mismatch is a hard stop — we do not publish
  // wrong licensure or wrong hours, and we do not advance past it.
  const factCheck = validateFlyerFacts_(flyer);
  if (!factCheck.ok) {
    sendMarketingAlert("🔴 Flyer post ABORTED — clinician fact mismatch",
      factCheck.reason + "<br><br>" +
      "Nothing was posted. Rotation NOT advanced (still week " + currentWeek + "). " +
      "Fix either CLINICIAN_FACTS or the caption in FLYER_CONFIG so they agree, " +
      "then run validateAllFlyers() followed by postWeeklyFlyer().");
    Logger.log('Aborted on fact check: ' + factCheck.reason);
    return;
  }

  Logger.log(`Posting ${flyer.name} flyer (week ${currentWeek}/${FLYER_CONFIG.rotation.length})`);

  const fbImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-light.png`;
  const igImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-dark.png`;

  const fbSuccess = postToFacebookFlyer(flyer.caption, fbImageUrl, pageId, metaToken);
  const igSuccess = postToInstagramFlyer(flyer.caption, igImageUrl, igId, metaToken);

  logFlyerPost(flyer, fbSuccess, igSuccess);

  // GUARD: only advance if something actually posted.
  // OR = advance if either platform landed. Switch to (fbSuccess && igSuccess)
  // if you'd rather hold the queue until BOTH land.
  if (fbSuccess || igSuccess) {
    advanceFlyerWeek();
    Logger.log(`Rotation advanced. FB:${fbSuccess} IG:${igSuccess}`);
  } else {
    sendMarketingAlert("🟠 Flyer NOT posted — rotation held",
      `Both platforms failed for "${flyer.name}" (week ${currentWeek}). ` +
      `Rotation NOT advanced — this flyer retries next Friday or on manual re-run.`);
    Logger.log('Both platforms failed. Rotation held at week ' + currentWeek + '.');
  }

  sendFlyerNotificationEmail(flyer, fbSuccess, igSuccess);
  Logger.log(`Weekly Flyer Post complete: ${flyer.name} (FB: ${fbSuccess ? 'success' : 'failed'}, IG: ${igSuccess ? 'success' : 'failed'})`);
}


/**
 * MANUAL: Post Hannah's flyer immediately (for Monday urgent posting).
 * Does NOT touch the rotation counter by design.
 */
function postHannahFlyerNow() {
  Logger.log('=== MANUAL: Posting Hannah flyer immediately ===');

  const props = PropertiesService.getScriptProperties();
  const metaToken = props.getProperty('META_PAGE_ACCESS_TOKEN');
  const pageId = props.getProperty('META_PAGE_ID');
  const igId = props.getProperty('META_INSTAGRAM_ID');

  if (!metaToken || !pageId || !igId) {
    Logger.log('ERROR: Meta credentials not configured');
    return;
  }

  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🔴 Manual Hannah post ABORTED — token dead",
      "Code " + health.code + ": " + health.message);
    Logger.log('Aborted: token dead.');
    return;
  }

  const hannahFlyer = FLYER_CONFIG.rotation.find(f => f.name === "hannah");
  if (!hannahFlyer) {
    Logger.log('ERROR: Hannah flyer config not found');
    return;
  }

  // PRE-FLIGHT: same fact gate as the scheduled path. Manual posting is
  // not a bypass — a wrong credential is wrong on any day of the week.
  const factCheck = validateFlyerFacts_(hannahFlyer);
  if (!factCheck.ok) {
    sendMarketingAlert("🔴 Manual Hannah post ABORTED — clinician fact mismatch",
      factCheck.reason + "<br><br>Nothing was posted. Fix CLINICIAN_FACTS or the caption, then re-run.");
    Logger.log('Aborted on fact check: ' + factCheck.reason);
    return;
  }

  const fbImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-hannah-light.png`;
  const igImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-hannah-dark.png`;

  Logger.log('Posting Hannah flyer with urgent priority...');
  const fbSuccess = postToFacebookFlyer(hannahFlyer.caption, fbImageUrl, pageId, metaToken);
  const igSuccess = postToInstagramFlyer(hannahFlyer.caption, igImageUrl, igId, metaToken);

  logFlyerPost({...hannahFlyer, week: 'manual'}, fbSuccess, igSuccess);
  sendFlyerNotificationEmail({...hannahFlyer, week: 'manual'}, fbSuccess, igSuccess);

  Logger.log(`Manual Hannah flyer posted: FB ${fbSuccess ? 'SUCCESS' : 'FAILED'}, IG ${igSuccess ? 'SUCCESS' : 'FAILED'}`);
  if (fbSuccess || igSuccess) {
    Logger.log('🎯 Hannah caseload boost deployed! Time to fill those slots.');
  }
}


/**
 * MANUAL: Post Thunder's welcome/announcement immediately.
 * Does NOT advance the rotation counter. Fact-gated like the scheduled path.
 */
function postThunderWelcomeNow() {
  Logger.log('=== MANUAL: Posting Thunder welcome ===');

  const props = PropertiesService.getScriptProperties();
  const metaToken = props.getProperty('META_PAGE_ACCESS_TOKEN');
  const pageId = props.getProperty('META_PAGE_ID');
  const igId = props.getProperty('META_INSTAGRAM_ID');

  if (!metaToken || !pageId || !igId) {
    Logger.log('ERROR: Meta credentials not configured');
    return;
  }

  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🔴 Thunder welcome ABORTED — token dead",
      "Code " + health.code + ": " + health.message);
    Logger.log('Aborted: token dead.');
    return;
  }

  const thunderFlyer = FLYER_CONFIG.rotation.find(f => f.name === "thunder");
  if (!thunderFlyer) {
    Logger.log('ERROR: Thunder flyer config not found.');
    return;
  }

  const factCheck = validateFlyerFacts_(thunderFlyer);
  if (!factCheck.ok) {
    sendMarketingAlert("🔴 Thunder welcome ABORTED — clinician fact mismatch",
      factCheck.reason + "<br><br>Nothing was posted. Fix CLINICIAN_FACTS or the caption, then re-run.");
    Logger.log('Aborted on fact check: ' + factCheck.reason);
    return;
  }

  const fbImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-thunder-light.png`;
  const igImageUrl = `${FLYER_CONFIG.baseUrl}/flyer-thunder-dark.png`;

  Logger.log('Posting Thunder welcome...');
  const fbSuccess = postToFacebookFlyer(thunderFlyer.caption, fbImageUrl, pageId, metaToken);
  const igSuccess = postToInstagramFlyer(thunderFlyer.caption, igImageUrl, igId, metaToken);

  logFlyerPost({...thunderFlyer, week: 'welcome'}, fbSuccess, igSuccess);
  sendFlyerNotificationEmail({...thunderFlyer, week: 'welcome'}, fbSuccess, igSuccess);

  Logger.log(`Thunder welcome posted: FB ${fbSuccess ? 'SUCCESS' : 'FAILED'}, IG ${igSuccess ? 'SUCCESS' : 'FAILED'}`);
}


function getCurrentFlyerWeek() {
  const props = PropertiesService.getScriptProperties();
  const stored = props.getProperty('FLYER_ROTATION_WEEK');
  if (!stored) {
    props.setProperty('FLYER_ROTATION_WEEK', '1');
    return 1;
  }
  return parseInt(stored);
}


function advanceFlyerWeek() {
  const props = PropertiesService.getScriptProperties();
  const currentWeek = getCurrentFlyerWeek();
  const nextWeek = currentWeek >= FLYER_CONFIG.rotation.length ? 1 : currentWeek + 1;
  props.setProperty('FLYER_ROTATION_WEEK', nextWeek.toString());
  Logger.log(`Flyer rotation: week ${currentWeek} → week ${nextWeek}`);
}


function postToFacebookFlyer(caption, imageUrl, pageId, metaToken) {
  try {
    const response = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
      method: "post",
      payload: {
        url: imageUrl,
        caption: caption,
        access_token: metaToken
      },
      muteHttpExceptions: true
    });

    const result = JSON.parse(response.getContentText());
    if (result.id) {
      Logger.log('FB flyer posted: ' + result.id);
      return true;
    }
    Logger.log('FB flyer failed: ' + JSON.stringify(result));
    return false;
  } catch (e) {
    Logger.log('FB flyer error: ' + e.message);
    return false;
  }
}


function postToInstagramFlyer(caption, imageUrl, igId, metaToken) {
  try {
    const createResponse = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
      method: "post",
      payload: {
        image_url: imageUrl,
        caption: caption,
        access_token: metaToken
      },
      muteHttpExceptions: true
    });

    const createResult = JSON.parse(createResponse.getContentText());
    if (!createResult.id) {
      Logger.log('IG flyer container failed: ' + JSON.stringify(createResult));
      return false;
    }

    Logger.log('IG flyer container created: ' + createResult.id);
    Utilities.sleep(5000);

    const publishResponse = UrlFetchApp.fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
      method: "post",
      payload: {
        creation_id: createResult.id,
        access_token: metaToken
      },
      muteHttpExceptions: true
    });

    const publishResult = JSON.parse(publishResponse.getContentText());
    if (publishResult.id) {
      Logger.log('IG flyer published: ' + publishResult.id);
      return true;
    }
    Logger.log('IG flyer publish failed: ' + JSON.stringify(publishResult));
    return false;
  } catch (e) {
    Logger.log('IG flyer error: ' + e.message);
    return false;
  }
}


function logFlyerPost(flyer, fbSuccess, igSuccess) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Flyer Log');
    if (!sheet) {
      sheet = ss.insertSheet('Flyer Log');
      sheet.appendRow([
        'Date', 'Week', 'Flyer', 'Priority', 'Caption Preview',
        'FB Status', 'IG Status', 'FB Image', 'IG Image'
      ]);
    }
    sheet.appendRow([
      new Date(),
      flyer.week,
      flyer.name,
      flyer.priority,
      flyer.caption.substring(0, 100) + '...',
      fbSuccess ? 'Posted' : 'Failed',
      igSuccess ? 'Posted' : 'Failed',
      `${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-light.png`,
      `${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-dark.png`
    ]);
  } catch (e) {
    Logger.log('Flyer logging error: ' + e.message);
  }
}


function sendFlyerNotificationEmail(flyer, fbSuccess, igSuccess) {
  const subject = `[Practice Pilot] Weekly flyer posted: ${flyer.name}`;

  let body = `<h3>Weekly Flyer Posted</h3>`;
  body += `<p><strong>Flyer:</strong> ${flyer.name} (week ${flyer.week}, ${flyer.priority} priority)</p>`;
  body += `<p><strong>Facebook:</strong> ${fbSuccess ? '✅ Posted' : '❌ Failed'}</p>`;
  body += `<p><strong>Instagram:</strong> ${igSuccess ? '✅ Posted' : '❌ Failed'}</p>`;
  body += `<hr>`;
  body += `<p><strong>Caption used:</strong></p>`;
  body += `<blockquote>${flyer.caption}</blockquote>`;
  body += `<hr>`;
  body += `<p><strong>Images:</strong></p>`;
  body += `<p>FB (light): <a href="${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-light.png">View</a></p>`;
  body += `<p>IG (dark): <a href="${FLYER_CONFIG.baseUrl}/flyer-${flyer.name}-dark.png">View</a></p>`;

  const nextWeek = (typeof flyer.week === 'number')
    ? (flyer.week >= FLYER_CONFIG.rotation.length ? 1 : flyer.week + 1)
    : 1;
  const nextFlyer = FLYER_CONFIG.rotation.find(f => f.week === nextWeek);
  body += `<p><em>Next Friday: ${nextFlyer ? nextFlyer.name : 'unknown'}</em></p>`;

  MailApp.sendEmail({
    to: MKTG_CONFIG.notifyEmail,
    subject: subject,
    htmlBody: body
  });
}


// ============================================================
// PROFILE AUDIT REMINDER
// ============================================================

function runProfileAuditReminder() {
  recordRun_('runProfileAuditReminder');
  const month = new Date().getMonth();
  if (![0, 3, 6, 9].includes(month)) { Logger.log("Not a quarter month, skipping"); return; }
  MailApp.sendEmail({
    to: MKTG_CONFIG.notifyEmail,
    subject: "[Practice Pilot] Quarterly Profile Audit Reminder",
    htmlBody: `<h3>Time for Your Quarterly Profile Audit</h3>
      <p>Review and update:</p>
      <ul>
        <li><strong>Clinician roster</strong> — has anyone joined or left? If someone left, purge them from CLINICIAN_FACTS, FLYER_CONFIG (and renumber), the website, Psychology Today, and any printed handouts</li>
        <li><strong>Clinician credentials &amp; schedules</strong> — confirm CLINICIAN_FACTS in the script still matches reality, then run validateAllFlyers()</li>
        <li><strong>Team flyer caption</strong> — it is NOT fact-gated; check any headcount or claim by hand</li>
        <li><strong>Google Business Profile</strong> — hours, photos, services</li>
        <li><strong>Psychology Today</strong> — specialties, insurance, availability</li>
        <li><strong>Website</strong> — team bios, services, contact info</li>
        <li><strong>Insurance panels</strong> — new credentialing?</li>
      </ul>
      <p>Set aside 30 minutes this week.</p>`
  });
  Logger.log("Profile audit reminder sent.");
}


// ============================================================
// META TOKEN MANAGEMENT  (System User / Page token aware)
// ============================================================

/**
 * ONE-TIME: derive the Page access token from the System User token
 * and store it in META_PAGE_ACCESS_TOKEN. A System User token hits
 * (#200) publish_actions on FB Page endpoints — Page posting requires
 * the PAGE token. The Page token derived from a never-expiring System
 * User token is ALSO never-expiring, and works for BOTH FB and IG.
 *
 * Run this once after setting the System User token. Re-run only if you
 * regenerate the System User token.
 */
function deriveAndStorePageToken() {
  const props = PropertiesService.getScriptProperties();
  const userToken = props.getProperty('META_PAGE_ACCESS_TOKEN'); // currently the System User token
  const pageId    = props.getProperty('META_PAGE_ID');
  if (!userToken || !pageId) { Logger.log('Missing token or META_PAGE_ID'); return; }

  const url = 'https://graph.facebook.com/v19.0/' + pageId +
    '?fields=access_token,name&access_token=' + encodeURIComponent(userToken);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const data = JSON.parse(res.getContentText());

  if (data.error) {
    Logger.log('Derive failed: ' + JSON.stringify(data.error));
    return;
  }
  if (!data.access_token) {
    Logger.log('No page token returned. The System User likely lacks "Create content" ' +
               'on this Page. In Business Settings → System Users → your bot → Assigned ' +
               'Assets → Pages, confirm the Page is added with full content control. ' +
               'Response: ' + JSON.stringify(data));
    return;
  }

  props.setProperty('META_PAGE_ACCESS_TOKEN', data.access_token);
  Logger.log('✅ Page token stored for: ' + data.name + '. FB + IG should both post now.');
}

/**
 * Lightweight liveness check. Pre-flight before any post.
 * Returns { ok, code, message }.
 */
function checkMetaTokenHealth() {
  const token = PropertiesService.getScriptProperties().getProperty("META_PAGE_ACCESS_TOKEN");
  if (!token) return { ok: false, code: -1, message: "META_PAGE_ACCESS_TOKEN not set" };
  const url = "https://graph.facebook.com/v19.0/me?fields=id,name&access_token=" + encodeURIComponent(token);
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const body = JSON.parse(res.getContentText());
    if (body.error) return { ok: false, code: body.error.code, message: body.error.message };
    return { ok: true, code: 0, message: "Valid for " + body.name + " (" + body.id + ")" };
  } catch (e) {
    return { ok: false, code: -2, message: "Health check threw: " + e.message };
  }
}

/**
 * Weekly token check (Sunday). With a never-expiring token, debug_token
 * reports expires_at = 0 and this stays silent forever. Any non-expiry
 * death produces a loud email instead of a silent dead slot.
 */
function checkMetaTokenExpiry() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("META_PAGE_ACCESS_TOKEN");
  if (!token) { Logger.log("No META_PAGE_ACCESS_TOKEN set."); return; }

  const health = checkMetaTokenHealth();
  if (!health.ok) {
    sendMarketingAlert("🔴 Meta token DEAD",
      "Posting token failed liveness check.<br><br>" +
      "Code: " + health.code + "<br>Message: " + health.message + "<br><br>" +
      "FB/IG posts will NOT publish until fixed. Generate a new System User token " +
      "(business.facebook.com → System Users → Generate, Expiration: Never), update " +
      "META_PAGE_ACCESS_TOKEN, then run deriveAndStorePageToken().");
    return;
  }

  try {
    const appId = props.getProperty("META_APP_ID");
    const appSecret = props.getProperty("META_APP_SECRET");
    const appToken = (appId && appSecret) ? (appId + "|" + appSecret) : token;
    const res = UrlFetchApp.fetch(
      "https://graph.facebook.com/debug_token?input_token=" + encodeURIComponent(token) +
      "&access_token=" + encodeURIComponent(appToken),
      { muteHttpExceptions: true }
    );
    const data = JSON.parse(res.getContentText()).data || {};

    if (!data.expires_at || data.expires_at === 0) {
      Logger.log("Token never expires. Nothing to do.");
      return;
    }

    const expiresAt = new Date(data.expires_at * 1000);
    const daysLeft = Math.floor((expiresAt - new Date()) / 86400000);
    Logger.log("Meta token expires in " + daysLeft + " days.");

    if (daysLeft <= 21) {
      sendMarketingAlert("🟠 Meta token expiring — switch to System User",
        "Your token expires in " + daysLeft + " days (" + expiresAt.toDateString() + ").<br><br>" +
        "This means it is NOT a never-expire token. Generate a System User token with " +
        "Expiration: Never, update META_PAGE_ACCESS_TOKEN, then run deriveAndStorePageToken().");
    }
  } catch (e) {
    Logger.log("Token inspection error: " + e.message);
  }
}

/**
 * DEPRECATED — passing a page token through fb_exchange_token (which
 * expects a USER token) never durably extended anything. The System
 * User token removes the need. Loud no-op so stray calls surface.
 */
function refreshMetaToken() {
  Logger.log("refreshMetaToken() is deprecated. Use a System User token (never expires). No-op.");
  sendMarketingAlert("⚠️ refreshMetaToken called (deprecated)",
    "This function is deprecated and does nothing. If you're seeing this, something still " +
    "calls it. Switch to a System User token and remove the call.");
}


// ============================================================
// JOB HEARTBEAT — catches jobs that never ran (orphaned triggers)
// ============================================================

function weeklyHeartbeat() {
  const props = PropertiesService.getScriptProperties();
  const now = Date.now();
  const DAY = 86400000;

  const jobs = {
    'postWeeklyFlyer':        10,
    'runGBPKeeper':           10,
    'drainInstagramQueue':    10,
    'runSocialContentEngine': 40
  };

  const stale = [];
  Object.keys(jobs).forEach(job => {
    const last = Number(props.getProperty('LASTRUN_' + job) || 0);
    const days = last ? Math.round((now - last) / DAY) : 999;
    if (now - last > jobs[job] * DAY) {
      stale.push(job + ": last ran " + (last ? days + " days ago" : "NEVER"));
    }
  });

  if (stale.length) {
    sendMarketingAlert("🟠 Job heartbeat — stale jobs detected",
      "These scheduled jobs haven't run recently:<br><br>" + stale.join("<br>") +
      "<br><br>Most likely cause: a missing or orphaned trigger. " +
      "Go to Apps Script → Triggers and confirm each one exists.");
  } else {
    Logger.log("Heartbeat OK — all jobs ran recently.");
  }
}


// ============================================================
// TEST FUNCTIONS
// ============================================================

function testSocialEngine()    { Logger.log("=== TEST: Social Content Engine ==="); runSocialContentEngine(); }
function testGBPPost()         { Logger.log("=== TEST: GBP Keeper ===");            runGBPKeeper(); }
function testReferralOutreach(){ Logger.log("=== TEST: Referral Outreach ===");     runReferralOutreach(); }
function testProfileAudit()    { Logger.log("=== TEST: Profile Audit ===");         runProfileAuditReminder(); }
function testMetaTokenCheck()  { Logger.log("=== TEST: Meta Token Check ===");      checkMetaTokenExpiry(); }
function testTokenHealth()     { const h = checkMetaTokenHealth(); Logger.log("Token health: " + JSON.stringify(h)); }
function testHeartbeat()       { Logger.log("=== TEST: Heartbeat ==="); weeklyHeartbeat(); }

/**
 * Run this after ANY edit to FLYER_CONFIG or CLINICIAN_FACTS.
 */
function testValidateFlyers() {
  Logger.log("=== TEST: Clinician Fact Validation ===");
  const ok = validateAllFlyers();
  Logger.log(ok ? "RESULT: all clean." : "RESULT: FAILURES — see above. Flyers will not post until fixed.");
}

function testModelResolver() {
  forceReresolveModel();
  Logger.log("Resolved Claude model: " + getClaudeModel());
}

function testImageGeneration() {
  Logger.log("=== TEST: Image Pipeline (all 3 templates) ===");
  const apiKey      = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  const githubToken = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  const testPosts   = [
    "Your nervous system isn't broken — it's doing exactly what it learned to do. Hypervigilance isn't a flaw. It's a survival skill that kept you safe.",
    "Therapy isn't about fixing what's wrong with you. It's about understanding what happened to you.",
    "You don't have to have it all figured out to start therapy. Most people don't walk in with a clear diagnosis."
  ];
  testPosts.forEach((post, i) => {
    Logger.log(`\nTemplate ${i}: ${CARD_TEMPLATES[i].name}`);
    const result = generatePostImage(post, i, apiKey, githubToken);
    Logger.log(`  Quote: ${result.quote}`);
    Logger.log(`  SVG: ${result.svgUrl}`);
    Logger.log(`  PNG: ${result.pngUrl}`);
    Utilities.sleep(3000);
  });
}

function testSingleCard() {
  Logger.log("=== TEST: Single Card ===");
  const apiKey      = PropertiesService.getScriptProperties().getProperty("ANTHROPIC_API_KEY");
  const githubToken = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  const testPost    = "Your nervous system isn't broken — it's doing exactly what it learned to do. Hypervigilance isn't a flaw — it's a survival skill that kept you safe. The work now isn't about fixing what's wrong.";
  const result = generatePostImage(testPost, 0, apiKey, githubToken);
  Logger.log(`Quote: ${result.quote}`);
  Logger.log(`SVG:   ${result.svgUrl}`);
  Logger.log(`PNG:   ${result.pngUrl}`);
}

function viewInstagramQueue() {
  const queue = PropertiesService.getScriptProperties().getProperty("IG_QUEUE");
  if (!queue) { Logger.log("Instagram queue is empty."); return; }
  const parsed = JSON.parse(queue);
  Logger.log(`${parsed.length} posts in queue:`);
  parsed.forEach((item, i) => Logger.log(`  ${i + 1}. "${item.quote}" | Image: ${item.imageUrl ? "Yes" : "No"} | Retries: ${item._retries || 0}`));
}

function clearInstagramQueue() {
  PropertiesService.getScriptProperties().deleteProperty("IG_QUEUE");
  Logger.log("Instagram queue cleared.");
}


// ============================================================
// FLYER TEST FUNCTIONS
// ============================================================

function testFlyerPost() {
  Logger.log('=== TEST: Flyer Posting System ===');
  postWeeklyFlyer();
}

function viewFlyerRotation() {
  const currentWeek = getCurrentFlyerWeek();
  const currentFlyer = FLYER_CONFIG.rotation.find(f => f.week === currentWeek);
  Logger.log(`Current flyer rotation: Week ${currentWeek}`);
  Logger.log(`Current flyer: ${currentFlyer ? currentFlyer.name : 'unknown — pointer is OUT OF RANGE, run resetFlyerRotation()'}`);
  Logger.log(`Priority: ${currentFlyer ? currentFlyer.priority : 'unknown'}`);
  Logger.log('\nFull rotation schedule:');
  FLYER_CONFIG.rotation.forEach(flyer => {
    const current = flyer.week === currentWeek ? ' ← CURRENT' : '';
    const factStatus = validateFlyerFacts_(flyer).ok ? '' : '  🔴 FACT MISMATCH — will not post';
    Logger.log(`  Week ${flyer.week}: ${flyer.name} (${flyer.priority})${current}${factStatus}`);
  });
}

function advanceFlyerRotation() {
  const before = getCurrentFlyerWeek();
  advanceFlyerWeek();
  const after = getCurrentFlyerWeek();
  Logger.log(`Manually advanced flyer rotation: ${before} → ${after}`);
}

function resetFlyerRotation() {
  PropertiesService.getScriptProperties().setProperty('FLYER_ROTATION_WEEK', '1');
  Logger.log('Flyer rotation reset to week 1 (thunder)');
}
