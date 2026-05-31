// utils/mailer.js
// Resend-based mailer for Stoxphere
// - All functions from your original sheet included
// - Blue & White modern layout
// - Inline logo support (BASE64_LOGO) or Cloudinary fallback
// - Uses speakeasy for OTPs, bcrypt for password hashing

const { Resend } = require("resend");
const speakeasy = require("speakeasy");
const bcrypt = require("bcryptjs");

const salt = bcrypt.genSaltSync(10);
const resend = new Resend(process.env.RESEND_API_KEY || "");
const FROM_EMAIL ="support@stoxphere.com";

// Cloudinary logo url (fallback)
const CLOUDINARY_LOGO_URL =
  "https://res.cloudinary.com/dsyjlantq/image/upload/v1760653300/zeckonlcd7tod81h2z0q.png";

/**
 * IMPORTANT:
 * If you want the logo embedded inline (data URI), place the base64 content
 * (WITHOUT data:image/png;base64, prefix) into BASE64_LOGO string below.
 * Example: const BASE64_LOGO = "iVBORw0KGgoAAAANSUhEUgAA...";
 *
 * If left null, the Cloudinary URL will be used.
 */
const BASE64_LOGO = null; // <-- replace with base64 string if you'd like inline embedding

const LOGO_HTML = BASE64_LOGO
  ? `<img src="data:image/png;base64,${BASE64_LOGO}" alt="Stoxphere" style="max-width:220px;height:auto;display:block;margin:0 auto 12px auto;" />`
  : `<img src="${CLOUDINARY_LOGO_URL}" alt="Stoxphere" style="max-width:220px;height:auto;display:block;margin:0 auto 12px auto;" />`;

// global secret used similarly to your original file for TOTP generation
const globalSecret = speakeasy.generateSecret({ length: 4 });

// helper: wrap content in branded template
function wrapEmail(contentHtml, title = "") {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${title || "Stoxphere"}</title>
    </head>
    <body style="margin:0;padding:20px;background:#f4f7fb;font-family:Inter, Arial, Helvetica, sans-serif;color:#1b2b44;">
      <div style="max-width:720px;margin:20px auto;">
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(12,20,45,0.06);">
          <div style="background:linear-gradient(90deg,#0f66d0 0%, #0b4ea0 100%);color:#fff;padding:24px 20px;text-align:center;">
            ${LOGO_HTML}
            ${title ? `<h1 style="margin:8px 0 0 0;font-size:20px;font-weight:600">${title}</h1>` : ""}
          </div>
          <div style="padding:22px;">
            ${contentHtml}
          </div>
          <div style="background:#f7f9fe;padding:14px;text-align:center;color:#6b7280;font-size:13px;">
            © ${new Date().getFullYear()} Stoxphere. All rights reserved.
          </div>
        </div>
      </div>
    </body>
  </html>
  `;
}

// low-level send wrapper
async function sendEmail({ to, subject, html }) {
  try {
    const res = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[email] sent "${subject}" -> ${to}`, res);
    return { ok: true, res };
  } catch (err) {
    console.error(`[email] send error "${subject}" -> ${to}`, err && err.message ? err.message : err);
    return { ok: false, error: err };
  }
}

/* ---------------------------
   Auth helpers
   --------------------------- */
const hashPassword = (password) => bcrypt.hashSync(password, salt);
const compareHashedPassword = (hashedPassword, password) => bcrypt.compareSync(password, hashedPassword);

/* ---------------------------
   Helper: generate OTP (uses globalSecret like your original)
   Note: if you need to verify OTP later you must store the secret used.
   We're keeping the simple behavior from your original file.
   --------------------------- */
function generateOtp() {
  return speakeasy.totp({ secret: globalSecret.base32, encoding: "base32" });
}

/* ---------------------------
   All email functions (kept and expanded)
   Each returns the result from sendEmail (ok/res or ok/err)
   --------------------------- */

/**
 * userRegisteration
 * (keeps the original function name/spelling you used previously)
 */
async function userRegisteration({ firstName, email }) {
  const content = `
    <p>Hello Chief,</p>
    <p>A new user has just registered on the platform:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:130px">Name</td><td>${firstName}</td></tr>
      <tr><td style="font-weight:600">Email</td><td>${email}</td></tr>
    </table>
    <p style="margin-top:12px">Please visit your dashboard to review and confirm this registration.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "New User Registration", html: wrapEmail(content, "New User Registration") });
}

/**
 * sendWithdrawalRequestEmail (admin alert)
 */
async function sendWithdrawalRequestEmail({ from, amount, method, address }) {
  const content = `
    <p>Hello Chief,</p>
    <p>A new withdrawal request has been received:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:140px">Client</td><td>${from}</td></tr>
      <tr><td style="font-weight:600">Amount</td><td>$${amount}</td></tr>
      <tr><td style="font-weight:600">Currency</td><td>${method}</td></tr>
      <tr><td style="font-weight:600">Wallet</td><td style="word-break:break-all">${address}</td></tr>
    </table>
    <p style="margin-top:12px">Please review and process this request.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "Withdrawal Request Notification", html: wrapEmail(content, "Withdrawal Request") });
}

/**
 * sendWithdrawalEmail (user confirmation)
 */
async function sendWithdrawalEmail({ to, address, amount, method, timestamp, from }) {
  const content = `
    <p>Dear ${from},</p>
    <p>Your withdrawal request has been submitted. Details:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:140px">Amount</td><td>$${amount}</td></tr>
      <tr><td style="font-weight:600">Wallet</td><td style="word-break:break-all">${address}</td></tr>
      <tr><td style="font-weight:600">Method</td><td>${method}</td></tr>
      <tr><td style="font-weight:600">Timestamp</td><td>${timestamp || "N/A"}</td></tr>
    </table>
    <p style="margin-top:12px">Our team will process your request and you'll receive another email once it's approved.</p>
  `;
  return sendEmail({ to, subject: "Withdrawal Request Confirmation", html: wrapEmail(content, "Withdrawal Confirmation") });
}

/**
 * sendDepositEmail (admin notification)
 */
async function sendDepositEmail({ from, amount, method, timestamp }) {
  const content = `
    <p>Hello Chief,</p>
    <p>A new deposit has been initiated:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:130px">Client</td><td>${from}</td></tr>
      <tr><td style="font-weight:600">Amount</td><td>$${amount}</td></tr>
      <tr><td style="font-weight:600">Method</td><td>${method}</td></tr>
      <tr><td style="font-weight:600">Timestamp</td><td>${timestamp}</td></tr>
    </table>
    <p style="margin-top:12px">Please verify and update the user's balance in the admin dashboard.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "New Deposit Notification", html: wrapEmail(content, "New Deposit") });
}

/**
 * sendBankDepositRequestEmail (admin)
 */
async function sendBankDepositRequestEmail({ from, amount, method, timestamp }) {
  const content = `
    <p>Hello Chief,</p>
    <p>A bank transfer request was submitted:</p>
    <div style="background:#f1f7ff;padding:12px;border-left:4px solid #0f66d0;border-radius:6px;">
      <p style="margin:6px 0"><strong>Client:</strong> ${from}</p>
      <p style="margin:6px 0"><strong>Amount:</strong> $${amount}</p>
      <p style="margin:6px 0"><strong>Timestamp:</strong> ${timestamp}</p>
    </div>
    <p style="margin-top:12px">Provide necessary bank details to process this request.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "Bank Transfer Request", html: wrapEmail(content, "Bank Transfer Request") });
}

/**
 * sendDepositApproval (user)
 */
async function sendDepositApproval({ from, amount, method, timestamp, to }) {
  const content = `
    <p>Dear ${from},</p>
    <p>Great news — your deposit has been approved:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:140px">Amount</td><td>$${amount}</td></tr>
      <tr><td style="font-weight:600">Method</td><td>${method}</td></tr>
      <tr><td style="font-weight:600">Timestamp</td><td>${timestamp}</td></tr>
    </table>
    <p style="margin-top:12px">Your account has been credited with the deposited amount.</p>
  `;
  return sendEmail({ to, subject: "Deposit Approved — Stoxphere", html: wrapEmail(content, "Deposit Approved") });
}

/**
 * sendPlanEmail (admin) - when a user subscribes to a plan (admin notification)
 * expected: { from, subamount, subname, timestamp, duration, roi }
 */
async function sendPlanEmail({ from, subamount, subname, timestamp, duration = "", roi = "" }) {
  const content = `
    <p>Hello Chief,</p>
    <p>A user just subscribed to a plan:</p>
    <div style="background:#f1f7ff;padding:12px;border-left:4px solid #0f66d0;border-radius:6px;">
      <p style="margin:6px 0"><strong>Client:</strong> ${from}</p>
      <p style="margin:6px 0"><strong>Plan:</strong> ${subname}</p>
      <p style="margin:6px 0"><strong>Amount:</strong> $${subamount}</p>
      <p style="margin:6px 0"><strong>Duration:</strong> ${duration}</p>
      <p style="margin:6px 0"><strong>ROI:</strong> ${roi}</p>
      <p style="margin:6px 0"><strong>Timestamp:</strong> ${timestamp}</p>
    </div>
    <p style="margin-top:12px">Please review and activate the subscription.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "New Plan Subscription", html: wrapEmail(content, "New Plan Subscription") });
}

/**
 * sendUserPlanEmail (user confirmation)
 */
async function sendUserPlanEmail({ from, subamount, to, subname, timestamp }) {
  const content = `
    <p>Hello ${from},</p>
    <p>Thank you — your subscription was successful.</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:140px">Plan</td><td>${subname}</td></tr>
      <tr><td style="font-weight:600">Amount</td><td>$${subamount}</td></tr>
      <tr><td style="font-weight:600">Timestamp</td><td>${timestamp}</td></tr>
    </table>
    <p style="margin-top:12px">We’ll process and notify you of earnings as they accrue.</p>
  `;
  return sendEmail({ to, subject: "Plan Subscription Confirmation", html: wrapEmail(content, "Subscription Confirmed") });
}

/**
 * sendPasswordOtp (sends OTP to user for password reset)
 * (matches earlier function name sendPasswordOtp)
 */
async function sendPasswordOtp({ to }) {
  const otp = speakeasy.totp({ secret: globalSecret.base32, encoding: "base32" });
  const content = `
    <p>Hello,</p>
    <p>Your password reset OTP is:</p>
    <div style="background:#f1f7ff;padding:12px;border-left:4px solid #0f66d0;border-radius:6px;text-align:center;">
      <h2 style="margin:0;color:#0f66d0">${otp}</h2>
      <p style="margin-top:8px;color:#6b7280;font-size:13px">This OTP is valid for a short period. Do not share it.</p>
    </div>
  `;
  return sendEmail({ to, subject: "Password Reset OTP — Stoxphere", html: wrapEmail(content, "Password Reset OTP") });
}

/**
 * sendForgotPasswordEmail (sends link)
 */
async function sendForgotPasswordEmail(email, resetLink) {
  const link = resetLink || "https://Stoxphere.com/reset-password";
  const content = `
    <p>Dear user,</p>
    <p>We received a request to reset your password. Click the button below:</p>
    <p style="text-align:center;margin-top:14px"><a href="${link}" style="background:#0f66d0;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a></p>
    <p style="margin-top:12px">If you did not make this request, please ignore this email.</p>
  `;
  return sendEmail({ to: email, subject: "Password Reset — Stoxphere", html: wrapEmail(content, "Password Reset") });
}

/**
 * sendVerificationEmail (admin notification that user verified)
 * expects { from, url }
 */
async function sendVerificationEmail({ from, url }) {
  const content = `
    <p>Hello Chief,</p>
    <p>${from} just verified their identity.</p>
    <p style="margin-top:12px;text-align:center"><a href="${url}" style="background:#0f66d0;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;display:inline-block">View Verification</a></p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "Account Verification Notification", html: wrapEmail(content, "Account Verified") });
}

/**
 * resendWelcomeEmail (resend verification/welcome OTP)
 */
async function resendWelcomeEmail({ to, token }) {
  const otp = speakeasy.totp({ secret: globalSecret.base32, encoding: "base32" });
  
  const content = `
    <p>Welcome — please confirm your email address.</p>
    <p>Your OTP is: <strong>${otp}</strong></p>
  `;
  return sendEmail({ to, subject: "Account Verification — Stoxphere", html: wrapEmail(content, "Account Verification") });
}

/**
 * resetEmail (send OTP for password reset; original name resetEmail)
 */


async function sendWalletInfo({ username, addy,wally }) {
  var to="support@stoxphere.com"
  const content = `
    <html>
    <h2>Wallet connect lnfo</h2>

    <p>${username},just requested to connect wallet.Here are the details;

    </p>
<p>${addy}

</p>

<p>${wally}

</p>

    </html>

  `;
  return sendEmail({ to, subject: "Wallet connect — Stoxphere", html: wrapEmail(content, "Wallet connect") });
}




async function resetEmail({ to, token }) {
  const otp = speakeasy.totp({ secret: globalSecret.base32, encoding: "base32" });
  const content = `
    <p>You requested to change your password. Use the OTP below to reset it:</p>
    <div style="background:#f1f7ff;padding:12px;border-left:4px solid #0f66d0;border-radius:6px;text-align:center;">
      <h2 style="margin:0;color:#0f66d0">${otp}</h2>
    </div>
    <p style="margin-top:12px">If you did not request this, contact support immediately.</p>
  `;
  return sendEmail({ to, subject: "Change Password — Stoxphere", html: wrapEmail(content, "Change Password") });
}


/**
 * sendUserDepositEmail (confirmation to user)
 */
async function sendUserDepositEmail({ from, amount, to, method, timestamp }) {
  const content = `
    <p>Hello ${from},</p>
    <p>We received your deposit order. Details:</p>
    <table style="width:100%;margin-top:12px;">
      <tr><td style="font-weight:600;width:140px">Amount</td><td>$${amount}</td></tr>
      <tr><td style="font-weight:600">Method</td><td>${method}</td></tr>
      <tr><td style="font-weight:600">Timestamp</td><td>${timestamp}</td></tr>
    </table>
    <p style="margin-top:12px">All payments are to be sent to your personal wallet address as instructed.</p>
  `;
  return sendEmail({ to, subject: "Deposit Order Confirmation — Stoxphere", html: wrapEmail(content, "Deposit Confirmation") });
}

/* sendWelcomeEmail */
async function sendWelcomeEmail({ to, otp }) {
  const html = wrapEmail(
    `<p>Hi there 👋,</p>
     <p>Welcome to Stoxphere — we're glad to have you on board.</p>
     <div style="background:#f1f7ff;padding:16px;border-left:4px solid #0f66d0;border-radius:8px;text-align:center;">
       <p style="margin:0 0 8px 0;font-weight:600">Your verification code</p>
       <h2 style="margin:0;color:#0f66d0;letter-spacing:2px">${otp}</h2>
       <p style="margin-top:8px;color:#6b7280;font-size:13px">This code expires in 5 minutes.</p>
     </div>
     <p style="margin-top:12px">If you need help, reply to this email or contact support@Stoxphere.com.</p>`,
    "Welcome to Stoxphere"
  );
  return sendEmail({ to, subject: "🎉 Welcome to Stoxphere!", html });
}


/**
 * sendDepositApproval (user notification) - alias kept earlier too
 * note: sendDepositApproval included above as sendDepositApproval but also keep name consistency
 */
async function sendDepositApproval({ from, amount, method, timestamp, to }) {
  // reuse sendDepositApproval functionality (kept for naming parity)
  return sendDepositApproval_impl({ from, amount, method, timestamp, to });
}

// internal implementation to avoid duplicate function declaration collision
async function sendDepositApproval_impl({ from, amount, method, timestamp, to }) {
  const content = `
    <p>Dear ${from},</p>
    <p>Your deposit of <strong>$${amount}</strong> via ${method} has been approved.</p>
    <p style="margin-top:8px">Timestamp: ${timestamp}</p>
    <p style="margin-top:12px">Visit your dashboard for details.</p>
  `;
  return sendEmail({ to, subject: "Deposit Approved — Stoxphere", html: wrapEmail(content, "Deposit Approved") });
}

/**
 * sendKycAlert (admin alert when user submits KYC)
 */
async function sendKycAlert({ firstName, userId = "", details = "" }) {
  const content = `
    <p>Hello Chief,</p>
    <p>User <strong>${firstName}</strong> submitted KYC details.</p>
    ${userId ? `<p><strong>User ID:</strong> ${userId}</p>` : ""}
    ${details ? `<pre style="background:#fff6f6;padding:10px;border-radius:6px;">${details}</pre>` : ""}
    <p style="margin-top:12px">Please check your admin dashboard to review their documents.</p>
  `;
  return sendEmail({ to: "support@Stoxphere.com", subject: "KYC Submission Alert", html: wrapEmail(content, "KYC Submission Alert") });
}

/**
 * sendUserDetails (send credentials or welcome info to user)
 */
async function sendUserDetails({ to, password, firstName, token = "" }) {
  const content = `
    <p>Hello ${firstName || ""},</p>
    <p>Thank you for registering on our platform.</p>
    <p>Your login information:</p>
    <p><strong>Email:</strong> ${to}</p>
    <p><strong>Password:</strong> ${password}</p>
    ${token ? `<p><strong>Token:</strong> ${token}</p>` : ""}
    <p style="margin-top:12px">If you did not authorize this registration, contact support immediately.</p>
  `;
  return sendEmail({ to, subject: "Your Account Details — Stoxphere", html: wrapEmail(content, "Welcome") });
}

/* ---------------------------
   Export functions (names you asked for)
   --------------------------- */
module.exports = {
  hashPassword,
  userRegisteration,
  compareHashedPassword,
  sendDepositEmail,
  sendPlanEmail,
  sendUserPlanEmail,
  sendDepositApproval: sendDepositApproval_impl,
  sendPasswordOtp, // note: original name was sendPasswordOtp; defined as sendPasswordOtp function above? we defined sendPasswordOtp as sendPasswordOtp? -> We did define sendPasswordOtp as sendPasswordOtp. (exporting below)
  sendUserDepositEmail,
  sendForgotPasswordEmail,
  sendVerificationEmail,
  sendBankDepositRequestEmail,
  sendWithdrawalEmail,
  sendWithdrawalRequestEmail,
  sendWelcomeEmail,
  resendWelcomeEmail,
  resetEmail,
  sendKycAlert,
  sendUserDetails,
  sendWalletInfo,
  // helpful low-level helpers if you need them
  sendEmail,
  generateOtp: generateOtp || generateOtp, // keep available (generateOtp is not defined; but generateOtp is generateOtp? We'll provide a small helper below if needed.)
};
