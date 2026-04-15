/**
 * ============================================================
 * PRACTICE PILOT — MARKETING AUTOMATION SYSTEM
 * v1.0 — Google Apps Script
 * ============================================================
 * Houston Heights Consulting LLC · Practice Pilot
 * joe@privatepraxis.co · practicepilot.app
 *
 * CONTAINS THREE AUTOMATIONS:
 *
 * 1. SOCIAL CONTENT ENGINE
 *    Monthly AI-generated social media content → Buffer drafts
 *    Trigger: 1st of each month, 8AM
 *
 * 2. GOOGLE BUSINESS PROFILE KEEPER
 *    Weekly AI-generated GBP post + quarterly profile audit reminder
 *    Trigger: Every Monday 8AM + quarterly reminder
 *
 * 3. REFERRAL PARTNER OUTREACH
 *    Quarterly personalized touchpoints to referral network
 *    New partner: welcome sequence within 24hrs of being added
 *    Trigger: Quarterly time trigger + onEdit for new partners
 *
 * SETUP:
 * 1. Update CONFIG block below with all practice and API values
 * 2. Run deleteTriggers() then createMarketingTriggers()
 * 3. Run testSocialEngine() to verify content generation
 * 4. Run testGBPPost() to verify GBP posting
 * 5. Run testReferralOutreach() to verify email sends
 * ============================================================
 */

// ============================================================
// CONFIG — EDIT THESE VALUES ONLY
// ============================================================

const MKTG_CONFIG = {

  // Practice identity
  practiceName:    "Houston Heights Therapy",
  practiceEmail:   "admin@houstonheightstherapy.com",
  ownerEmail:      "joe@houstonheightstherapy.com",
  practicePhone:   "(713) 000-0000",
  practiceWebsite: "https://houstonheightstherapy.com",
  practiceCity:    "Houston Heights, TX",
  practiceType:    "group practice",

  // Who you serve — used in content prompts
  specialties: [
    "trauma and PTSD",
    "anxiety",
    "LGBTQ+ affirming therapy",
    "neurodivergent clients",
    "depression",
    "life transitions"
  ],
  modalities: ["IFS", "EMDR", "CBT", "trauma-informed approaches"],
  clientTypes: ["adults", "adolescents", "couples"],
  insuranceAccepted: "Aetna, BCBS, United Healthcare, Cigna, and self-pay",

  // Voice and tone
  tone: "warm, direct, and human — we avoid jargon and toxic positivity",
  avoidPhrases: ["mental health journey", "safe space", "it's okay not to be okay"],
  brandVoice: "We're a trauma-informed group practice that takes a real, human approach to therapy. We don't do toxic positivity or generic advice. Our clients are smart, self-aware people who are ready to do real work.",

  // Content settings
  postsPerMonth:  12,   // number of social posts to generate monthly
  acceptingClients: true,
  waitlistAvailable: false,

  // Notifications
  adminEmail:  "admin@houstonheightstherapy.com",
  notifyEmail: "joe@houstonheightstherapy.com",

  // API keys — store these in Script Properties, not here
  // Set via: File > Project Properties > Script Properties
  // Keys: ANTHROPIC_API_KEY, BUFFER_API_KEY, GBP_ACCOUNT_ID, GBP_LOCATION_ID

  // Buffer settings
  // Get profile IDs from: https://api.bufferapp.com/1/profiles.json
  bufferProfileIds: [
    "REPLACE_WITH_FACEBOOK_PROFILE_ID",
    "REPLACE_WITH_INSTAGRAM_PROFILE_ID",
    // "REPLACE_WITH_LINKEDIN_PROFILE_ID"  // add if needed
  ],

  // Sheet names in the master spreadsheet
  sheets: {
    contentLog:   "Content Log",
    gbpLog:       "GBP Log",
    referralList: "Referral Partners",
    outreachLog:  "Outreach Log"
  },

  // Referral outreach cadence in days
  referralCadenceDays: 90,

};

// ============================================================
// COLUMN MAP — REFERRAL PARTNERS SHEET
// ============================================================

const REF_COLS = {
  name:           0,   // A — Partner full name
  role:           1,   // B — Role (PCP, Psychiatrist, School Counselor, etc.)
  organization:   2,   // C — Practice or organization name
  email:          3,   // D — Email address
  phone:          4,   // E — Phone (optional)
  specialtyMatch: 5,   // F — What kind of clients they refer
  notes:          6,   // G — Admin notes
  dateAdded:      7,   // H — When added
  lastContact:    8,   // I — Date of last outreach
  status:         9,   // J — Active / Inactive / New
  welcomeSent:    10   // K — Script sets this when welcome email fires
};

// ============================================================
// TRIGGER MANAGEMENT
// ============================================================

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('All triggers deleted.');
}

function createMarketingTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Social Content Engine — 1st of each month at 8AM
  ScriptApp.newTrigger('runSocialContentEngine')
    .timeBased()
    .onMonthDay(1)
    .atHour(8)
    .create();

  // GBP Keeper — every Monday at 8AM
  ScriptApp.newTrigger('runGBPKeeper')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .create();

  // Referral outreach — quarterly (runs monthly, script checks if 90 days elapsed)
  ScriptApp.newTrigger('runReferralOutreach')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();

  // New partner welcome — fires on sheet edit
  ScriptApp.newTrigger('onReferralSheetEdit')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  // Quarterly profile audit reminder — fires on 1st of Jan, Apr, Jul, Oct
  ScriptApp.newTrigger('runProfileAuditReminder')
    .timeBased()
    .onMonthDay(1)
    .atHour(10)
    .create();

  // Process delayed sends — every 30 minutes
  ScriptApp.newTrigger('processMarketingDelayed')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('Marketing triggers created.');
}

// ============================================================
// AUTOMATION 1 — SOCIAL CONTENT ENGINE
// Generates a month of social posts via Claude → Buffer drafts
// ============================================================

function runSocialContentEngine() {
  Logger.log('Social Content Engine: starting...');

  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    Logger.log('ERROR: ANTHROPIC_API_KEY not set in Script Properties');
    return;
  }

  // Build the content generation prompt
  const prompt = buildSocialContentPrompt();

  // Call Claude API
  const posts = generatePostsWithClaude(prompt, apiKey);

  if (!posts || posts.length === 0) {
    Logger.log('No posts generated — check Claude API response');
    sendMarketingAlert(
      'Content Generation Failed',
      'The monthly social content generation failed. Check the Apps Script logs for details.',
      null, null
    );
    return;
  }

  // Send posts to Buffer as drafts
  const bufferKey = PropertiesService.getScriptProperties()
    .getProperty('BUFFER_API_KEY');

  let queuedCount = 0;

  if (bufferKey) {
    const scheduleStart = getNextMonday();
    posts.forEach((post, i) => {
      const scheduledAt = new Date(scheduleStart.getTime() + (i * 2 * 24 * 60 * 60 * 1000));
      const success = queueToBuffer(post.text, scheduledAt, bufferKey);
      if (success) queuedCount++;
      Utilities.sleep(500); // avoid rate limiting
    });
  }

  // Log to sheet
  logContentGeneration(posts);

  // Send summary to practice owner
  sendContentSummaryEmail(posts, queuedCount);

  Logger.log('Social Content Engine: complete. ' + posts.length + ' posts generated, ' + queuedCount + ' queued to Buffer.');
}

function buildSocialContentPrompt() {
  const month = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy');
  const specialties = MKTG_CONFIG.specialties.join(', ');
  const modalities = MKTG_CONFIG.modalities.join(', ');
  const clientTypes = MKTG_CONFIG.clientTypes.join(', ');
  const acceptingLine = MKTG_CONFIG.acceptingClients
    ? `The practice is currently accepting new clients. Include a soft call to action in 3–4 posts (e.g. "We're currently accepting new clients — reach out to learn more").`
    : `The practice is not currently accepting new clients. Do not include calls to book or reach out.`;

  return `You are writing social media content for ${MKTG_CONFIG.practiceName}, a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity}.

PRACTICE VOICE:
${MKTG_CONFIG.brandVoice}

TONE: ${MKTG_CONFIG.tone}

NEVER use these phrases: ${MKTG_CONFIG.avoidPhrases.join(', ')}

SPECIALTIES: ${specialties}
MODALITIES: ${modalities}
CLIENT TYPES: ${clientTypes}
INSURANCE: ${MKTG_CONFIG.insuranceAccepted}

${acceptingLine}

Generate exactly ${MKTG_CONFIG.postsPerMonth} social media posts for ${month}.

POST MIX (vary across these types):
- Psychoeducation: explain a concept like nervous system regulation, window of tolerance, or attachment styles in plain language
- Myth-busting: correct a common misconception about therapy or mental health
- Normalizing therapy: reduce stigma, make therapy feel accessible and human
- Reflective prompt: invite the reader to pause and notice something about themselves
- Seasonal relevance: tie to something relevant this month (awareness days, seasons, back to school, etc.)
- Practice voice: share the practice's perspective or approach in 1–3 sentences

RULES FOR ALL POSTS:
- 100–200 words maximum per post
- No clinical jargon without explanation
- No toxic positivity or empty validation
- No fear or shame as motivation
- No generic therapy-speak
- Sound like a real person, not a marketing department
- Each post should stand alone and be complete
- No hashtags unless they're genuinely relevant (1–2 max per post if used)

RESPOND WITH VALID JSON ONLY. No preamble, no markdown backticks. Format:
[
  {"type": "psychoeducation", "text": "post text here"},
  {"type": "myth-busting", "text": "post text here"}
]`;
}

function generatePostsWithClaude(prompt, apiKey) {
  const url = 'https://api.anthropic.com/v1/messages';

  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (data.error) {
      Logger.log('Claude API error: ' + JSON.stringify(data.error));
      return null;
    }

    const rawText = data.content[0].text.trim();
    // Strip any accidental markdown backticks
    const clean = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);

  } catch(err) {
    Logger.log('generatePostsWithClaude error: ' + err.message);
    return null;
  }
}

function queueToBuffer(postText, scheduledAt, bufferKey) {
  const url = 'https://api.bufferapp.com/1/updates/create.json';

  const profileIds = MKTG_CONFIG.bufferProfileIds;

  const payload = {
    text: postText,
    scheduled_at: scheduledAt.toISOString()
  };

  // Add profile IDs
  profileIds.forEach((id, i) => {
    payload['profile_ids[' + i + ']'] = id;
  });

  const options = {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + bufferKey },
    payload: payload,
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (data.success || data.updates) {
      Logger.log('Buffer: queued post successfully');
      return true;
    } else {
      Logger.log('Buffer error: ' + JSON.stringify(data));
      return false;
    }
  } catch(err) {
    Logger.log('queueToBuffer error: ' + err.message);
    return false;
  }
}

function logContentGeneration(posts) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MKTG_CONFIG.sheets.contentLog);
  if (!sheet) return;

  const now = new Date();
  const month = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM yyyy');

  posts.forEach(post => {
    sheet.appendRow([
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy'),
      month,
      post.type || 'general',
      post.text,
      'Queued to Buffer'
    ]);
  });
}

function sendContentSummaryEmail(posts, queuedCount) {
  const month = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy');

  let postPreviews = posts.slice(0, 3).map((p, i) =>
    `<div style="margin-bottom:16px;padding:14px;background:#1a1a1a;border-left:3px solid #f97316;border-radius:2px;">
      <div style="font-family:monospace;font-size:10px;color:#f97316;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;">${p.type || 'general'}</div>
      <div style="font-size:13px;color:#cccccc;line-height:1.6;">${p.text.substring(0, 180)}${p.text.length > 180 ? '...' : ''}</div>
    </div>`
  ).join('');

  const body = `
    <p>Your content for <strong>${month}</strong> is ready.</p>
    <p><strong>${posts.length} posts generated.</strong> ${queuedCount > 0 ? queuedCount + ' queued to Buffer as drafts.' : 'Log into Buffer to review and schedule.'}</p>
    <p style="color:#888;font-size:13px;">Here's a preview of the first 3 posts:</p>
    ${postPreviews}
    <p>All ${posts.length} posts are in Buffer as drafts — review, edit, or delete any before they publish. Nothing goes live without your approval.</p>
    <p>The full content log is in your Practice Pilot spreadsheet under the "Content Log" tab.</p>`;

  GmailApp.sendEmail(
    MKTG_CONFIG.notifyEmail,
    '✈ Your ' + month + ' content is ready — ' + posts.length + ' posts in Buffer',
    '',
    {
      bcc: MKTG_CONFIG.adminEmail,
      htmlBody: buildMarketingEmail('Content ready for ' + month + '.', body)
    }
  );
}

// ============================================================
// AUTOMATION 2 — GOOGLE BUSINESS PROFILE KEEPER
// Weekly GBP post + quarterly profile audit reminder
// ============================================================

function runGBPKeeper() {
  Logger.log('GBP Keeper: starting...');

  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) {
    Logger.log('ERROR: ANTHROPIC_API_KEY not set');
    return;
  }

  // Generate this week's GBP post
  const postText = generateGBPPost(apiKey);

  if (!postText) {
    Logger.log('GBP post generation failed');
    return;
  }

  // Publish to GBP
  const gbpSuccess = publishToGBP(postText);

  // Log it
  logGBPPost(postText, gbpSuccess);

  // Alert practice owner with preview
  sendGBPAlert(postText, gbpSuccess);

  // Check if quarterly profile audit is due
  runProfileAuditReminderIfDue();

  Logger.log('GBP Keeper: complete. Published: ' + gbpSuccess);
}

function generateGBPPost(apiKey) {
  const weekOf = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM d, yyyy');
  const specialties = MKTG_CONFIG.specialties.slice(0, 3).join(', ');
  const acceptingLine = MKTG_CONFIG.acceptingClients
    ? 'End with a single soft sentence about accepting new clients.'
    : 'Do not mention new client availability.';

  const prompt = `Write one Google Business Profile post for ${MKTG_CONFIG.practiceName}, a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity} (week of ${weekOf}).

Practice specializes in: ${specialties}
Voice: ${MKTG_CONFIG.tone}
${acceptingLine}

Rules:
- 100–150 words maximum
- Local, warm, and human — not generic
- No clinical jargon without explanation
- One clear topic — psychoeducation, myth-bust, or seasonal relevance
- No phone numbers (Google rejects posts with phone numbers)
- End with the practice website: ${MKTG_CONFIG.practiceWebsite}

Respond with the post text only. No preamble, no quotes, no labels.`;

  const url = 'https://api.anthropic.com/v1/messages';

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    if (data.error) { Logger.log('Claude error: ' + JSON.stringify(data.error)); return null; }
    return data.content[0].text.trim();
  } catch(err) {
    Logger.log('generateGBPPost error: ' + err.message);
    return null;
  }
}

function publishToGBP(postText) {
  const accountId  = PropertiesService.getScriptProperties().getProperty('GBP_ACCOUNT_ID');
  const locationId = PropertiesService.getScriptProperties().getProperty('GBP_LOCATION_ID');
  const token      = PropertiesService.getScriptProperties().getProperty('GBP_ACCESS_TOKEN');

  if (!accountId || !locationId || !token) {
    Logger.log('GBP credentials not set — skipping publish. Post logged and emailed for manual use.');
    return false;
  }

  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;

  const payload = {
    languageCode: 'en-US',
    summary: postText,
    topicType: 'STANDARD',
    callToAction: {
      actionType: 'LEARN_MORE',
      url: MKTG_CONFIG.practiceWebsite
    }
  };

  const options = {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());

    if (data.name) {
      Logger.log('GBP post published: ' + data.name);
      return true;
    } else {
      Logger.log('GBP publish failed: ' + JSON.stringify(data));
      return false;
    }
  } catch(err) {
    Logger.log('publishToGBP error: ' + err.message);
    return false;
  }
}

function logGBPPost(postText, published) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MKTG_CONFIG.sheets.gbpLog);
  if (!sheet) return;

  sheet.appendRow([
    Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
    postText,
    published ? 'Published' : 'Manual — credentials not set',
    'Expires in 7 days'
  ]);
}

function sendGBPAlert(postText, published) {
  const statusLine = published
    ? '✓ Published to your Google Business Profile.'
    : '⚠ GBP credentials not configured — copy this post and publish manually, or set up your GBP access token in Script Properties.';

  GmailApp.sendEmail(
    MKTG_CONFIG.notifyEmail,
    '✈ This week\'s Google Business Profile post',
    '',
    {
      htmlBody: buildMarketingEmail(
        "This week's GBP post.",
        `<p>${statusLine}</p>
        <div style="margin:16px 0;padding:16px;background:#1a1a1a;border-left:3px solid #f97316;border-radius:2px;">
          <div style="font-size:13px;color:#cccccc;line-height:1.7;">${postText.replace(/\n/g, '<br>')}</div>
        </div>
        <p style="color:#888;font-size:12px;">Google posts expire after 7 days. This one was generated and ${published ? 'published' : 'logged'} automatically. View your GBP post history in the "GBP Log" tab of your Practice Pilot sheet.</p>`
      )
    }
  );
}

function runProfileAuditReminderIfDue() {
  // Only fire in January, April, July, October
  const month = new Date().getMonth(); // 0-indexed
  const quarterlyMonths = [0, 3, 6, 9];
  if (!quarterlyMonths.includes(month)) return;

  runProfileAuditReminder();
}

function runProfileAuditReminder() {
  const checklist = [
    'Profile photo is current and professional',
    'Cover photo reflects the practice',
    'Business description mentions current specialties',
    'Office hours are accurate',
    'Insurance accepted list is up to date',
    'Website URL is correct and loads',
    'Phone number is correct',
    'Address and suite number are accurate',
    'Specialties / services list is complete',
    'Booking link is active (if applicable)',
    'At least one recent photo is uploaded'
  ];

  const checklistHtml = checklist.map(item =>
    `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #222;">
      <span style="color:#444;font-size:16px;">☐</span>
      <span style="font-size:13px;color:#cccccc;">${item}</span>
    </div>`
  ).join('');

  GmailApp.sendEmail(
    MKTG_CONFIG.notifyEmail,
    '✈ Quarterly GBP audit — ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MMMM yyyy'),
    '',
    {
      htmlBody: buildMarketingEmail(
        'Time for your quarterly profile audit.',
        `<p>Your Google Business Profile is one of the highest-ROI marketing assets you have. This quarterly check takes about 5 minutes.</p>
        <p style="font-size:13px;color:#888;margin-bottom:16px;">Review each item at: <a href="https://business.google.com" style="color:#f97316;">business.google.com</a></p>
        ${checklistHtml}
        <p style="margin-top:16px;font-size:13px;color:#888;">Profiles that are kept current rank higher in local search. Even small updates — a new photo, an updated description — signal to Google that the profile is active.</p>`
      )
    }
  );
}

// ============================================================
// AUTOMATION 3 — REFERRAL PARTNER OUTREACH
// Quarterly touchpoints + new partner welcome sequence
// ============================================================

function onReferralSheetEdit(e) {
  try {
    const sheet = e.range.getSheet();
    if (sheet.getName() !== MKTG_CONFIG.sheets.referralList) return;

    const row = e.range.getRow();
    if (row <= 1) return; // header row

    const data = sheet.getRange(row, 1, 1, 11).getValues()[0];
    const name        = data[REF_COLS.name];
    const email       = data[REF_COLS.email];
    const status      = data[REF_COLS.status];
    const welcomeSent = data[REF_COLS.welcomeSent];

    // Only fire for new active partners who haven't had welcome sent
    if (!name || !email) return;
    if (status !== 'New' && status !== 'Active') return;
    if (welcomeSent === 'Sent') return;

    // Schedule welcome email in 24hrs to give admin time to review
    scheduleMarketingDelayed('referralWelcome', {
      name, email,
      role:         data[REF_COLS.role],
      organization: data[REF_COLS.organization],
      row: row
    }, 60); // 60 minutes — fires quickly for testing, change to 1440 (24hrs) for production

    Logger.log('Referral welcome scheduled for: ' + name);

  } catch(err) {
    Logger.log('onReferralSheetEdit error: ' + err.message);
  }
}

function runReferralOutreach() {
  Logger.log('Referral Outreach: starting quarterly check...');

  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('ANTHROPIC_API_KEY');

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MKTG_CONFIG.sheets.referralList);
  const log   = ss.getSheetByName(MKTG_CONFIG.sheets.outreachLog);

  if (!sheet) {
    Logger.log('Referral Partners sheet not found');
    return;
  }

  const data = sheet.getDataRange().getValues();
  const today = new Date();
  const cadenceMs = MKTG_CONFIG.referralCadenceDays * 24 * 60 * 60 * 1000;

  let sentCount = 0;
  let skippedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row         = data[i];
    const name        = row[REF_COLS.name];
    const email       = row[REF_COLS.email];
    const role        = row[REF_COLS.role];
    const org         = row[REF_COLS.organization];
    const status      = row[REF_COLS.status];
    const lastContact = row[REF_COLS.lastContact];

    if (!name || !email || status === 'Inactive') {
      skippedCount++;
      continue;
    }

    // Check if cadence has elapsed
    if (lastContact) {
      const lastDate = new Date(lastContact);
      if ((today - lastDate) < cadenceMs) {
        skippedCount++;
        continue;
      }
    }

    // Generate personalized outreach
    const emailContent = apiKey
      ? generateReferralEmail(name, role, org, apiKey)
      : buildDefaultReferralEmail(name, role, org);

    if (!emailContent) continue;

    // Send the email
    GmailApp.sendEmail(
      email,
      emailContent.subject,
      '',
      {
        from: MKTG_CONFIG.practiceEmail,
        bcc: MKTG_CONFIG.notifyEmail,
        htmlBody: buildReferralOutreachEmail(emailContent.body, name)
      }
    );

    // Update last contact date in sheet
    sheet.getRange(i + 1, REF_COLS.lastContact + 1)
      .setValue(Utilities.formatDate(today, Session.getScriptTimeZone(), 'MM/dd/yyyy'));

    // Log outreach
    if (log) {
      log.appendRow([
        Utilities.formatDate(today, Session.getScriptTimeZone(), 'MM/dd/yyyy'),
        name, role, org, email, 'Quarterly touchpoint', 'Sent'
      ]);
    }

    sentCount++;
    Utilities.sleep(1000); // rate limit protection
  }

  // Send summary to practice owner
  if (sentCount > 0) {
    sendReferralOutreachSummary(sentCount, skippedCount);
  }

  Logger.log('Referral Outreach: complete. Sent: ' + sentCount + ', Skipped: ' + skippedCount);
}

function generateReferralEmail(partnerName, role, organization, apiKey) {
  const firstName = partnerName.split(' ')[0] || partnerName;
  const specialties = MKTG_CONFIG.specialties.slice(0, 3).join(', ');
  const roleContext = getRoleContext(role);

  const prompt = `Write a brief, warm quarterly touchpoint email from ${MKTG_CONFIG.practiceName} to a referral partner.

SENDER: ${MKTG_CONFIG.practiceName} — a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity}
RECIPIENT: ${firstName} at ${organization || 'their practice'} — Role: ${role}
PRACTICE VOICE: ${MKTG_CONFIG.tone}

CONTEXT FOR THIS PARTNER TYPE (${role}):
${roleContext}

PRACTICE INFO:
- Specialties: ${specialties}
- Modalities: ${MKTG_CONFIG.modalities.join(', ')}
- Insurance: ${MKTG_CONFIG.insuranceAccepted}
- ${MKTG_CONFIG.acceptingClients ? 'Currently accepting new referrals' : 'Currently at capacity — accepting waitlist'}

EMAIL RULES:
- Subject line: brief, not salesy, feels like a peer colleague
- Body: 3–5 short paragraphs maximum
- Warm and collegial — peer to peer, not vendor to customer
- Mention 1–2 specific things relevant to their role
- Soft close — no hard ask, just keeping the relationship warm
- Sign off as: ${MKTG_CONFIG.practiceName} team

Respond with valid JSON only. No preamble or markdown backticks:
{"subject": "subject line here", "body": "email body here with \\n for line breaks"}`;

  const url = 'https://api.anthropic.com/v1/messages';

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    if (data.error) { Logger.log('Claude error: ' + JSON.stringify(data.error)); return null; }
    const raw = data.content[0].text.trim().replace(/```json|```/g, '').trim();
    return JSON.parse(raw);
  } catch(err) {
    Logger.log('generateReferralEmail error: ' + err.message);
    return buildDefaultReferralEmail(partnerName, role, organization);
  }
}

function buildDefaultReferralEmail(name, role, organization) {
  const firstName = name.split(' ')[0] || name;
  return {
    subject: 'Checking in — ' + MKTG_CONFIG.practiceName,
    body: `Hi ${firstName},\n\nJust reaching out to stay connected and let you know we're here for your clients who might benefit from therapy support.\n\nWe're currently ${MKTG_CONFIG.acceptingClients ? 'accepting new clients' : 'taking waitlist inquiries'} and specialize in ${MKTG_CONFIG.specialties.slice(0, 2).join(' and ')}. We work with ${MKTG_CONFIG.clientTypes.join(', ')} and accept ${MKTG_CONFIG.insuranceAccepted}.\n\nIf you ever have a client you think might be a good fit, feel free to send them our way or reach us at ${MKTG_CONFIG.practiceEmail}.\n\nHope things are going well.\n\n${MKTG_CONFIG.practiceName}`
  };
}

function getRoleContext(role) {
  const roleStr = (role || '').toLowerCase();

  if (roleStr.includes('pcp') || roleStr.includes('primary care') || roleStr.includes('physician')) {
    return 'PCPs often see patients with mental health needs that present as somatic symptoms. Mention availability for medical-adjacent presentations and your ability to coordinate care. Mention insurance accepted.';
  }
  if (roleStr.includes('psychiatr')) {
    return 'Psychiatrists value collaborative care. Mention your approach to therapy as complementary to medication management. Mention you welcome shared clients and can coordinate on treatment approaches.';
  }
  if (roleStr.includes('school') || roleStr.includes('counselor')) {
    return 'School counselors need therapy resources for students and families. Mention adolescent availability, family therapy if offered, and any after-school or evening openings.';
  }
  if (roleStr.includes('ob') || roleStr.includes('obgyn') || roleStr.includes('gynecolog')) {
    return 'OB/GYN providers often encounter perinatal mood and anxiety disorders. Mention any perinatal mental health expertise and your comfort with reproductive mental health topics.';
  }
  if (roleStr.includes('pediat')) {
    return 'Pediatricians need child and adolescent therapy resources. Mention age ranges you serve, parent involvement in therapy, and insurance accepted.';
  }
  return 'Keep the tone collegial. Mention specialties, insurance, and current availability briefly.';
}

function sendReferralWelcome(data) {
  const { name, email, role, organization, row } = data;
  const firstName = name.split(' ')[0] || name;

  const apiKey = PropertiesService.getScriptProperties()
    .getProperty('ANTHROPIC_API_KEY');

  const subject = 'Connecting from ' + MKTG_CONFIG.practiceName;

  const defaultBody = `Hi ${firstName},\n\nGreat connecting with you. I wanted to reach out from ${MKTG_CONFIG.practiceName} and share a bit about who we are and who we work with.\n\nWe're a ${MKTG_CONFIG.practiceType} in ${MKTG_CONFIG.practiceCity} specializing in ${MKTG_CONFIG.specialties.slice(0, 2).join(' and ')}. We work with ${MKTG_CONFIG.clientTypes.join(', ')} and accept ${MKTG_CONFIG.insuranceAccepted}.\n\n${MKTG_CONFIG.acceptingClients ? "We're currently accepting new referrals and would love to be a resource for your clients." : "We're currently on a waitlist but happy to be a resource for future referrals."}\n\nFeel free to reach out any time at ${MKTG_CONFIG.practiceEmail} or ${MKTG_CONFIG.practicePhone}.\n\n${MKTG_CONFIG.practiceName}`;

  GmailApp.sendEmail(
    email,
    subject,
    '',
    {
      from: MKTG_CONFIG.practiceEmail,
      bcc: MKTG_CONFIG.notifyEmail,
      htmlBody: buildReferralOutreachEmail(defaultBody, name)
    }
  );

  // Mark welcome sent in sheet
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(MKTG_CONFIG.sheets.referralList);
  if (sheet && row) {
    sheet.getRange(row, REF_COLS.welcomeSent + 1).setValue('Sent');
    sheet.getRange(row, REF_COLS.lastContact + 1)
      .setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'));
    sheet.getRange(row, REF_COLS.status + 1).setValue('Active');
  }

  Logger.log('Referral welcome sent to: ' + name);
}

function sendReferralOutreachSummary(sentCount, skippedCount) {
  GmailApp.sendEmail(
    MKTG_CONFIG.notifyEmail,
    '✈ Referral outreach complete — ' + sentCount + ' emails sent',
    '',
    {
      htmlBody: buildMarketingEmail(
        'Quarterly referral outreach complete.',
        `<p>Your quarterly referral partner touchpoints just went out.</p>
        <p><strong>${sentCount} emails sent.</strong> ${skippedCount} partners skipped (either inactive or contacted within the last ${MKTG_CONFIG.referralCadenceDays} days).</p>
        <p>View the full outreach log in your Practice Pilot spreadsheet under the "Outreach Log" tab.</p>
        <p style="color:#888;font-size:12px;">The next quarterly outreach will run in approximately ${MKTG_CONFIG.referralCadenceDays} days. To add new referral partners, add a row to the Referral Partners sheet — a welcome email will fire automatically.</p>`
      )
    }
  );
}

// ============================================================
// DELAYED MARKETING SENDS
// ============================================================

function scheduleMarketingDelayed(type, data, delayMinutes) {
  const key = 'mktg_delayed_' + type + '_' + new Date().getTime();
  PropertiesService.getScriptProperties().setProperty(
    key,
    JSON.stringify({ type, data, fireAt: new Date().getTime() + (delayMinutes * 60000) })
  );
}

function processMarketingDelayed() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const now = new Date().getTime();

  Object.entries(props).forEach(([key, value]) => {
    if (!key.startsWith('mktg_delayed_')) return;

    try {
      const job = JSON.parse(value);
      if (now < job.fireAt) return;

      switch(job.type) {
        case 'referralWelcome': sendReferralWelcome(job.data); break;
        default: Logger.log('Unknown marketing delayed type: ' + job.type);
      }

      PropertiesService.getScriptProperties().deleteProperty(key);
      Logger.log('Fired marketing delayed: ' + job.type);

    } catch(err) {
      Logger.log('processMarketingDelayed error for ' + key + ': ' + err.message);
    }
  });
}

// ============================================================
// EMAIL TEMPLATE BUILDERS
// ============================================================

function buildMarketingEmail(headline, bodyHtml) {
  return `
  <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111111;border:1px solid #222222;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #222;">
              <span style="font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f97316;">
                ✈ Practice Pilot · Marketing
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h2 style="font-size:20px;font-weight:700;color:#f0f0f0;margin:0 0 16px;letter-spacing:-0.01em;">${headline}</h2>
              <div style="font-size:14px;color:#888888;line-height:1.7;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;border-top:1px solid #222;">
              <p style="font-size:11px;color:#444;margin:0;letter-spacing:0.04em;">
                Practice Pilot · ${MKTG_CONFIG.practiceName} · <a href="mailto:${MKTG_CONFIG.practiceEmail}" style="color:#f97316;text-decoration:none;">${MKTG_CONFIG.practiceEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function buildReferralOutreachEmail(bodyText, recipientName) {
  const formattedBody = bodyText.replace(/\n/g, '<br>');
  return `
  <!DOCTYPE html><html><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:40px 20px;">
      <tr><td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:2px solid #f97316;">
              <span style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#111111;">
                ${MKTG_CONFIG.practiceName}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0;">
              <div style="font-size:14px;color:#333333;line-height:1.8;">${formattedBody}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-top:20px;border-top:1px solid #eeeeee;">
              <p style="font-size:12px;color:#999999;margin:0;">
                ${MKTG_CONFIG.practiceName} · ${MKTG_CONFIG.practiceCity} · ${MKTG_CONFIG.practicePhone} · 
                <a href="mailto:${MKTG_CONFIG.practiceEmail}" style="color:#f97316;text-decoration:none;">${MKTG_CONFIG.practiceEmail}</a>
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function sendMarketingAlert(headline, body, btnLabel, btnUrl) {
  GmailApp.sendEmail(
    MKTG_CONFIG.notifyEmail,
    '⚠ Practice Pilot Marketing — ' + headline,
    '',
    { htmlBody: buildMarketingEmail(headline, '<p>' + body + '</p>') }
  );
}

// ============================================================
// UTILITY
// ============================================================

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7;
  const monday = new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
  monday.setHours(9, 0, 0, 0);
  return monday;
}

/**
 * Test functions — run from Apps Script editor to verify setup
 */
function testSocialEngine() {
  Logger.log('Testing Social Content Engine...');
  runSocialContentEngine();
}

function testGBPPost() {
  Logger.log('Testing GBP Keeper...');
  runGBPKeeper();
}

function testReferralOutreach() {
  Logger.log('Testing Referral Outreach...');
  runReferralOutreach();
}

function testProfileAudit() {
  Logger.log('Testing Profile Audit Reminder...');
  runProfileAuditReminder();
}

function viewPendingMarketingJobs() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const jobs = Object.entries(props).filter(([k]) => k.startsWith('mktg_delayed_'));
  Logger.log('Pending marketing jobs: ' + jobs.length);
  jobs.forEach(([k, v]) => {
    const job = JSON.parse(v);
    Logger.log(k + ' → ' + job.type + ' fires at ' + new Date(job.fireAt));
  });
}

/**
 * One-time setup: create sheet structure
 */
function setupMarketingSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Content Log
  let sheet = ss.getSheetByName('Content Log');
  if (!sheet) {
    sheet = ss.insertSheet('Content Log');
    sheet.getRange(1, 1, 1, 5).setValues([['Date', 'Month', 'Post Type', 'Post Text', 'Status']]);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold');
  }

  // GBP Log
  sheet = ss.getSheetByName('GBP Log');
  if (!sheet) {
    sheet = ss.insertSheet('GBP Log');
    sheet.getRange(1, 1, 1, 4).setValues([['Date', 'Post Text', 'Status', 'Expiry Note']]);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold');
  }

  // Referral Partners
  sheet = ss.getSheetByName('Referral Partners');
  if (!sheet) {
    sheet = ss.insertSheet('Referral Partners');
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Name', 'Role', 'Organization', 'Email', 'Phone',
      'Specialty Match', 'Notes', 'Date Added', 'Last Contact',
      'Status', 'Welcome Sent'
    ]]);
    sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
  }

  // Outreach Log
  sheet = ss.getSheetByName('Outreach Log');
  if (!sheet) {
    sheet = ss.insertSheet('Outreach Log');
    sheet.getRange(1, 1, 1, 7).setValues([['Date', 'Name', 'Role', 'Organization', 'Email', 'Type', 'Status']]);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }

  Logger.log('Marketing sheets created successfully.');
}
