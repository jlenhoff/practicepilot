/**
 * ============================================================
 * PRACTICE PILOT — GOOGLE APPS SCRIPT
 * Complete Automation System v1.0
 * ============================================================
 * Houston Heights Consulting LLC · Practice Pilot
 * joe@privatepraxis.co · practicepilot.app
 *
 * SETUP INSTRUCTIONS:
 * 1. Paste this script into Google Apps Script attached to your
 *    Practice Pilot Master Sheet
 * 2. Update all values in the CONFIG block below
 * 3. Run deleteTriggers() to clear any existing triggers
 * 4. Run createTriggers() to set up all automation triggers
 * 5. Test each form with a dummy submission
 * 6. Delete test rows before going live
 *
 * WHAT THIS SCRIPT DOES:
 * - Intake Flow: fires on Intake Form submission
 * - No-Show Follow-Up: fires on Trigger Form submission
 * - New Client Onboarding: fires on Trigger Form submission
 * - Cancellation Sequence: fires on Trigger Form submission
 * - Discharge Sequence: fires on Trigger Form submission
 * - Waitlist: fires on Trigger Form + Waitlist Form submissions
 * ============================================================
 */

// ============================================================
// CONFIG — EDIT THESE VALUES ONLY
// Never hardcode values inside logic functions
// ============================================================

const CONFIG = {

  // Practice identity
  practiceName: "Houston Heights Therapy",
  practiceEmail: "admin@houstonheightstherapy.com",
  ownerEmail: "joe@houstonheightstherapy.com",
  practicePhone: "(713) 000-0000",
  practiceAddress: "123 Main Street, Suite 100, Houston TX 77007",
  practiceWebsite: "https://houstonheightstherapy.com",

  // Notification recipients
  adminEmail: "admin@houstonheightstherapy.com",
  notifyEmail: "joe@houstonheightstherapy.com",

  // Clinicians — add or remove as needed
  // Key = first name as typed in form, value = full name + email
  clinicians: {
    "Hannah": { fullName: "Hannah Drury", email: "hannah@houstonheightstherapy.com" },
    "Ron":    { fullName: "Ron Youngblut", email: "ron@houstonheightstherapy.com" }
  },

  // Form URLs — paste RESPONDER links (not edit links)
  intakeFormUrl:   "https://forms.gle/REPLACE_WITH_INTAKE_FORM_URL",
  triggerFormUrl:  "https://forms.gle/REPLACE_WITH_TRIGGER_FORM_URL",
  waitlistFormUrl: "https://forms.gle/REPLACE_WITH_WAITLIST_FORM_URL",

  // Google Drive — root folder for client folders
  clientFolderRootId: "REPLACE_WITH_GOOGLE_DRIVE_FOLDER_ID",

  // Google Sheets — sheet names inside the master spreadsheet
  sheets: {
    intakeLog:    "Intake Log",
    noShowLog:    "No-Show Log",
    cancelLog:    "Cancellation Log",
    dischargeLog: "Discharge Log",
    waitlistLog:  "Waitlist",
    retentionLog: "Record Retention"
  },

  // Timing (in minutes) for delayed emails
  // Google Apps Script time triggers are set in minutes
  noShow: {
    email2DelayMinutes:   2880,  // 48 hours
    alertDelayMinutes:    5760,  // 96 hours
  },
  onboarding: {
    email2DelayMinutes:   2880,  // 48 hours (what to expect)
    // email3 fires based on appointment date — 72hrs before
  },
  cancellation: {
    email2DelayMinutes:   2880,  // 48 hours (fee reminder)
  },
  discharge: {
    trackD_email1DelayMinutes: 7200,   // 5 days (went silent)
    trackD_email2DelayMinutes: 20160,  // 14 days
  },

  // Crisis resources — included in sensitive outreach
  crisisLine: "If you are in crisis, please call or text 988 (Suicide and Crisis Lifeline) or go to your nearest emergency room.",

  // Record retention
  retentionYears: 7,
  minorRetentionAge: 23,

};

// ============================================================
// COLUMN MAPS
// Update these if you change column order in any sheet
// ============================================================

const INTAKE_COLS = {
  timestamp:      0,
  email:          1,   // auto-collected by Google
  name:           2,
  clientEmail:    3,
  therapyType:    4,
  paymentMethod:  5,
  insurance:      6,
  reason:         7,
  referralSource: 8,
  // Script-filled columns
  alertSent:      9,
  welcomeSent:    10,
  folderCreated:  11,
  referralLogged: 12,
  status:         13
};

const NOSHOW_COLS = {
  clientName:    0,
  clientEmail:   1,
  clinician:     2,
  apptDate:      3,
  isFirstAppt:   4,
  email1Sent:    5,
  email2Sent:    6,
  alertSent:     7,
  notes:         8,
  dateLogged:    9
};

const DISCHARGE_COLS = {
  clientName:    0,
  clientEmail:   1,
  clinician:     2,
  dischargeType: 3,
  isMinor:       4,
  email1Sent:    5,
  retentionDate: 6,
  notes:         7,
  dateLogged:    8
};

const WAITLIST_COLS = {
  name:          0,
  email:         1,
  phone:         2,
  dateAdded:     3,
  clinicianPref: 4,
  daysPref:      5,
  paymentMethod: 6,
  insurance:     7,
  therapyType:   8,
  reason:        9,
  referral:      10,
  confirmSent:   11,
  status:        12  // Waiting / Offered / Confirmed / Declined
};

// ============================================================
// TRIGGER MANAGEMENT
// ============================================================

/**
 * Run this first to clear all existing triggers
 */
function deleteTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log('All triggers deleted.');
}

/**
 * Run this after deleteTriggers to set up all triggers
 */
function createTriggers() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // onFormSubmit triggers for each form
  // Note: You must link each form to the spreadsheet first
  // Form → Responses → Link to Spreadsheet → select this sheet

  ScriptApp.newTrigger('onIntakeFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('onTriggerFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  ScriptApp.newTrigger('onWaitlistFormSubmit')
    .forSpreadsheet(ss)
    .onFormSubmit()
    .create();

  Logger.log('Triggers created. Verify in Extensions > Apps Script > Triggers.');
}

// ============================================================
// INTAKE FLOW — AUTOMATION 01
// Fires when client submits intake/contact form
// ============================================================

function onIntakeFormSubmit(e) {
  try {
    const response = e.values;
    const sheet = SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(CONFIG.sheets.intakeLog);

    const clientName  = response[INTAKE_COLS.name]        || '';
    const clientEmail = response[INTAKE_COLS.clientEmail]  || '';
    const referral    = response[INTAKE_COLS.referralSource] || '';
    const reason      = response[INTAKE_COLS.reason]       || '';
    const firstName   = clientName.split(' ')[0] || clientName;

    if (!clientName || !clientEmail) {
      Logger.log('Intake: missing name or email — skipping.');
      return;
    }

    // 1. Fire internal alert (no PHI)
    sendInternalAlert_Intake(clientName);

    // 2. Send welcome email to client
    sendWelcomeEmail(clientName, firstName, clientEmail);

    // 3. Create client folder in Drive
    const folderUrl = createClientFolder(clientName);

    // 4. Log referral source to sheet
    logIntake(sheet, clientName, clientEmail, referral, reason, folderUrl);

    Logger.log('Intake flow complete for: ' + clientName);

  } catch(err) {
    Logger.log('onIntakeFormSubmit error: ' + err.message);
  }
}

function sendInternalAlert_Intake(clientName) {
  // No PHI in alert — just a ping
  GmailApp.sendEmail(
    CONFIG.adminEmail,
    '✈ New Intake Submitted — Practice Pilot',
    '',
    {
      bcc: CONFIG.notifyEmail,
      htmlBody: buildAlertEmail(
        'New Intake Submitted',
        'A new client has submitted your intake form. Log into your form responses to review details.',
        'Review Intake Form',
        CONFIG.intakeFormUrl
      )
    }
  );
}

function sendWelcomeEmail(clientName, firstName, clientEmail) {
  GmailApp.sendEmail(
    clientEmail,
    'Welcome to ' + CONFIG.practiceName,
    '',
    {
      from: CONFIG.practiceEmail,
      bcc: CONFIG.notifyEmail,
      htmlBody: buildClientEmail(
        'Welcome, ' + firstName + '.',
        `<p>Thank you for reaching out to <strong>${CONFIG.practiceName}</strong>. We're glad you're here.</p>
        <p>We've received your information and someone from our team will be in touch shortly to discuss next steps and scheduling.</p>
        <p>In the meantime, if you have any questions you can reach us at <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;">${CONFIG.practiceEmail}</a> or ${CONFIG.practicePhone}.</p>
        <p style="color:#888;font-size:13px;">Please note: This email does not confirm an appointment. Scheduling is confirmed separately after we've had a chance to review your information and confirm clinical fit.</p>`
      )
    }
  );
}

function createClientFolder(clientName) {
  try {
    const root = DriveApp.getFolderById(CONFIG.clientFolderRootId);
    const now = new Date();
    const monthYear = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MMMM yyyy');

    // Get or create month subfolder
    let monthFolder;
    const monthFolders = root.getFoldersByName(monthYear);
    if (monthFolders.hasNext()) {
      monthFolder = monthFolders.next();
    } else {
      monthFolder = root.createFolder(monthYear);
    }

    // Create client folder
    const lastName = clientName.split(' ').slice(-1)[0] || clientName;
    const folderName = lastName + ' — ' + monthYear;
    const clientFolder = monthFolder.createFolder(folderName);

    return clientFolder.getUrl();
  } catch(err) {
    Logger.log('createClientFolder error: ' + err.message);
    return 'Error creating folder';
  }
}

function logIntake(sheet, name, email, referral, reason, folderUrl) {
  if (!sheet) return;
  const now = new Date();
  sheet.appendRow([
    name,
    email,
    referral,
    reason,
    folderUrl,
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy'),
    'New'
  ]);
}

// ============================================================
// TRIGGER FORM ROUTER — AUTOMATIONS 02-08
// Routes to correct automation based on trigger type
// ============================================================

function onTriggerFormSubmit(e) {
  try {
    const response = e.values;

    // Column 0 = timestamp, column 1 = email, column 2 = trigger type
    // Adjust indices based on your actual Trigger Form column order
    const triggerType = response[2] || '';
    const clientName  = response[3] || '';
    const clientEmail = response[4] || '';
    const clinician   = response[5] || '';
    const apptDate    = response[6] || '';

    Logger.log('Trigger received: ' + triggerType + ' for ' + clientName);

    switch(triggerType.toLowerCase().trim()) {
      case 'no-show':
        handleNoShow(response, clientName, clientEmail, clinician, apptDate);
        break;
      case 'cancellation':
        handleCancellation(response, clientName, clientEmail, clinician, apptDate);
        break;
      case 'new client confirmed':
        handleOnboarding(response, clientName, clientEmail, clinician, apptDate);
        break;
      case 'client discharge':
        handleDischarge(response, clientName, clientEmail, clinician);
        break;
      case 'slot available — waitlist':
        handleSlotOpen(response, clinician);
        break;
      default:
        Logger.log('Unknown trigger type: ' + triggerType);
    }

  } catch(err) {
    Logger.log('onTriggerFormSubmit error: ' + err.message);
  }
}

// ============================================================
// NO-SHOW FOLLOW-UP — AUTOMATION 02
// ============================================================

function handleNoShow(response, clientName, clientEmail, clinician, apptDate) {
  // Column 7 = isFirstAppt (Yes / No)
  const isFirstAppt = (response[7] || '').toLowerCase().includes('yes');
  const firstName = clientName.split(' ')[0] || clientName;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.sheets.noShowLog);

  // Email 1 — same day
  sendNoShowEmail1(clientName, firstName, clientEmail, isFirstAppt);

  // Schedule Email 2 — 48hrs via time trigger
  scheduleDelayedEmail('noShowEmail2', {
    clientName, firstName, clientEmail, isFirstAppt
  }, CONFIG.noShow.email2DelayMinutes);

  // Schedule internal alert — 96hrs
  scheduleDelayedEmail('noShowAlert', {
    clientName, clientEmail, clinician, isFirstAppt
  }, CONFIG.noShow.alertDelayMinutes);

  // Log to sheet
  if (sheet) {
    sheet.appendRow([
      clientName,
      clientEmail,
      clinician,
      apptDate,
      isFirstAppt ? 'Yes' : 'No',
      'Sent',
      'Pending',
      'Pending',
      response[8] || '',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy')
    ]);
  }
}

function sendNoShowEmail1(clientName, firstName, clientEmail, isFirstAppt) {
  const subject = isFirstAppt
    ? 'We missed you today — ' + CONFIG.practiceName
    : 'We missed you today, ' + firstName;

  const body = isFirstAppt
    ? `<p>Hi ${firstName},</p>
       <p>We had you scheduled for an appointment today and wanted to check in. We understand that things come up, and we'd still love the opportunity to connect with you.</p>
       <p>If you'd like to reschedule, please reply to this email or reach us at ${CONFIG.practicePhone}. We're happy to find a time that works for you.</p>
       <p>${CONFIG.crisisLine}</p>`
    : `<p>Hi ${firstName},</p>
       <p>We missed you at today's appointment and wanted to check in to make sure you're okay.</p>
       <p>If you'd like to reschedule or have any questions, just reply to this email or call us at ${CONFIG.practicePhone}.</p>
       <p>We're here when you're ready.</p>`;

  GmailApp.sendEmail(clientEmail, subject, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail(isFirstAppt ? 'We missed you.' : 'Checking in, ' + firstName + '.', body)
  });
}

function sendNoShowEmail2(data) {
  const { firstName, clientEmail, isFirstAppt } = data;
  const subject = 'Following up — ' + CONFIG.practiceName;

  const body = isFirstAppt
    ? `<p>Hi ${firstName},</p>
       <p>We wanted to follow up one more time. We'd still love to connect and find a time that works for you.</p>
       <p>Reply to this email or call ${CONFIG.practicePhone} whenever you're ready. No pressure at all.</p>
       <p>${CONFIG.crisisLine}</p>`
    : `<p>Hi ${firstName},</p>
       <p>Just a gentle follow-up — your spot is still available if you'd like to reschedule.</p>
       <p>Reply here or call ${CONFIG.practicePhone} and we'll get something on the calendar.</p>`;

  GmailApp.sendEmail(clientEmail, subject, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('Still here for you.', body)
  });
}

function sendNoShowAlert(data) {
  const { clientName, clinician, isFirstAppt } = data;
  const label = isFirstAppt ? 'INTAKE NO-SHOW — No Response' : 'NO-SHOW — No Response';
  GmailApp.sendEmail(
    CONFIG.adminEmail,
    '⚠ ' + label + ' — ' + clientName,
    '',
    {
      bcc: CONFIG.notifyEmail,
      htmlBody: buildAlertEmail(
        label,
        `<strong>${clientName}</strong> (Clinician: ${clinician || 'unknown'}) has not responded after two follow-up attempts. This client has been logged to your no-show tracking sheet. Manual follow-up may be appropriate.`,
        'View No-Show Log',
        'https://docs.google.com/spreadsheets'
      )
    }
  );
}

// ============================================================
// NEW CLIENT ONBOARDING — AUTOMATION 03
// ============================================================

function handleOnboarding(response, clientName, clientEmail, clinician, apptDate) {
  const firstName = clientName.split(' ')[0] || clientName;
  const apptTime  = response[9]  || '';
  const location  = response[10] || CONFIG.practiceAddress;
  const notes     = response[11] || '';
  const clinicianData = CONFIG.clinicians[clinician] || { fullName: clinician, email: '' };

  // Email 1 — Confirmation + logistics — send immediately
  sendOnboardingEmail1(firstName, clientEmail, clinicianData.fullName, apptDate, apptTime, location);

  // Email 2 — What to expect — 48hrs later
  scheduleDelayedEmail('onboardingEmail2', {
    firstName, clientEmail, clinicianData, apptDate, apptTime
  }, CONFIG.onboarding.email2DelayMinutes);

  // Email 3 — Cancellation policy — fires based on appt date
  // Calculate minutes until 72hrs before appointment
  if (apptDate) {
    try {
      const apptDateObj = new Date(apptDate);
      const reminderTime = new Date(apptDateObj.getTime() - (72 * 60 * 60 * 1000));
      const now = new Date();
      const minutesUntilReminder = Math.floor((reminderTime - now) / 60000);

      if (minutesUntilReminder > 60) {
        scheduleDelayedEmail('onboardingEmail3', {
          firstName, clientEmail, apptDate, apptTime
        }, minutesUntilReminder);
      }
    } catch(err) {
      Logger.log('Could not schedule onboarding email 3: ' + err.message);
    }
  }
}

function sendOnboardingEmail1(firstName, clientEmail, clinicianName, apptDate, apptTime, location) {
  GmailApp.sendEmail(
    clientEmail,
    'Your appointment is confirmed — ' + CONFIG.practiceName,
    '',
    {
      from: CONFIG.practiceEmail,
      bcc: CONFIG.notifyEmail,
      htmlBody: buildClientEmail(
        "You're confirmed, " + firstName + ".",
        `<p>Hi ${firstName},</p>
        <p>Your appointment has been confirmed. Here are your details:</p>
        <table style="border-collapse:collapse;margin:16px 0;width:100%;">
          <tr><td style="padding:8px 0;color:#888;font-size:13px;width:120px;">Clinician</td><td style="padding:8px 0;font-size:14px;color:#f0f0f0;">${clinicianName}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Date</td><td style="padding:8px 0;font-size:14px;color:#f0f0f0;">${apptDate}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Time</td><td style="padding:8px 0;font-size:14px;color:#f0f0f0;">${apptTime}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Location</td><td style="padding:8px 0;font-size:14px;color:#f0f0f0;">${location}</td></tr>
        </table>
        <p>If you need to reach us before your appointment, email us at <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;">${CONFIG.practiceEmail}</a> or call ${CONFIG.practicePhone}.</p>
        <p>We'll send you a quick note in a day or two with what to expect from your first session.</p>`
      )
    }
  );
}

function sendOnboardingEmail2(data) {
  const { firstName, clientEmail, clinicianData, apptDate, apptTime } = data;
  GmailApp.sendEmail(
    clientEmail,
    'What to expect at your first session',
    '',
    {
      from: CONFIG.practiceEmail,
      bcc: CONFIG.notifyEmail,
      htmlBody: buildClientEmail(
        'What your first session looks like.',
        `<p>Hi ${firstName},</p>
        <p>Your appointment is coming up and we wanted to give you a quick overview of what to expect.</p>
        <p><strong>Your first session</strong> is a chance for you and your clinician to get to know each other. You'll talk about what brings you to therapy, what you're hoping to get out of it, and whether it feels like a good fit. There's no pressure to share anything you're not ready to share.</p>
        <p><strong>What to bring:</strong> Just yourself. If you have insurance information you haven't already shared, bring that too.</p>
        <p><strong>How long:</strong> Your first session is typically 55 minutes.</p>
        <p>It's completely normal to feel nervous before a first session. That feeling usually fades within the first few minutes. We're glad you're here.</p>
        <p>See you soon,<br>${CONFIG.practiceName}</p>`
      )
    }
  );
}

function sendOnboardingEmail3(data) {
  const { firstName, clientEmail, apptDate, apptTime } = data;
  GmailApp.sendEmail(
    clientEmail,
    'Reminder: your appointment + cancellation policy',
    '',
    {
      from: CONFIG.practiceEmail,
      bcc: CONFIG.notifyEmail,
      htmlBody: buildClientEmail(
        'See you soon, ' + firstName + '.',
        `<p>Hi ${firstName},</p>
        <p>Just a reminder that your appointment is coming up on <strong>${apptDate} at ${apptTime}</strong>.</p>
        <p><strong>Cancellation policy:</strong> If you need to cancel or reschedule, please let us know at least 24 hours in advance. Late cancellations may be subject to a fee.</p>
        <p>To cancel or reschedule, reply to this email or call ${CONFIG.practicePhone}.</p>
        <p>We're looking forward to seeing you.</p>`
      )
    }
  );
}

// ============================================================
// CANCELLATION SEQUENCE — AUTOMATION 04
// ============================================================

function handleCancellation(response, clientName, clientEmail, clinician, apptDate) {
  // Column 8 = cancel type, column 9 = isFirstAppt
  const cancelType  = response[8] || '';
  const isFirstAppt = (response[9] || '').toLowerCase().includes('yes');
  const isPractice  = cancelType.toLowerCase().includes('practice');
  const isLate      = cancelType.toLowerCase().includes('late');
  const firstName   = clientName.split(' ')[0] || clientName;
  const ss          = SpreadsheetApp.getActiveSpreadsheet();
  const sheet       = ss.getSheetByName(CONFIG.sheets.cancelLog);

  if (isPractice) {
    // Track D — Practice cancelled
    sendCancellationEmail_Practice(firstName, clientEmail, apptDate);
  } else if (isFirstAppt) {
    // Track C — New client cancelled
    sendCancellationEmail_NewClient(firstName, clientEmail);
    scheduleDelayedEmail('cancelNewClientEmail2', {
      firstName, clientEmail
    }, 72 * 60); // 72 hours
  } else if (isLate) {
    // Track B — Late cancel existing client
    sendCancellationEmail_Late(firstName, clientEmail);
    scheduleDelayedEmail('cancelLateFeeEmail', {
      firstName, clientEmail
    }, CONFIG.cancellation.email2DelayMinutes);
  } else {
    // Track A — Standard cancel existing client
    sendCancellationEmail_Standard(firstName, clientEmail);
  }

  // Internal alert
  sendInternalAlert_Cancel(clientName, clinician, cancelType, isFirstAppt);

  // Log
  if (sheet) {
    sheet.appendRow([
      clientName, clientEmail, clinician, apptDate,
      cancelType, isFirstAppt ? 'Yes' : 'No',
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy')
    ]);
  }
}

function sendCancellationEmail_Standard(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, 'About your cancelled appointment', '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('See you next time, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>We received your cancellation. Whenever you're ready to reschedule, just reply to this email or call ${CONFIG.practicePhone} and we'll find a time that works.</p>`)
  });
}

function sendCancellationEmail_Late(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, 'About your cancelled appointment', '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('We received your cancellation.',
      `<p>Hi ${firstName},</p>
      <p>We received your cancellation. Please note that this cancellation falls within our 24-hour cancellation window, which may result in a late cancellation fee per our policy.</p>
      <p>To reschedule or if you have questions about our policy, please reply to this email or call ${CONFIG.practicePhone}.</p>`)
  });
}

function sendCancellationEmail_NewClient(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, 'We understand — no worries', '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('We understand, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>We received your cancellation. We completely understand that timing doesn't always work out, and there's no pressure at all.</p>
      <p>If you'd like to reschedule when the time is right, we'd love to hear from you. Just reply to this email or call ${CONFIG.practicePhone}.</p>
      <p>${CONFIG.crisisLine}</p>`)
  });
}

function sendCancellationEmail_Practice(firstName, clientEmail, apptDate) {
  GmailApp.sendEmail(clientEmail, 'We need to reschedule your appointment', '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail("We're sorry, " + firstName + ".",
      `<p>Hi ${firstName},</p>
      <p>We're sorry for the inconvenience — we need to cancel your appointment scheduled for ${apptDate} due to an unexpected conflict on our end.</p>
      <p>We'd love to reschedule at your earliest convenience. Please reply to this email or call ${CONFIG.practicePhone} and we'll make it a priority to find you a new time.</p>
      <p>We apologize for any disruption to your schedule.</p>`)
  });
}

function sendInternalAlert_Cancel(clientName, clinician, cancelType, isFirstAppt) {
  const flag = isFirstAppt ? ' [NEW CLIENT]' : '';
  GmailApp.sendEmail(
    CONFIG.adminEmail,
    '✕ Cancellation' + flag + ' — ' + clientName,
    '',
    {
      bcc: CONFIG.notifyEmail,
      htmlBody: buildAlertEmail(
        'Cancellation Received' + flag,
        `<strong>${clientName}</strong> has cancelled.<br>Type: ${cancelType}<br>Clinician: ${clinician || 'unknown'}<br>Logged to your cancellation tracking sheet.`,
        null, null
      )
    }
  );
}

// ============================================================
// CLIENT DISCHARGE — AUTOMATION 05
// ============================================================

function handleDischarge(response, clientName, clientEmail, clinician) {
  // Column 8 = discharge type, column 9 = isMinor
  const dischargeType = response[8] || '';
  const isMinor       = (response[9] || '').toLowerCase().includes('yes');
  const firstName     = clientName.split(' ')[0] || clientName;
  const ss            = SpreadsheetApp.getActiveSpreadsheet();
  const sheet         = ss.getSheetByName(CONFIG.sheets.dischargeLog);
  const retentionSheet = ss.getSheetByName(CONFIG.sheets.retentionLog);
  const now           = new Date();

  const isPracticeInitiated = dischargeType.toLowerCase().includes('practice');
  const isUnresponsive      = dischargeType.toLowerCase().includes('unresponsive');
  const isPlanned           = dischargeType.toLowerCase().includes('planned');
  const isClientInitiated   = dischargeType.toLowerCase().includes('client');

  if (isPracticeInitiated) {
    // Track C — Hold for review, send internal alert only
    sendDischargeAlert_PracticeInitiated(clientName, clinician);
  } else if (isUnresponsive) {
    // Track D — Went silent — schedule two emails
    scheduleDelayedEmail('dischargeUnresponsiveEmail1', {
      firstName, clientEmail, clientName
    }, CONFIG.discharge.trackD_email1DelayMinutes);
    scheduleDelayedEmail('dischargeUnresponsiveEmail2', {
      firstName, clientEmail, clientName
    }, CONFIG.discharge.trackD_email2DelayMinutes);
  } else if (isPlanned) {
    // Track A — Planned mutual discharge
    sendDischargeEmail_Planned(firstName, clientEmail);
  } else if (isClientInitiated) {
    // Track B — Client initiated / ghosting
    sendDischargeEmail_ClientInitiated(firstName, clientEmail);
  }

  // Internal alert for all non-practice-initiated tracks
  if (!isPracticeInitiated) {
    sendInternalAlert_Discharge(clientName, clinician, dischargeType);
  }

  // Log to discharge sheet
  const retentionDate = isMinor
    ? 'Retain until age ' + CONFIG.minorRetentionAge
    : Utilities.formatDate(
        new Date(now.getTime() + (CONFIG.retentionYears * 365 * 24 * 60 * 60 * 1000)),
        Session.getScriptTimeZone(), 'MM/dd/yyyy'
      );

  if (sheet) {
    sheet.appendRow([
      clientName, clientEmail, clinician, dischargeType,
      isMinor ? 'Yes' : 'No', '', retentionDate,
      response[10] || '',
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy')
    ]);
  }

  // Log to retention sheet
  if (retentionSheet) {
    retentionSheet.appendRow([
      clientName, clinician,
      Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy'),
      retentionDate, isMinor ? 'Minor' : 'Adult'
    ]);
  }
}

function sendDischargeEmail_Planned(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, 'Thank you — from ' + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('Thank you, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>It has been a privilege working with you. We want to acknowledge the work you've done and wish you all the best as you move forward.</p>
      <p>If you ever find yourself wanting support again, please don't hesitate to reach out. Our door is always open.</p>
      <p>Take good care of yourself.</p>
      <p style="color:#888;font-size:13px;">${CONFIG.crisisLine}</p>`)
  });
}

function sendDischargeEmail_ClientInitiated(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, 'Wishing you well — ' + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('Wishing you well, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>We want you to know that it was a pleasure working with you, and we wish you all the best.</p>
      <p>If you ever decide you'd like to return, or if you need a referral to another provider, please reach out at any time — ${CONFIG.practicePhone} or <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;">${CONFIG.practiceEmail}</a>.</p>
      <p style="color:#888;font-size:13px;">${CONFIG.crisisLine}</p>`)
  });
}

function sendDischargeEmail_UnresponsiveEmail1(data) {
  const { firstName, clientEmail } = data;
  GmailApp.sendEmail(clientEmail, 'Checking in — ' + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('Checking in, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>We've noticed we haven't heard back from you recently and wanted to check in. We understand that life gets busy, and there's no pressure at all.</p>
      <p>If you'd like to continue with sessions or if there's anything we can help with, we're here. Just reply to this email or call ${CONFIG.practicePhone}.</p>
      <p style="color:#888;font-size:13px;">${CONFIG.crisisLine}</p>`)
  });
}

function sendDischargeEmail_UnresponsiveEmail2(data) {
  const { firstName, clientEmail } = data;
  GmailApp.sendEmail(clientEmail, 'A note from ' + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('A note for you, ' + firstName + '.',
      `<p>Hi ${firstName},</p>
      <p>We're reaching out one final time. Since we haven't heard back, we want you to know that this will formally close our scheduling conversation — though it doesn't mean you're unwelcome to return.</p>
      <p>If you ever want to reconnect, schedule, or need a referral to another provider, please don't hesitate to reach out at ${CONFIG.practicePhone} or <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;">${CONFIG.practiceEmail}</a>.</p>
      <p>We wish you well.</p>
      <p style="color:#888;font-size:13px;">${CONFIG.crisisLine}</p>`)
  });
}

function sendDischargeAlert_PracticeInitiated(clientName, clinician) {
  GmailApp.sendEmail(
    CONFIG.notifyEmail,
    '⚠ Practice-Initiated Discharge — Review Required — ' + clientName,
    '',
    {
      htmlBody: buildAlertEmail(
        'Practice-Initiated Discharge — Action Required',
        `A discharge has been triggered for <strong>${clientName}</strong> (Clinician: ${clinician || 'unknown'}).<br><br>
        <strong>This track requires your review before any email is sent to the client.</strong><br><br>
        Please review this case and consult your malpractice carrier if the situation is complex. When ready to proceed, send the client a formal discharge notice manually or reply to this alert to confirm the script should send the standard template.`,
        null, null
      )
    }
  );
}

function sendInternalAlert_Discharge(clientName, clinician, dischargeType) {
  GmailApp.sendEmail(
    CONFIG.adminEmail,
    '◉ Discharge — ' + clientName,
    '',
    {
      bcc: CONFIG.notifyEmail,
      htmlBody: buildAlertEmail(
        'Client Discharge Logged',
        `<strong>${clientName}</strong> has been discharged.<br>Type: ${dischargeType}<br>Clinician: ${clinician || 'unknown'}<br>Logged to discharge sheet. Record retention reminder added.`,
        null, null
      )
    }
  );
}

// ============================================================
// WAITLIST — AUTOMATION 06
// ============================================================

function onWaitlistFormSubmit(e) {
  try {
    const response = e.values;
    const clientName  = response[2] || '';
    const clientEmail = response[3] || '';
    const firstName   = clientName.split(' ')[0] || clientName;
    const ss          = SpreadsheetApp.getActiveSpreadsheet();
    const sheet       = ss.getSheetByName(CONFIG.sheets.waitlistLog);

    if (!clientName || !clientEmail) return;

    // Send confirmation to client
    sendWaitlistConfirmation(firstName, clientEmail);

    // Internal alert
    GmailApp.sendEmail(
      CONFIG.adminEmail,
      '◎ New Waitlist Request — ' + clientName,
      '',
      {
        bcc: CONFIG.notifyEmail,
        htmlBody: buildAlertEmail(
          'New Waitlist Request',
          `<strong>${clientName}</strong> has been added to the waitlist. Review their preferences in the Waitlist sheet and match when a slot opens.`,
          null, null
        )
      }
    );

    // Log to sheet
    if (sheet) {
      sheet.appendRow([
        clientName, clientEmail,
        response[4] || '',   // phone
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'MM/dd/yyyy'),
        response[5] || '',   // clinician pref
        response[6] || '',   // days pref
        response[7] || '',   // payment method
        response[8] || '',   // insurance
        response[9] || '',   // therapy type
        response[10] || '',  // reason
        response[11] || '',  // referral
        'Sent',
        'Waiting'
      ]);
    }

  } catch(err) {
    Logger.log('onWaitlistFormSubmit error: ' + err.message);
  }
}

function sendWaitlistConfirmation(firstName, clientEmail) {
  GmailApp.sendEmail(clientEmail, "You're on our waitlist — " + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail("You're on our waitlist, " + firstName + ".",
      `<p>Hi ${firstName},</p>
      <p>Thank you for your interest in ${CONFIG.practiceName}. We've added you to our waitlist and will reach out as soon as a matching opening becomes available.</p>
      <p>When we have a slot that fits your preferences, we'll contact you with details. Availability can vary, but we'll do our best to match you quickly.</p>
      <p>In the meantime, if anything changes or you have questions, please reach out at ${CONFIG.practicePhone} or <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;">${CONFIG.practiceEmail}</a>.</p>
      <p>Thank you for your patience.</p>`)
  });
}

function handleSlotOpen(response, clinician) {
  // Slot available trigger — find next matched waitlist candidate
  const availableDay       = response[9]  || '';
  const availableInsurance = response[10] || '';
  const ss                 = SpreadsheetApp.getActiveSpreadsheet();
  const sheet              = ss.getSheetByName(CONFIG.sheets.waitlistLog);

  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  let matchRow = null;
  let matchRowIndex = -1;

  // Find first waiting client that matches clinician and insurance
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status       = row[WAITLIST_COLS.status]        || '';
    const clinicianPref = row[WAITLIST_COLS.clinicianPref] || '';
    const insurance    = row[WAITLIST_COLS.insurance]      || '';

    if (status.toLowerCase() !== 'waiting') continue;

    const clinicianMatch = clinicianPref.toLowerCase().includes('no preference') ||
                           clinicianPref.toLowerCase() === clinician.toLowerCase();
    const insuranceMatch = !availableInsurance ||
                           insurance.toLowerCase().includes(availableInsurance.toLowerCase()) ||
                           availableInsurance.toLowerCase().includes('self-pay');

    if (clinicianMatch && insuranceMatch) {
      matchRow = row;
      matchRowIndex = i;
      break;
    }
  }

  if (!matchRow) {
    // No match found — alert admin
    GmailApp.sendEmail(CONFIG.adminEmail, 'Waitlist: No Match Found for Slot', '',
      { bcc: CONFIG.notifyEmail,
        htmlBody: buildAlertEmail('No Waitlist Match Found',
          `A slot was opened for clinician ${clinician} but no matching waitlist candidate was found. Review the waitlist sheet manually.`,
          null, null) });
    return;
  }

  const clientName  = matchRow[WAITLIST_COLS.name];
  const clientEmail = matchRow[WAITLIST_COLS.email];
  const firstName   = clientName.split(' ')[0] || clientName;

  // Send match summary to admin for approval before firing
  GmailApp.sendEmail(
    CONFIG.notifyEmail,
    '◎ Waitlist Match Found — ' + clientName + ' — Review Required',
    '',
    {
      bcc: CONFIG.adminEmail,
      htmlBody: buildAlertEmail(
        'Waitlist Match — Approve Before Sending',
        `<strong>Match found:</strong> ${clientName} (${clientEmail})<br>
        Clinician preference: ${matchRow[WAITLIST_COLS.clinicianPref]}<br>
        Available slot: ${clinician} — ${availableDay}<br><br>
        <strong>Action required:</strong> Reply to confirm you want to offer this slot, then manually update their status in the Waitlist sheet to "Offered" which will trigger the slot offer email.`,
        null, null
      )
    }
  );

  Logger.log('Waitlist match found: ' + clientName + ' — pending admin approval');
}

// ============================================================
// DELAYED EMAIL SCHEDULER
// Uses Properties Service to queue delayed sends
// ============================================================

function scheduleDelayedEmail(type, data, delayMinutes) {
  const key = 'delayed_' + type + '_' + new Date().getTime();
  PropertiesService.getScriptProperties().setProperty(
    key,
    JSON.stringify({ type, data, fireAt: new Date().getTime() + (delayMinutes * 60000) })
  );
}

/**
 * Run this function on a 30-minute time trigger to process scheduled emails
 * Add this trigger: ScriptApp.newTrigger('processDelayedEmails').timeBased().everyMinutes(30).create()
 */
function processDelayedEmails() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const now = new Date().getTime();

  Object.entries(props).forEach(([key, value]) => {
    if (!key.startsWith('delayed_')) return;

    try {
      const job = JSON.parse(value);
      if (now < job.fireAt) return; // Not time yet

      // Fire the correct email function
      switch(job.type) {
        case 'noShowEmail2':          sendNoShowEmail2(job.data); break;
        case 'noShowAlert':           sendNoShowAlert(job.data); break;
        case 'onboardingEmail2':      sendOnboardingEmail2(job.data); break;
        case 'onboardingEmail3':      sendOnboardingEmail3(job.data); break;
        case 'cancelNewClientEmail2': sendCancelNewClientEmail2(job.data); break;
        case 'cancelLateFeeEmail':    sendCancelLateFeeEmail(job.data); break;
        case 'dischargeUnresponsiveEmail1': sendDischargeEmail_UnresponsiveEmail1(job.data); break;
        case 'dischargeUnresponsiveEmail2': sendDischargeEmail_UnresponsiveEmail2(job.data); break;
        default: Logger.log('Unknown delayed email type: ' + job.type);
      }

      // Delete the job after firing
      PropertiesService.getScriptProperties().deleteProperty(key);
      Logger.log('Fired delayed email: ' + job.type);

    } catch(err) {
      Logger.log('processDelayedEmails error for key ' + key + ': ' + err.message);
    }
  });
}

function sendCancelNewClientEmail2(data) {
  const { firstName, clientEmail } = data;
  GmailApp.sendEmail(clientEmail, 'Still here when you\'re ready — ' + CONFIG.practiceName, '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('Still here for you.',
      `<p>Hi ${firstName},</p>
      <p>We wanted to reach out one more time. If the timing is ever right, we'd love to connect. Just reply to this email or call ${CONFIG.practicePhone}.</p>
      <p>No pressure at all — we wish you well.</p>
      <p style="color:#888;font-size:13px;">${CONFIG.crisisLine}</p>`)
  });
}

function sendCancelLateFeeEmail(data) {
  const { firstName, clientEmail } = data;
  GmailApp.sendEmail(clientEmail, 'Follow-up regarding your recent cancellation', '', {
    from: CONFIG.practiceEmail,
    bcc: CONFIG.notifyEmail,
    htmlBody: buildClientEmail('A follow-up note.',
      `<p>Hi ${firstName},</p>
      <p>We wanted to follow up on our cancellation policy. Your recent cancellation fell within our 24-hour window. If you have questions about this or your account balance, please reply to this email or call ${CONFIG.practicePhone}.</p>
      <p>We'd also love to get you rescheduled whenever you're ready.</p>`)
  });
}

// ============================================================
// EMAIL TEMPLATE BUILDERS
// Consistent branded HTML for all emails
// ============================================================

function buildClientEmail(headline, bodyHtml) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
      <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111111;border:1px solid #222222;border-radius:4px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;border-bottom:1px solid #222222;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#f0f0f0;">
                ✈ ${CONFIG.practiceName}
              </span>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;font-weight:700;color:#f0f0f0;margin:0 0 20px;letter-spacing:-0.01em;">${headline}</h1>
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#888888;line-height:1.7;">
                ${bodyHtml}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #222222;">
              <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#444444;margin:0;letter-spacing:0.04em;">
                ${CONFIG.practiceName} · ${CONFIG.practicePhone} · <a href="mailto:${CONFIG.practiceEmail}" style="color:#f97316;text-decoration:none;">${CONFIG.practiceEmail}</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

function buildAlertEmail(headline, bodyHtml, buttonLabel, buttonUrl) {
  const buttonHtml = buttonLabel && buttonUrl
    ? `<a href="${buttonUrl}" style="display:inline-block;background:#f97316;color:#000000;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:16px;">${buttonLabel} →</a>`
    : '';

  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 20px;">
      <tr><td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111111;border:1px solid #333333;border-left:3px solid #f97316;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;border-bottom:1px solid #222222;">
              <span style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f97316;">
                ✈ Practice Pilot · Internal Alert
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <h2 style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;font-weight:700;color:#f0f0f0;margin:0 0 12px;">${headline}</h2>
              <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#888888;line-height:1.6;">${bodyHtml}</div>
              ${buttonHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;border-top:1px solid #222222;">
              <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;color:#444444;margin:0;letter-spacing:0.04em;">
                Sent by Practice Pilot · ${CONFIG.practiceName}
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>`;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Test intake flow with dummy data
 * Run this from Apps Script editor to verify setup
 */
function testIntakeFlow() {
  onIntakeFormSubmit({
    values: [
      new Date(),                      // timestamp
      'test@test.com',                 // auto email
      'Test Client',                   // name
      'testclient@example.com',        // client email
      'Individual',                    // therapy type
      'Insurance',                     // payment
      'Aetna',                         // insurance
      'Anxiety and stress',            // reason
      'Psychology Today'               // referral
    ]
  });
  Logger.log('Test intake flow triggered — check your email.');
}

/**
 * View all pending delayed email jobs
 */
function viewPendingJobs() {
  const props = PropertiesService.getScriptProperties().getProperties();
  const jobs = Object.entries(props).filter(([k]) => k.startsWith('delayed_'));
  Logger.log('Pending delayed jobs: ' + jobs.length);
  jobs.forEach(([k, v]) => {
    const job = JSON.parse(v);
    const fireAt = new Date(job.fireAt);
    Logger.log(k + ' → ' + job.type + ' fires at ' + fireAt);
  });
}

/**
 * Clear all pending delayed jobs (use with caution)
 */
function clearAllPendingJobs() {
  const props = PropertiesService.getScriptProperties().getProperties();
  Object.keys(props).forEach(k => {
    if (k.startsWith('delayed_')) {
      PropertiesService.getScriptProperties().deleteProperty(k);
    }
  });
  Logger.log('All pending jobs cleared.');
}
