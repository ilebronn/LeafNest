// functions/index.js
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

admin.initializeApp();

// ⚠️ REPLACE THESE WITH YOUR GMAIL CREDENTIALS
const GMAIL_EMAIL = 'leafnest.capstone@gmail.com';
const GMAIL_APP_PASSWORD = 'jrrq fsyw hhvd omvb';

// Configure Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_EMAIL,
    pass: GMAIL_APP_PASSWORD
  }
});

// Cloud Function to send OTP (V2)
exports.sendOTP = onCall(async (request) => {
  const { email, otp } = request.data;

  console.log('=== CLOUD FUNCTION RECEIVED ===');
  console.log('Data:', JSON.stringify(request.data));
  console.log('Email:', email, 'OTP:', otp);

  // Validate input
  if (!email || !otp) {
    console.error('Validation failed');
    throw new HttpsError('invalid-argument', 'Email and OTP are required');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new HttpsError('invalid-argument', 'Invalid email format');
  }

  try {
    // Check if user exists in Firebase Auth
    try {
      await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        throw new HttpsError('not-found', 'No account found with this email address');
      }
    }

    // Store OTP in Firestore with expiration (10 minutes)
    const otpRef = admin.firestore().collection('otps').doc(email);
    await otpRef.set({
      otp: otp,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 10 * 60 * 1000)
      ),
      verified: false
    });

    // Email content
    const mailOptions = {
      from: `"LeafNest" <${GMAIL_EMAIL}>`,
      to: email,
      subject: 'Password Reset - Verification Code',
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
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    console.log('OTP sent successfully to:', email);
    return { success: true, message: 'OTP sent successfully' };

  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new HttpsError('internal', error.message || 'Failed to send OTP email');
  }
});

// Cloud Function to verify OTP (V2)
exports.verifyOTP = onCall(async (request) => {
  const { email, otp } = request.data;

  if (!email || !otp) {
    throw new HttpsError('invalid-argument', 'Email and OTP are required');
  }

  try {
    const otpDoc = await admin.firestore().collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      throw new HttpsError('not-found', 'No OTP found for this email. Please request a new one.');
    }

    const otpData = otpDoc.data();
    const now = admin.firestore.Timestamp.now();

    // Check if OTP is expired
    if (otpData.expiresAt < now) {
      await otpDoc.ref.delete();
      throw new HttpsError('deadline-exceeded', 'OTP has expired. Please request a new one.');
    }

    // Check if OTP matches
    if (otpData.otp !== otp) {
      throw new HttpsError('invalid-argument', 'Invalid OTP. Please try again.');
    }

    // Mark as verified
    await otpDoc.ref.update({ verified: true });

    console.log('OTP verified successfully for:', email);
    return { success: true, message: 'OTP verified successfully' };

  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
});

// Cloud Function to reset password (V2)
exports.resetPassword = onCall(async (request) => {
  const { email, newPassword } = request.data;

  if (!email || !newPassword) {
    throw new HttpsError('invalid-argument', 'Email and new password are required');
  }

  if (newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters long');
  }

  try {
    // Verify OTP was validated
    const otpDoc = await admin.firestore().collection('otps').doc(email).get();
    
    if (!otpDoc.exists || !otpDoc.data().verified) {
      throw new HttpsError('permission-denied', 'Please verify your OTP first');
    }

    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    // Update password
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });

    // Delete the OTP document
    await otpDoc.ref.delete();

    console.log('Password reset successfully for:', email);
    return { success: true, message: 'Password reset successfully' };

  } catch (error) {
    console.error('Error resetting password:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to reset password');
  }
});

// Clean up expired OTPs (V2)
exports.cleanupExpiredOTPs = onSchedule('every 1 hours', async (event) => {
  const now = admin.firestore.Timestamp.now();
  const expiredOTPs = await admin.firestore()
    .collection('otps')
    .where('expiresAt', '<', now)
    .get();

  const batch = admin.firestore().batch();
  expiredOTPs.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${expiredOTPs.size} expired OTPs`);
  return null;
});