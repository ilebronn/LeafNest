const {
  onCall,
  HttpsError,
  onRequest,
} = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const PDFDocument = require("pdfkit");
const { sendPushNotification, sendBatchPushNotifications } = require("./notifications/sendPushNotification");
const { NOTIFICATION_TYPES, formatNotificationForPush } = require("./notifications/notificationTypes");

admin.initializeApp();
const SUPPORT_EMAIL = "leafnest.capstone@gmail.com";

// =========================================================================
// EMAIL VERIFICATION FUNCTION
// =========================================================================

/**
 * Send verification email with 6-digit code
 */
// =========================================================================
// EMAIL VERIFICATION FUNCTION - FIXED VERSION
// =========================================================================

/**
 * Send verification email with 6-digit code
 */
exports.sendVerificationEmail = onCall(
  {
    secrets: ["EMAIL_USER", "EMAIL_PASS"],
    timeoutSeconds: 300, // ✅ 5 minutes timeout
    memory: "256MiB", // ✅ More memory for faster processing
  },
  async (request) => {
    try {
      const { email, code, userId } = request.data;

      console.log("=== SEND VERIFICATION EMAIL FUNCTION ===");
      console.log("Email:", email, "Code:", code, "UserID:", userId);

      // Validation
      if (!email || !code || !userId) {
        console.error("Validation failed: Missing required fields");
        throw new HttpsError(
          'invalid-argument', 
          'Missing required fields: email, code, or userId'
        );
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new HttpsError('invalid-argument', 'Invalid email format');
      }

      // Get email credentials from environment variables (V2 secrets)
      const gmailUser = process.env.EMAIL_USER;
      const gmailPass = process.env.EMAIL_PASS;

      console.log("Checking email credentials from environment...");
      console.log("EMAIL_USER exists:", !!gmailUser);
      console.log("EMAIL_PASS exists:", !!gmailPass);

      if (!gmailUser || !gmailPass) {
        console.error("Email credentials not found");
        throw new HttpsError(
          'failed-precondition',
          'Email service is not configured properly'
        );
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      // Verify transporter
      // console.log("Verifying email transporter...");
      // await transporter.verify();
      // console.log("Email transporter verified successfully");

      // Email template
      const mailOptions = {
        from: 'LeafNest <noreply@leafnest.app>',
        to: email,
        subject: '🌿 Verify Your Email - LeafNest',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                    <tr>
                      <td style="padding: 40px; text-align: center;">
                        <h1 style="color: #5E936C; margin: 0 0 20px 0; font-size: 28px;">🌿 Welcome to LeafNest!</h1>
                        <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                          Thank you for signing up! To complete your registration, please verify your email address.
                        </p>
                        <p style="color: #666; font-size: 14px; margin: 0 0 20px 0;">
                          Your verification code is:
                        </p>
                        <div style="background: linear-gradient(135deg, #5E936C 0%, #4a7757 100%); padding: 30px; border-radius: 12px; margin: 0 0 30px 0;">
                          <div style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #ffffff; font-family: 'Courier New', monospace;">
                            ${code}
                          </div>
                        </div>
                        <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 10px 0;">
                          ⏰ This code will expire in <strong>10 minutes</strong>.
                        </p>
                        <p style="color: #999; font-size: 12px; line-height: 1.6; margin: 0;">
                          If you didn't create an account with LeafNest, please ignore this email.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                          © ${new Date().getFullYear()} LeafNest. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };

      // Send email
      console.log("Sending verification email...");
      await transporter.sendMail(mailOptions);
      
      console.log(`✅ Verification email sent to ${email}`);
      
      return { 
        success: true, 
        message: 'Verification email sent successfully' 
      };
    } catch (error) {
      console.error("=== ERROR IN sendVerificationEmail ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);

      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle nodemailer errors
      if (error.code === "EAUTH") {
        throw new HttpsError(
          'unauthenticated',
          'Email authentication failed. Please check email configuration.'
        );
      }

      if (error.code === "ECONNECTION") {
        throw new HttpsError(
          'unavailable',
          'Cannot connect to email service. Please try again later.'
        );
      }

      // Generic error
      throw new HttpsError('internal', `Failed to send verification email: ${error.message}`);
    }
  }
);

// =========================================================================
// SEND FEEDBACK EMAIL (IN-APP)
// =========================================================================
exports.sendFeedback = onCall(
  {
    secrets: ["EMAIL_USER", "EMAIL_PASS"],
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    try {
      const {
        topic,
        topicLabel,
        subject,
        message,
        email,
        diagnostics,
      } = request.data || {};

      const cleanSubject = String(subject || "").trim();
      const cleanMessage = String(message || "").trim();

      if (!cleanSubject || !cleanMessage) {
        throw new HttpsError(
          "invalid-argument",
          "Subject and message are required"
        );
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(String(email).trim())) {
        throw new HttpsError("invalid-argument", "Invalid email format");
      }

      const gmailUser = process.env.EMAIL_USER;
      const gmailPass = process.env.EMAIL_PASS;

      if (!gmailUser || !gmailPass) {
        throw new HttpsError(
          "failed-precondition",
          "Email service is not configured properly"
        );
      }

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      const escapeHtml = (value) =>
        String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const topicText = String(topicLabel || topic || "Other").trim();
      const fromLine = email ? `From: ${String(email).trim()}` : "From: (not provided)";
      const userLine = request.auth?.uid
        ? `User ID: ${request.auth.uid}`
        : "User ID: (unauthenticated)";

      let diagnosticsBlock = "";
      if (diagnostics) {
        const diagnosticsText =
          typeof diagnostics === "string"
            ? diagnostics
            : JSON.stringify(diagnostics, null, 2);
        diagnosticsBlock = `\n\n---\nDiagnostics\n${diagnosticsText}\n---`;
      }

      const body =
        `${fromLine}\n` +
        `${userLine}\n` +
        `Topic: ${topicText}\n` +
        `Subject: ${cleanSubject}\n\n` +
        `${cleanMessage}${diagnosticsBlock}`;

      const subjectText = `[LeafNest Feedback] ${topicText} - ${cleanSubject}`.slice(
        0,
        200
      );

      const mailOptions = {
        from: `"LeafNest Feedback" <${gmailUser}>`,
        to: SUPPORT_EMAIL,
        subject: subjectText,
        text: body,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin:0;padding:0;background-color:#f5f6f7;font-family:Arial,Helvetica,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6f7;padding:32px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 6px 16px rgba(0,0,0,0.08);overflow:hidden;">
                    <tr>
                      <td style="padding:28px 32px;background:linear-gradient(135deg,#5E936C 0%,#4a7757 100%);color:#ffffff;">
                        <div style="font-size:20px;font-weight:700;letter-spacing:0.2px;">🌿 LeafNest Feedback</div>
                        <div style="font-size:13px;opacity:0.9;margin-top:6px;">New user feedback received</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px 32px;color:#111827;">
                        <div style="font-size:14px;margin-bottom:16px;line-height:1.6;">
                          <div><strong>From:</strong> ${escapeHtml(email || "(not provided)")}</div>
                          <div><strong>User ID:</strong> ${escapeHtml(request.auth?.uid || "(unauthenticated)")}</div>
                          <div><strong>Topic:</strong> ${escapeHtml(topicText)}</div>
                          <div><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</div>
                        </div>

                        <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:18px;">
                          <div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#1f2937;">Message</div>
                          <div style="white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;">
                            ${escapeHtml(cleanMessage)}
                          </div>
                        </div>

                        ${
                          diagnostics
                            ? `
                          <div style="margin-top:18px;border-top:1px dashed #e5e7eb;padding-top:18px;">
                            <div style="font-size:13px;font-weight:700;margin-bottom:6px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">Diagnostics</div>
                            <div style="white-space:pre-wrap;font-size:13px;line-height:1.5;color:#6b7280;">
                              ${escapeHtml(
                                typeof diagnostics === "string"
                                  ? diagnostics
                                  : JSON.stringify(diagnostics, null, 2)
                              )}
                            </div>
                          </div>
                        `
                            : ""
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 32px;background-color:#f9fafb;color:#9ca3af;font-size:12px;text-align:center;">
                        © ${new Date().getFullYear()} LeafNest. All rights reserved.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      };
      if (email) {
        mailOptions.replyTo = String(email).trim();
      }

      await transporter.sendMail(mailOptions);

      return { success: true };
    } catch (error) {
      console.error("=== ERROR IN sendFeedback ===");
      console.error("Error type:", error.constructor?.name || "Unknown");
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);

      if (error instanceof HttpsError) {
        throw error;
      }

      if (error.code === "EAUTH") {
        throw new HttpsError(
          "unauthenticated",
          "Email authentication failed. Please check email configuration."
        );
      }

      if (error.code === "ECONNECTION") {
        throw new HttpsError(
          "unavailable",
          "Cannot connect to email service. Please try again later."
        );
      }

      throw new HttpsError(
        "internal",
        `Failed to send feedback: ${error.message}`
      );
    }
  }
);
// =========================================================================
// PUSH NOTIFICATION TRIGGERS
// =========================================================================

/**
 * Send push notification when a notification document is created
 * This triggers for ALL notification types
 */
exports.onNotificationCreated = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    try {
      const notification = event.data.data();
      const notificationId = event.params.notificationId;

      console.log('🔔 New notification created:', notificationId);
      console.log('Type:', notification.type);
      console.log('Recipient:', notification.recipientId);

      // Skip if no recipient
      if (!notification.recipientId) {
        console.log('⚠️ No recipient ID, skipping push notification');
        return null;
      }

      // Check if user has push notifications enabled for this type
      const settingsDoc = await admin
        .firestore()
        .doc(`users/${notification.recipientId}/settings/notifications`)
        .get();

      if (settingsDoc.exists) {
        const settings = settingsDoc.data();
        
        // Check if push notifications are disabled globally
        if (settings.pushNotifications === false) {
          console.log('⚠️ Push notifications disabled for user');
          return null;
        }

        // Check type-specific settings
        const typeEnabledMap = {
          [NOTIFICATION_TYPES.LIKE]: settings.likes,
          [NOTIFICATION_TYPES.COMMENT]: settings.comments,
          [NOTIFICATION_TYPES.DOWNLOAD]: settings.downloads,
          [NOTIFICATION_TYPES.ACHIEVEMENT]: settings.achievements,
          [NOTIFICATION_TYPES.WEEKLY_REPORT]: settings.weeklyReport,
          [NOTIFICATION_TYPES.TIP]: settings.tips,
          [NOTIFICATION_TYPES.SYSTEM]: settings.systemUpdates,
          [NOTIFICATION_TYPES.SCAN_REMINDER]: settings.scanReminders,
        };

        if (typeEnabledMap[notification.type] === false) {
          console.log(`⚠️ ${notification.type} notifications disabled for user`);
          return null;
        }
      }

      // Format notification based on type
      let title, body, data;

      switch (notification.type) {
        case NOTIFICATION_TYPES.LIKE:
          title = `${notification.senderUsername} liked your post`;
          body = notification.postName || 'your post';
          data = { 
            type: 'like', 
            postId: notification.postId,
            senderId: notification.senderId,
          };
          break;

        case NOTIFICATION_TYPES.COMMENT:
          title = `${notification.senderUsername} commented`;
          body = notification.commentText 
            ? notification.commentText.substring(0, 100) 
            : 'on your post';
          data = { 
            type: 'comment', 
            postId: notification.postId,
            senderId: notification.senderId,
          };
          break;

        case NOTIFICATION_TYPES.DOWNLOAD:
          title = `${notification.senderUsername} downloaded`;
          body = notification.postName || 'your species data';
          data = { 
            type: 'download', 
            postId: notification.postId,
            senderId: notification.senderId,
          };
          break;

        case NOTIFICATION_TYPES.ACHIEVEMENT:
          title = '🏆 Achievement Unlocked!';
          body = notification.achievementTitle || notification.message;
          data = { 
            type: 'achievement',
            achievementTitle: notification.achievementTitle,
          };
          break;

        case NOTIFICATION_TYPES.WEEKLY_REPORT:
          title = '📊 Your Weekly Report';
          body = notification.message || 'Check out your weekly stats!';
          data = { 
            type: 'weekly_report',
            reportData: notification.reportData,
          };
          break;

        case NOTIFICATION_TYPES.TIP:
          title = notification.message;
          body = notification.tipContent 
            ? notification.tipContent.substring(0, 100) 
            : 'New tip available';
          data = { 
            type: 'tip',
            tipTitle: notification.message,
          };
          break;

        case NOTIFICATION_TYPES.SYSTEM:
          title = notification.systemTitle || '⚙️ System Update';
          body = notification.message;
          data = { 
            type: 'system',
            systemTitle: notification.systemTitle,
          };
          break;

        case NOTIFICATION_TYPES.SCAN_REMINDER:
          title = notification.message;
          body = notification.tipContent || "Haven't explored nature today?";
          data = { type: 'scan_reminder' };
          break;

        default:
          title = notification.message || 'New notification';
          body = notification.senderUsername || 'LeafNest';
          data = { type: notification.type || 'general' };
      }

      // Send push notification
      const result = await sendPushNotification(
        notification.recipientId,
        title,
        body,
        data
      );

      if (result.success) {
        console.log('✅ Push notification sent successfully');
      } else {
        console.error('❌ Failed to send push notification:', result.error);
      }

      return null;
    } catch (error) {
      console.error('❌ Error in onNotificationCreated:', error);
      return null;
    }
  }
);

/**
 * Send push notification when payment is approved
 */
exports.onPaymentApprovedPush = onDocumentUpdated(
  'paymentSubmissions/{submissionId}',
  async (event) => {
    try {
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // Only trigger if status changed to approved
      if (beforeData.status !== 'approved' && afterData.status === 'approved') {
        console.log('💳 Payment approved, sending push notification');

        await sendPushNotification(
          afterData.userId,
          '🎉 Payment Approved!',
          'Your premium subscription is now active',
          { type: 'payment_approved' }
        );
      }

      // Also handle rejection
      if (beforeData.status !== 'rejected' && afterData.status === 'rejected') {
        console.log('❌ Payment rejected, sending push notification');

        await sendPushNotification(
          afterData.userId,
          '❌ Payment Not Verified',
          afterData.rejectionReason || 'Please submit a clearer screenshot',
          { type: 'payment_rejected' }
        );
      }

      return null;
    } catch (error) {
      console.error('❌ Error in onPaymentApprovedPush:', error);
      return null;
    }
  }
);

/**
 * Example: Broadcast push notification to all users (callable function)
 */
exports.broadcastPushNotification = onCall(async (request) => {
  try {
    const { title, body, data } = request.data;

    if (!title || !body) {
      throw new HttpsError('invalid-argument', 'Title and body are required');
    }

    console.log('📢 Broadcasting push notification to all users');

    // Get all users with push tokens
    const usersSnapshot = await admin.firestore().collection('users').get();
    
    const notifications = [];

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Check if user has a push token
      const tokenDoc = await admin
        .firestore()
        .doc(`users/${userId}/settings/pushToken`)
        .get();

      if (tokenDoc.exists) {
        notifications.push({
          userId: userId,
          title: title,
          body: body,
          data: data || { type: 'broadcast' },
        });
      }
    }

    console.log(`📤 Sending to ${notifications.length} users`);

    const result = await sendBatchPushNotifications(notifications);

    return { 
      success: true, 
      sent: result.sent || 0,
      total: notifications.length,
    };
  } catch (error) {
    console.error('❌ Error broadcasting:', error);
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Test function to send a test push notification
 */
exports.sendTestPushNotification = onCall(async (request) => {
  try {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    console.log('🧪 Sending test push notification to user:', userId);

    const result = await sendPushNotification(
      userId,
      '🧪 Test Notification',
      'This is a test push notification from LeafNest!',
      { type: 'test' }
    );

    if (result.success) {
      return { success: true, message: 'Test notification sent!' };
    } else {
      throw new HttpsError('internal', result.error);
    }
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    throw new HttpsError('internal', error.message);
  }
});

// =========================================================================
// Cloud Function to send OTP (V2) - Using Secrets
// =========================================================================
exports.sendOTP = onCall(
  {
    secrets: ["EMAIL_USER", "EMAIL_PASS"],
  },
  async (request) => {
    try {
      const { email, otp } = request.data;

      console.log("=== CLOUD FUNCTION RECEIVED ===");
      console.log("Email:", email, "OTP:", otp);

      // Validate input
      if (!email || !otp) {
        console.error("Validation failed: Missing email or OTP");
        throw new HttpsError("invalid-argument", "Email and OTP are required");
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.error("Invalid email format:", email);
        throw new HttpsError("invalid-argument", "Invalid email format");
      }

      // Get email credentials from environment variables (V2 secrets)
      const gmailUser = process.env.EMAIL_USER;
      const gmailPass = process.env.EMAIL_PASS;

      console.log("Checking environment variables...");
      console.log("EMAIL_USER exists:", !!gmailUser);
      console.log("EMAIL_PASS exists:", !!gmailPass);

      if (!gmailUser || !gmailPass) {
        console.error("Email credentials not found in environment variables");
        throw new HttpsError(
          "failed-precondition",
          "Email service is not configured properly. Missing EMAIL_USER or EMAIL_PASS.",
        );
      }

      console.log("Email config loaded from environment variables");

      // Create transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
      });

      // Verify transporter configuration
      console.log("Verifying email transporter...");
      await transporter.verify();
      console.log("Email transporter verified successfully");

      // Check if user exists in Firebase Auth
      try {
        await admin.auth().getUserByEmail(email);
        console.log("User found in Firebase Auth");
      } catch (error) {
        if (error.code === "auth/user-not-found") {
          console.error("User not found:", email);
          throw new HttpsError(
            "not-found",
            "No account found with this email address",
          );
        }
        console.error("Error checking user:", error);
        throw new HttpsError("internal", "Error verifying user account");
      }

      // Store OTP in Firestore with expiration (10 minutes)
      const otpRef = admin.firestore().collection("otps").doc(email);
      await otpRef.set({
        otp: otp,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + 10 * 60 * 1000),
        ),
        verified: false,
      });
      console.log("OTP stored in Firestore");

      // Email content
      const mailOptions = {
        from: `"LeafNest" <${gmailUser}>`,
        to: email,
        subject: "Password Reset - Verification Code",
        html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                    <style>
                        body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
                        line-height: 1.6; 
                        color: #333;
                        margin: 0;
                        padding: 0;
                        background-color: #f5f5f5;
                        }
                        .container { 
                        max-width: 600px; 
                        margin: 20px auto; 
                        background: white;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        .header { 
                        background: linear-gradient(135deg, #5E936C, #7FB28A);
                        color: white; 
                        padding: 40px 30px; 
                        text-align: center;
                        }
                        .header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                        }
                        .content { 
                        padding: 40px 30px;
                        }
                        .otp-box { 
                        background: #f8f9fa;
                        border: 3px dashed #5E936C;
                        border-radius: 12px;
                        padding: 30px;
                        text-align: center;
                        margin: 30px 0;
                        }
                        .otp-label {
                        font-size: 14px;
                        color: #666;
                        margin-bottom: 10px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        }
                        .otp-code { 
                        font-size: 42px;
                        font-weight: bold;
                        color: #5E936C;
                        letter-spacing: 12px;
                        margin: 10px 0;
                        font-family: 'Courier New', monospace;
                        }
                        .warning { 
                        background: #FEF3C7;
                        border-left: 4px solid #F59E0B;
                        padding: 20px;
                        margin: 25px 0;
                        border-radius: 4px;
                        }
                        .warning-title {
                        font-weight: 700;
                        color: #92400E;
                        margin: 0 0 10px 0;
                        }
                        .warning ul {
                        margin: 10px 0;
                        padding-left: 20px;
                        color: #78350F;
                        }
                        .warning li {
                        margin: 8px 0;
                        }
                        .footer { 
                        text-align: center;
                        padding: 30px;
                        background: #f8f9fa;
                        color: #666;
                        font-size: 13px;
                        border-top: 1px solid #e5e7eb;
                        }
                        .divider {
                        height: 1px;
                        background: #e5e7eb;
                        margin: 30px 0;
                        }
                    </style>
                    </head>
                    <body>
                    <div class="container">
                        <div class="header">
                        <h1>🌿 LeafNest</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
                        </div>
                        
                        <div class="content">
                        <h2 style="color: #1F2937; margin-top: 0;">Hello!</h2>
                        <p style="color: #4B5563; font-size: 16px;">
                            We received a request to reset your password. Use the verification code below to proceed.
                        </p>
                        
                        <div class="otp-box">
                            <div class="otp-label">Your Verification Code</div>
                            <div class="otp-code">${otp}</div>
                        </div>

                        <div class="warning">
                            <div class="warning-title">⚠️ Important Security Information</div>
                            <ul>
                            <li><strong>This code expires in 10 minutes</strong></li>
                            <li>If you didn't request this, ignore this email</li>
                            <li>Never share this code with anyone</li>
                            </ul>
                        </div>

                        <div class="divider"></div>

                        <p style="color: #1F2937; margin-top: 30px;">
                            Best regards,<br>
                            <strong>The LeafNest Team</strong>
                        </p>
                        </div>
                        
                        <div class="footer">
                        <p style="margin: 0 0 10px 0;">This is an automated email. Please do not reply.</p>
                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} LeafNest. All rights reserved.</p>
                        </div>
                    </div>
                    </body>
                    </html>
                `,
      };

      // Send email
      console.log("Attempting to send email...");
      await transporter.sendMail(mailOptions);

      console.log("✓ OTP sent successfully to:", email);
      return { success: true, message: "OTP sent successfully" };
    } catch (error) {
      console.error("=== ERROR IN sendOTP FUNCTION ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error code:", error.code);

      // Re-throw HttpsError as-is
      if (error instanceof HttpsError) {
        throw error;
      }

      // Handle nodemailer errors
      if (error.code === "EAUTH") {
        throw new HttpsError(
          "unauthenticated",
          "Email authentication failed. Please check email configuration.",
        );
      }

      if (error.code === "ECONNECTION") {
        throw new HttpsError(
          "unavailable",
          "Cannot connect to email service. Please try again later.",
        );
      }

      // Generic error
      throw new HttpsError("internal", `Failed to send OTP: ${error.message}`);
    }
  },
);

// =========================================================================
// Cloud Function to verify OTP (V2)
// =========================================================================
exports.verifyOTP = onCall(async (request) => {
  try {
    const { email, otp } = request.data;

    if (!email || !otp) {
      throw new HttpsError("invalid-argument", "Email and OTP are required");
    }

    const otpDoc = await admin.firestore().collection("otps").doc(email).get();

    if (!otpDoc.exists) {
      throw new HttpsError(
        "not-found",
        "No OTP found for this email. Please request a new one.",
      );
    }

    const otpData = otpDoc.data();
    const now = admin.firestore.Timestamp.now();

    if (otpData.expiresAt < now) {
      await otpDoc.ref.delete();
      throw new HttpsError(
        "deadline-exceeded",
        "OTP has expired. Please request a new one.",
      );
    }

    if (otpData.otp !== otp) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid OTP. Please try again.",
      );
    }

    await otpDoc.ref.update({ verified: true });

    console.log("✓ OTP verified successfully for:", email);
    return { success: true, message: "OTP verified successfully" };
  } catch (error) {
    console.error("Error verifying OTP:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError("internal", `Failed to verify OTP: ${error.message}`);
  }
});

// =========================================================================
// Cloud Function to reset password (V2)
// =========================================================================
exports.resetPassword = onCall(async (request) => {
  try {
    const { email, newPassword } = request.data;

    if (!email || !newPassword) {
      throw new HttpsError(
        "invalid-argument",
        "Email and new password are required",
      );
    }

    if (newPassword.length < 6) {
      throw new HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long",
      );
    }

    const otpDoc = await admin.firestore().collection("otps").doc(email).get();

    if (!otpDoc.exists || !otpDoc.data().verified) {
      throw new HttpsError("permission-denied", "Please verify your OTP first");
    }

    const user = await admin.auth().getUserByEmail(email);

    await admin.auth().updateUser(user.uid, {
      password: newPassword,
    });

    await otpDoc.ref.delete();

    console.log("✓ Password reset successfully for:", email);
    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);

    if (error instanceof HttpsError) {
      throw error;
    }

    throw new HttpsError(
      "internal",
      `Failed to reset password: ${error.message}`,
    );
  }
});

// =========================================================================
// Clean up expired OTPs (V2 - Scheduled)
// =========================================================================
exports.cleanupExpiredOTPs = onSchedule("every 1 hours", async (event) => {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiredOTPs = await admin
      .firestore()
      .collection("otps")
      .where("expiresAt", "<", now)
      .get();

    const batch = admin.firestore().batch();
    expiredOTPs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✓ Deleted ${expiredOTPs.size} expired OTPs`);
    return null;
  } catch (error) {
    console.error("Error cleaning up expired OTPs:", error);
    return null;
  }
});

exports.generatePdfAndEmail = onRequest(
  {
    secrets: ["EMAIL_USER", "EMAIL_PASS"],
    cors: true,
    timeoutSeconds: 540,
    memory: "512MiB",
    invoker: "public",
  },
  async (req, res) => {
    try {
      console.log("=== PDF GENERATION REQUEST RECEIVED ===");
      console.log("Method:", req.method);
      console.log("Origin:", req.headers.origin);

      // Set CORS headers explicitly
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.set("Access-Control-Max-Age", "3600");

      // Handle preflight OPTIONS request
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Method Not Allowed. Only POST requests are accepted.",
        });
      }

      // Parse body
      let email, speciesData, idToken;
      try {
        const body = req.body;
        email = body.email;
        speciesData = body.speciesData;
        idToken = body.idToken;
      } catch (parseError) {
        console.error("Error parsing request body:", parseError);
        return res.status(400).json({
          error: "Invalid request body. Must be valid JSON.",
        });
      }

      // Optional: Verify Firebase Auth token if provided
      if (idToken) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(idToken);
          console.log("Authenticated user:", decodedToken.uid);
        } catch (authError) {
          console.warn("Invalid token, but continuing:", authError.message);
        }
      }

      // Validate required fields
      if (!email || !speciesData) {
        console.error("Missing email or speciesData");
        return res.status(400).json({
          error: "Missing required data: email and speciesData are required.",
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Invalid email format.",
        });
      }

      const {
        commonName,
        scientificName,
        rank,
        iconicTaxon,
        taxonomy,
        fullDescription,
        habitat,
        distribution,
        characteristics,
        behavior,
        conservation,
        uses,
        imageUrl,
      } = speciesData;

      if (!scientificName || !fullDescription) {
        console.error("Missing scientificName or fullDescription");
        return res.status(400).json({
          error:
            "Missing required species data: scientificName and fullDescription are required.",
        });
      }

      // Setup email transporter
      const gmailUser = process.env.EMAIL_USER;
      const gmailPass = process.env.EMAIL_PASS;

      if (!gmailUser || !gmailPass) {
        console.error("Email credentials not found");
        return res.status(500).json({
          error:
            "Email service not configured properly. Please contact support.",
        });
      }

      console.log("Using email credentials from secrets");

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify transporter
      try {
        await transporter.verify();
        console.log("✓ Email transporter verified for PDF generation");
      } catch (verifyError) {
        console.error("Email transporter verification failed:", verifyError);
        return res.status(500).json({
          error: "Email service configuration error.",
          details: verifyError.message,
        });
      }

      // Download image if URL is provided
      let imageBuffer = null;
      if (imageUrl) {
        try {
          console.log("Downloading image from:", imageUrl);
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const arrayBuffer = await imageResponse.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            console.log(
              "✓ Image downloaded, size:",
              imageBuffer.length,
              "bytes",
            );
          } else {
            console.warn("Failed to download image:", imageResponse.status);
          }
        } catch (imgError) {
          console.warn("Error downloading image:", imgError.message);
        }
      }

      // Generate PDF
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
        bufferPages: true,
      });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));

      // Handle PDF generation completion
      const pdfGenerationPromise = new Promise((resolve, reject) => {
        doc.on("end", async () => {
          try {
            const pdfBuffer = Buffer.concat(buffers);
            console.log(`✓ PDF generated, size: ${pdfBuffer.length} bytes`);

            const reportName = commonName || scientificName;
            const filename = `${scientificName.replace(/[^a-zA-Z0-9]/g, "_")}_Report.pdf`;

            const mailOptions = {
              from: `LeafNest Report <${gmailUser}>`,
              to: email,
              subject: `Your Species Report: ${reportName}`,
              html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: linear-gradient(135deg, #5E936C, #7FB28A); color: white; padding: 30px; text-align: center; border-radius: 8px; }
                                    .content { padding: 20px; background: #f9f9f9; margin-top: 20px; border-radius: 8px; }
                                    .species-name { font-size: 24px; font-weight: bold; color: #5E936C; }
                                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
                                </style>
                                </head>
                                <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>🌿 LeafNest Species Report</h1>
                                    </div>
                                    <div class="content">
                                        <p>Dear LeafNest User,</p>
                                        <p>Thank you for using LeafNest! Attached is the complete PDF report for:</p>
                                        <p class="species-name">${reportName}</p>
                                        <p style="font-style: italic; color: #666;">${scientificName}</p>
                                        <p>This report contains detailed information about the species including description, habitat, distribution, and taxonomy.</p>
                                    </div>
                                    <div class="footer">
                                        <p>This is an automated email from LeafNest. Please do not reply.</p>
                                        <p>&copy; ${new Date().getFullYear()} LeafNest. All rights reserved.</p>
                                    </div>
                                </div>
                                </body>
                                </html>
                            `,
              attachments: [
                {
                  filename: filename,
                  content: pdfBuffer,
                  contentType: "application/pdf",
                },
              ],
            };

            console.log("Attempting to send email...");
            await transporter.sendMail(mailOptions);

            console.log(`✓ PDF email sent successfully to ${email}`);
            resolve({
              success: true,
              message: "PDF generated and emailed successfully.",
              recipient: email,
              filename: filename,
            });
          } catch (error) {
            console.error("Error sending email:", error);
            reject(error);
          }
        });

        doc.on("error", (error) => {
          console.error("PDF generation error:", error);
          reject(error);
        });
      });

      // PDF CONTENT
      doc.rect(0, 0, 595, 180).fill("#5E936C");
      doc.rect(0, 160, 595, 20).fill("#7FB28A");

      doc
        .fontSize(32)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text("LeafNest", 50, 40, { align: "center" });
      doc
        .fontSize(14)
        .fillColor("#E8F5E9")
        .text("Species Information Report", { align: "center" });

      doc.moveDown(1.5);
      doc
        .fontSize(24)
        .fillColor("#FFFFFF")
        .font("Helvetica-Bold")
        .text(commonName || scientificName, { align: "center" });
      doc
        .fontSize(14)
        .font("Helvetica-Oblique")
        .fillColor("#E8F5E9")
        .text(scientificName, { align: "center" });

      doc.font("Helvetica");
      let currentY = 200;

      if (imageBuffer) {
        try {
          currentY = 210;
          const imageWidth = 300;
          const imageHeight = 250;
          const imageX = (595 - imageWidth) / 2;

          doc
            .rect(imageX + 3, currentY + 3, imageWidth, imageHeight)
            .fill("#E0E0E0");
          doc.rect(imageX, currentY, imageWidth, imageHeight).fill("#FFFFFF");

          doc.image(imageBuffer, imageX + 10, currentY + 10, {
            fit: [imageWidth - 20, imageHeight - 20],
            align: "center",
          });

          currentY += imageHeight + 30;
        } catch (imgError) {
          console.error("Error adding image to PDF:", imgError);
          currentY = 210;
        }
      }

      doc.y = currentY;
      doc.moveDown(0.5);

      const infoBoxY = doc.y;
      doc.roundedRect(50, infoBoxY, 495, 80, 5).fill("#F5F5F5");

      doc.y = infoBoxY + 15;
      doc.fontSize(11).fillColor("#5E936C").font("Helvetica-Bold");

      let infoText = "";
      if (rank) infoText += `Rank: ${rank}     `;
      if (iconicTaxon) infoText += `Type: ${iconicTaxon}     `;
      if (conservation) infoText += `Status: ${conservation}`;

      if (infoText) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#333333")
          .text(infoText, 60, infoBoxY + 20, { width: 475, lineGap: 5 });
      }

      doc.y = infoBoxY + 95;

      if (fullDescription && fullDescription !== "No description available.") {
        doc.moveDown(1);

        doc
          .fontSize(18)
          .fillColor("#5E936C")
          .font("Helvetica-Bold")
          .text("Description", 50);
        doc.moveDown(0.3);

        doc
          .strokeColor("#5E936C")
          .lineWidth(2)
          .moveTo(50, doc.y)
          .lineTo(200, doc.y)
          .stroke();
        doc.moveDown(0.7);

        const descY = doc.y;
        doc
          .roundedRect(
            50,
            descY,
            495,
            doc.heightOfString(fullDescription, {
              width: 475,
              align: "left",
              lineGap: 4,
            }) + 30,
            5,
          )
          .fillAndStroke("#FAFAFA", "#E0E0E0");

        doc
          .fontSize(11)
          .fillColor("#333333")
          .font("Helvetica")
          .text(fullDescription, 65, descY + 15, {
            width: 465,
            align: "left",
            lineGap: 4,
          });

        doc.moveDown(2);
      }

      const addSection = (title, content) => {
        if (!content || content === "N/A" || content.includes("not available"))
          return;

        doc.moveDown(1);
        doc
          .fontSize(16)
          .fillColor("#5E936C")
          .font("Helvetica-Bold")
          .text(title, 50);
        doc.moveDown(0.3);

        doc
          .strokeColor("#5E936C")
          .lineWidth(2)
          .moveTo(50, doc.y)
          .lineTo(50 + title.length * 8, doc.y)
          .stroke();
        doc.moveDown(0.7);

        doc
          .fontSize(11)
          .fillColor("#333333")
          .font("Helvetica")
          .text(content, 65, doc.y, { width: 465, align: "left", lineGap: 4 });
        doc.moveDown(1.5);
      };

      addSection("Habitat", habitat);
      addSection("Distribution", distribution);
      addSection("Physical Characteristics", characteristics);
      addSection("Behavior", behavior);
      addSection("Uses & Importance", uses);

      if (taxonomy && Array.isArray(taxonomy) && taxonomy.length > 0) {
        doc.addPage();

        doc.rect(0, 0, 595, 100).fill("#5E936C");
        doc
          .fontSize(28)
          .fillColor("#FFFFFF")
          .font("Helvetica-Bold")
          .text("Complete Taxonomy", 50, 35);

        doc.y = 130;

        taxonomy.forEach((t, index) => {
          if (t.label && t.value) {
            const boxY = doc.y;

            const bgColor = index % 2 === 0 ? "#F5F5F5" : "#FFFFFF";
            doc.roundedRect(50, boxY, 495, 35, 3).fill(bgColor);

            doc
              .fontSize(11)
              .fillColor("#5E936C")
              .font("Helvetica-Bold")
              .text(t.label, 65, boxY + 12, { continued: false });

            doc
              .fontSize(11)
              .fillColor("#333333")
              .font("Helvetica")
              .text(t.value, 200, boxY + 12);

            doc.y = boxY + 40;
          }
        });
      }

      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);

        doc.rect(0, 792 - 50, 595, 50).fill("#F5F5F5");

        doc
          .strokeColor("#5E936C")
          .lineWidth(2)
          .moveTo(50, 792 - 48)
          .lineTo(545, 792 - 48)
          .stroke();

        doc
          .fontSize(9)
          .fillColor("#666666")
          .font("Helvetica")
          .text(
            `Generated by LeafNest - ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
            50,
            792 - 35,
            { align: "center", width: 495 },
          );

        doc
          .fontSize(9)
          .fillColor("#999999")
          .text(`Page ${i + 1} of ${pageCount}`, 50, 792 - 20, {
            align: "center",
            width: 495,
          });
      }

      doc.end();

      const result = await pdfGenerationPromise;
      return res.status(200).json(result);
    } catch (error) {
      console.error("=== ERROR IN generatePdfAndEmail ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);

      return res.status(500).json({
        error: "Internal server error while generating PDF.",
        details: error.message,
        code: error.code || "UNKNOWN",
      });
    }
  },
);

// =========================================================================
// WEEKLY REPORT COMPLETE FIXED VERSION
// =========================================================================
exports.sendWeeklyReports = onSchedule(
  {
    schedule: "0 9 * * 1",
    timeZone: "Asia/Manila",
  },
  async (event) => {
    try {
      console.log("📊 Starting weekly report generation...");

      const usersSnapshot = await admin.firestore().collection("users").get();
      
      let reportsSent = 0;
      let skippedDisabled = 0;
      let freeUsersSent = 0;
      let premiumUsersSent = 0;
      let errors = 0;
      
      console.log(`✅ Found ${usersSnapshot.size} total users`);

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        const isPremium = userData.isPremium === true;
        
        console.log(`\n--- Processing user: ${userId} (${isPremium ? 'Premium' : 'Free'}) ---`);

        try {
          const settingsRef = admin
            .firestore()
            .doc(`users/${userId}/settings/notifications`);
          const settingsDoc = await settingsRef.get();

          // ✅ FIXED: Use .exists property (not function)
          if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            if (settingsData.weeklyReport === false) {
              console.log(`⏭️ User ${userId}: Weekly report disabled`);
              skippedDisabled++;
              continue;
            }
          }

          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

          const historySnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("history")
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(oneWeekAgo))
            .get();

          const weeklyScans = historySnapshot.docs.map((doc) => doc.data());

          const uniqueSpecies = new Set();
          weeklyScans.forEach((scan) => {
            const speciesId = scan.taxonId || scan.scientificName || scan.plantName || scan.name;
            if (speciesId) uniqueSpecies.add(speciesId);
          });

          const speciesCount = {};
          weeklyScans.forEach((scan) => {
            const name = scan.scientificName || scan.plantName || scan.name;
            if (name) speciesCount[name] = (speciesCount[name] || 0) + 1;
          });

          const topSpecies = Object.entries(speciesCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name, count]) => ({ name, count }));

          const favoritesSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("favorites")
            .get();

          const reportData = {
            totalScans: weeklyScans.length,
            newSpecies: uniqueSpecies.size,
            topSpecies: topSpecies,
            totalFavorites: favoritesSnapshot.size,
            weekStart: oneWeekAgo.toLocaleDateString(),
            weekEnd: new Date().toLocaleDateString(),
          };

          const message = weeklyScans.length > 0
            ? `🎉 This week: ${weeklyScans.length} scan${weeklyScans.length !== 1 ? "s" : ""}, ${uniqueSpecies.size} unique species discovered!`
            : `🌿 No scans this week. Start exploring nature and discover new plants!`;

          await admin.firestore().collection("notifications").add({
            type: "weekly_report",
            recipientId: userId,
            senderId: "system",
            senderUsername: "LeafNest",
            senderAvatar: null,
            message: message,
            reportData: reportData,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

          reportsSent++;
          if (isPremium) {
            premiumUsersSent++;
          } else {
            freeUsersSent++;
          }
        } catch (userError) {
          errors++;
          console.error(`❌ Error processing user ${userId}:`, userError.message);
        }
      }

      console.log(`\n=== WEEKLY REPORT SUMMARY ===`);
      console.log(`Total users: ${usersSnapshot.size}`);
      console.log(`✅ Reports sent: ${reportsSent}`);
      console.log(`   - Free users: ${freeUsersSent}`);
      console.log(`   - Premium users: ${premiumUsersSent}`);
      console.log(`⏭️ Skipped (disabled): ${skippedDisabled}`);
      console.log(`❌ Errors: ${errors}`);

      return null;
    } catch (error) {
      console.error("❌ FATAL ERROR in sendWeeklyReports:", error);
      return null;
    }
  },
);

// =========================================================================
// DAILY TIPS Force redeploy - final
// =========================================================================
exports.sendDailyTips = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Asia/Manila",
  },
  async (event) => {
    try {
      console.log("💡 Starting daily tips distribution...");
      
      const tipsDatabase = [
        { title: "🌞 Perfect Lighting", content: "Take photos in natural daylight for best results. Avoid harsh shadows and direct sunlight. Overcast days provide ideal diffused lighting!" },
        { title: "🔍 Focus on Details", content: "Capture leaves, flowers, or bark patterns clearly. These unique features help our AI identify species more accurately." },
        { title: "📸 Multiple Angles", content: "Try scanning from different angles - leaf shape, flower detail, or bark texture. Each angle provides valuable identification clues." },
        { title: "📚 Keep Learning", content: "Read the full species information after each scan. You'll learn about habitat, characteristics, and conservation status!" },
        { title: "🏆 Build Your Collection", content: "Track your discoveries in your history! Challenge yourself to find new species each week." },
        { title: "🌍 Share Your Finds", content: "Post your interesting discoveries to the public feed to inspire other nature explorers in the community." },
        { title: "✨ Clean Your Lens", content: "A smudged camera lens can affect scan accuracy. Keep it clean for crystal-clear species identification!" },
        { title: "🎯 Steady Your Shot", content: "Hold your device steady or use a stable surface. Clear, focused images lead to better identification results." },
        { title: "🌿 Explore Native Species", content: "Scan local native plants to learn about your region's natural ecosystem and biodiversity." },
        { title: "⏰ Best Scanning Time", content: "Morning hours (7-10 AM) provide the best natural lighting conditions for plant photography." },
        { title: "🍃 Leaf Condition Matters", content: "Scan healthy, mature leaves for best results. Damaged or diseased leaves may affect identification accuracy." },
        { title: "🌺 Flower Power", content: "Flowers are excellent identification features! If a plant is blooming, include the flower in your scan." },
      ];

      const todaysTip = tipsDatabase[Math.floor(Math.random() * tipsDatabase.length)];
      const usersSnapshot = await admin.firestore().collection("users").get();
      
      let tipsSent = 0;
      let skippedDisabled = 0;
      let freeUsersSent = 0;
      let premiumUsersSent = 0;
      let errors = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const isPremium = userData.isPremium === true;

        try {
          const settingsRef = admin.firestore().doc(`users/${userId}/settings/notifications`);
          const settingsDoc = await settingsRef.get();

          // ✅ FIXED: Use .exists property (not function)
          if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            if (settingsData.tips === false) {
              skippedDisabled++;
              continue;
            }
          }

          await admin.firestore().collection("notifications").add({
            type: "tip",
            recipientId: userId,
            senderId: "system",
            senderUsername: "LeafNest",
            senderAvatar: null,
            message: todaysTip.title,
            tipContent: todaysTip.content,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });

          tipsSent++;
          if (isPremium) {
            premiumUsersSent++;
          } else {
            freeUsersSent++;
          }
        } catch (userError) {
          errors++;
          console.error(`❌ Error sending tip to ${userId}:`, userError.message);
        }
      }

      console.log(`\n=== DAILY TIPS SUMMARY ===`);
      console.log(`Tips sent: ${tipsSent} (Free: ${freeUsersSent}, Premium: ${premiumUsersSent})`);
      console.log(`Skipped: ${skippedDisabled}, Errors: ${errors}`);

      return null;
    } catch (error) {
      console.error("❌ FATAL ERROR in sendDailyTips:", error);
      return null;
    }
  },
);

// =========================================================================
// SCAN REMINDERS
// =========================================================================
exports.sendDailyScanReminders = onSchedule(
  {
    schedule: "0 15 * * *",
    timeZone: "Asia/Manila",
  },
  async (event) => {
    try {
      console.log("⏰ Starting daily scan reminders...");
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usersSnapshot = await admin.firestore().collection("users").get();
      
      let remindersSent = 0;
      let alreadyScanned = 0;
      let skippedDisabled = 0;
      let freeUsersSent = 0;
      let premiumUsersSent = 0;
      let errors = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const isPremium = userData.isPremium === true;

        try {
          const settingsRef = admin.firestore().doc(`users/${userId}/settings/notifications`);
          const settingsDoc = await settingsRef.get();

          // ✅ FIXED: Use .exists property (not function)
          if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            if (settingsData.scanReminders === false) {
              skippedDisabled++;
              continue;
            }
          }

          const historySnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("history")
            .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(today))
            .limit(1)
            .get();

          if (historySnapshot.empty) {
            const motivationalMessages = [
              { title: "🌿 Daily Exploration", content: "Haven't explored nature today? Take a quick scan and discover something new!" },
              { title: "🔍 Discover Today", content: "Something amazing awaits! Your daily scan is ready. What will you find?" },
              { title: "🌱 Keep Your Streak", content: "Maintain your scanning habit! Quick scan time - nature is waiting." },
              { title: "📸 Nature Calls", content: "Nature is calling! Time for your daily discovery. Let's explore!" },
              { title: "🌳 Stay Curious", content: "Keep exploring! Your daily scan awaits. What plant will you discover?" },
              { title: "🍃 Daily Challenge", content: "Challenge yourself! Find a new species today and expand your collection." },
            ];

            const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

            await admin.firestore().collection("notifications").add({
              type: "scan_reminder",
              recipientId: userId,
              senderId: "system",
              senderUsername: "LeafNest",
              senderAvatar: null,
              message: randomMessage.title,
              tipContent: randomMessage.content,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            remindersSent++;
            if (isPremium) {
              premiumUsersSent++;
            } else {
              freeUsersSent++;
            }
          } else {
            alreadyScanned++;
          }
        } catch (userError) {
          errors++;
          console.error(`❌ Error processing user ${userId}:`, userError.message);
        }
      }

      console.log(`\n=== SCAN REMINDERS SUMMARY ===`);
      console.log(`Reminders sent: ${remindersSent} (Free: ${freeUsersSent}, Premium: ${premiumUsersSent})`);
      console.log(`Already scanned: ${alreadyScanned}, Skipped: ${skippedDisabled}, Errors: ${errors}`);

      return null;
    } catch (error) {
      console.error("❌ FATAL ERROR in sendDailyScanReminders:", error);
      return null;
    }
  },
);

// =========================================================================
// SUBSCRIPTION EXPIRATION CHECK
// =========================================================================
exports.checkSubscriptionExpiration = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Manila",
  },
  async (event) => {
    try {
      console.log("📅 Checking subscription expirations...");
      const now = new Date();
      const nowTimestamp = now.getTime();

      // ✅ ONLY GET PREMIUM USERS FOR SUBSCRIPTION CHECKS
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("isPremium", "==", true)  // ✅ CORRECT - Only premium users
        .get();
        
      let warningsSent = 0;
      let expiredCount = 0;

      console.log(`✅ Found ${usersSnapshot.size} premium users to check`);

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        try {
          const subDoc = await admin
            .firestore()
            .doc(`users/${userId}/subscription/current`)
            .get();

          if (!subDoc.exists) {
            continue;
          }

          const subData = subDoc.data();

          if (subData.tier !== "premium" || subData.status === "expired") {
            continue;
          }

          const expiryDate = subData.expiryDate?.toDate
            ? subData.expiryDate.toDate()
            : null;
          if (!expiryDate) continue;

          const expiryTimestamp = expiryDate.getTime();
          const daysRemaining = Math.ceil(
            (expiryTimestamp - nowTimestamp) / (1000 * 60 * 60 * 24),
          );

          let shouldNotify = false;
          let message, details;

          if (expiryTimestamp <= nowTimestamp) {
            shouldNotify = true;
            message = "⚠️ Your premium subscription has expired";
            details =
              "Renew now to continue enjoying unlimited scans, no ads, and all premium features!";
            expiredCount++;

            await subDoc.ref.update({
              status: "expired",
              tier: "free",
              lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`⚠️ Subscription expired for user ${userId}`);
          } else if (daysRemaining <= 3 && daysRemaining > 0) {
            shouldNotify = true;
            message = `⏰ Your subscription expires in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}!`;
            details =
              "Don't miss out on premium features! Renew your subscription today to keep exploring without limits.";
          } else if (daysRemaining <= 7 && daysRemaining > 3) {
            shouldNotify = true;
            message = `⏰ Your subscription expires in ${daysRemaining} days`;
            details =
              "Renew soon to maintain uninterrupted access to unlimited scans and premium features.";
          }

          if (shouldNotify) {
            await admin.firestore().collection("notifications").add({
              type: "system",
              recipientId: userId,
              senderId: "system",
              senderUsername: "LeafNest",
              senderAvatar: null,
              message: message,
              systemTitle: "Subscription Alert",
              updateDetails: details,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            warningsSent++;
            console.log(
              `✅ Subscription warning sent to ${userId}: ${daysRemaining} days remaining`,
            );
          }
        } catch (userError) {
          console.error(
            `❌ Error processing subscription for ${userId}:`,
            userError,
          );
        }
      }

      console.log(`\n=== SUBSCRIPTION CHECK SUMMARY ===`);
      console.log(`Premium users checked: ${usersSnapshot.size}`);
      console.log(`✅ Subscription warnings sent: ${warningsSent}`);
      console.log(`⚠️ Subscriptions expired: ${expiredCount}`);
      
      return null;
    } catch (error) {
      console.error("❌ Error checking subscriptions:", error);
      return null;
    }
  },
);

// =========================================================================
// MANUAL SYSTEM UPDATE BROADCAST
// =========================================================================
exports.broadcastSystemUpdate = onCall(async (request) => {
  try {
    const { title, message, details } = request.data;
    if (!title || !message) {
      throw new HttpsError(
        "invalid-argument",
        "Title and message are required",
      );
    }

    const usersSnapshot = await admin.firestore().collection("users").get();
    let notificationsSent = 0;

    const batch = admin.firestore().batch();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      const settingsRef = admin
        .firestore()
        .doc(`users/${userId}/settings/notifications`);
      const settingsDoc = await settingsRef.get();

      if (settingsDoc.exists && settingsDoc.data().systemUpdates === false) {
        continue;
      }

      const notificationRef = admin
        .firestore()
        .collection("notifications")
        .doc();
      batch.set(notificationRef, {
        type: "system",
        recipientId: userId,
        senderId: "system",
        senderUsername: "LeafNest",
        message: message,
        systemTitle: title,
        updateDetails: details || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });

      notificationsSent++;
    }

    await batch.commit();

    console.log(
      `✅ System update broadcast sent: ${notificationsSent} notifications`,
    );
    return { success: true, sent: notificationsSent };
  } catch (error) {
    console.error("❌ Error broadcasting system update:", error);
    throw new HttpsError("internal", error.message);
  }
});

// =========================================================================
// FIXED: AUTOMATIC PREMIUM ACTIVATION - Handles Resubscriptions
// Triggers when payment status changes to "approved"
// =========================================================================
exports.onPaymentApproved = onDocumentUpdated(
  "paymentSubmissions/{submissionId}",
  async (event) => {
    try {
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();
      const submissionId = event.params.submissionId;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 Payment submission updated:', submissionId);
      console.log('Before status:', beforeData.status);
      console.log('After status:', afterData.status);

      // ✅ APPROVED: Activate premium
      if (beforeData.status !== "approved" && afterData.status === "approved") {
        const userId = afterData.userId;
        console.log('✅ Payment APPROVED for user:', userId);
        console.log('📧 User email:', afterData.userEmail);

        try {
          const now = Date.now();
          const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days

          console.log('🗑️ Step 1: Cleaning up old subscription documents...');
          
          // ✅ CRITICAL: Delete ALL old subscription documents (handles resubscription)
          const subscriptionCollectionRef = admin
            .firestore()
            .collection('users')
            .doc(userId)
            .collection('subscription');
          
          const oldDocsSnapshot = await subscriptionCollectionRef.get();
          console.log(`📋 Found ${oldDocsSnapshot.size} old subscription documents`);
          
          const deletePromises = oldDocsSnapshot.docs.map(doc => doc.ref.delete());
          await Promise.all(deletePromises);
          console.log('✅ Deleted all old subscription documents');

          console.log('📦 Step 2: Creating fresh subscription document...');
          
          // ✅ Create fresh subscription data
          const subData = {
            isPremium: true,
            premiumType: 'monthly',
            startDate: admin.firestore.Timestamp.fromMillis(now),
            endDate: admin.firestore.Timestamp.fromMillis(expiryDate),
            status: 'active',
            paymentMethod: 'gcash_manual',
            transactionId: submissionId,
            amount: afterData.amount || 99,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            activatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // ✅ Create new subscription document with consistent ID
          const subscriptionRef = admin
            .firestore()
            .collection('users')
            .doc(userId)
            .collection('subscription')
            .doc('current_subscription');
          
          await subscriptionRef.set(subData, { merge: false });
          console.log('✅ Premium subscription document created');

          console.log('👤 Step 3: Updating main user document...');
          
          // ✅ Update main user document
          await admin.firestore().collection('users').doc(userId).update({
            isPremium: true,
            premiumStatus: 'active',
            premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log('✅ Main user document updated');

          console.log('🔔 Step 4: Sending success notification...');
          
          // ✅ Send success notification
          await admin.firestore().collection('notifications').add({
            recipientId: userId,
            type: 'payment_approved',
            senderId: 'system',
            senderUsername: 'LeafNest',
            senderAvatar: null,
            message: '🎉 Payment Approved!',
            tipContent: 'Your premium subscription is now active. Enjoy unlimited scans, no ads, and exclusive features!',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
          console.log('✅ Success notification sent');

          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('🎉 PREMIUM ACTIVATION COMPLETED SUCCESSFULLY');
          console.log('👤 User ID:', userId);
          console.log('📅 Expiry:', new Date(expiryDate).toLocaleDateString());
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

          return { success: true };
        } catch (activationError) {
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('❌ ERROR ACTIVATING PREMIUM');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('User ID:', userId);
          console.error('Error message:', activationError.message);
          console.error('Error stack:', activationError.stack);
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          return { success: false, error: activationError.message };
        }
      }

      // ❌ REJECTED: Send rejection notification
      if (beforeData.status !== "rejected" && afterData.status === "rejected") {
        const userId = afterData.userId;
        console.log('❌ Payment REJECTED for user:', userId);

        try {
          const rejectionReason = afterData.rejectionReason || 
            'We could not verify your payment. Please submit a clearer screenshot showing the complete transaction details.';

          await admin.firestore().collection('notifications').add({
            recipientId: userId,
            type: 'payment_rejected',
            senderId: 'system',
            senderUsername: 'LeafNest',
            senderAvatar: null,
            message: '❌ Payment Not Verified',
            tipContent: rejectionReason,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
          });
          console.log('✅ Rejection notification sent to:', userId);

          return { success: true };
        } catch (notifError) {
          console.error('❌ Error sending rejection notification:', notifError);
          return { success: false, error: notifError.message };
        }
      }

      console.log('ℹ️ Status unchanged or not approval/rejection');
      return null;
    } catch (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ FATAL ERROR in onPaymentApproved');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return null;
    }
  },
);

// =========================================================================
// AUTO-EXPIRE SUBSCRIPTIONS - Runs daily at 2:00 AM Force redeploy - final
// =========================================================================
exports.checkExpiredPremiumSubscriptions = onSchedule(
  {
    schedule: "0 2 * * *", // 2 AM daily
    timeZone: "Asia/Manila",
  },
  async (event) => {
    try {
      console.log("⏰ Checking for expired premium subscriptions...");
      const now = admin.firestore.Timestamp.now();
      let expiredCount = 0;

      // Get all users with active premium
      const usersSnapshot = await admin
        .firestore()
        .collection("users")
        .where("isPremium", "==", true)
        .get();

      console.log(`Found ${usersSnapshot.size} premium users to check`);

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        try {
          // Check subscription end date
          const subDoc = await admin
            .firestore()
            .doc(`users/${userId}/subscription/premium_sub`)
            .get();

          if (!subDoc.exists) {
            console.log(`⚠️ No subscription doc for premium user: ${userId}`);
            continue;
          }

          const subData = subDoc.data();
          const endDate = subData.endDate;

          // If subscription expired
          if (endDate && endDate.toMillis() < now.toMillis()) {
            console.log(`⏰ Subscription expired for user: ${userId}`);

            // Update main user document
            await admin.firestore().collection("users").doc(userId).update({
              isPremium: false,
              premiumStatus: "expired",
              premiumUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Update subscription document
            await subDoc.ref.update({
              status: "expired",
            });

            // Send expiration notification
            await admin.firestore().collection("notifications").add({
              recipientId: userId,
              type: "subscription_expired",
              senderId: "system",
              senderUsername: "LeafNest",
              senderAvatar: null,
              message: "⏰ Premium Expired",
              tipContent:
                "Your premium subscription has ended. Renew now to continue enjoying unlimited scans and exclusive features!",
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              read: false,
            });

            expiredCount++;
            console.log(`✅ Expired subscription for user: ${userId}`);
          }
        } catch (userError) {
          console.error(`❌ Error checking user ${userId}:`, userError);
        }
      }

      console.log(`✅ Expired ${expiredCount} subscriptions`);
      return null;
    } catch (error) {
      console.error(
        "❌ FATAL ERROR in checkExpiredPremiumSubscriptions:",
        error,
      );
      return null;
    }
  },
);
