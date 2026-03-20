const twilio = require('twilio');
const AppError = require('../utils/app-error');
const logger = require('../config/logger');
const { maskPhone } = require('../utils/phone.util');

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VERIFY_SERVICE_SID,
} = process.env;

const TWILIO_TIMEOUT_MS = Number(process.env.TWILIO_TIMEOUT_MS || 8000);

const twilioClient =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    : null;

const assertTwilioConfig = () => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new AppError(
      'Twilio configuration is missing. Please check environment variables.',
      500
    );
  }
};

const withTimeout = async (promise, timeoutMs, message) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new AppError(message, 504)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const mapTwilioError = (error, operation) => {
  const code = Number(error.code);

  // Common Verify-related client errors
  if ([60200, 21211].includes(code)) {
    return new AppError('Invalid phone number format or destination.', 400, {
      provider: 'twilio',
      code,
      operation,
    });
  }

  if ([20429, 60203].includes(code) || error.status === 429) {
    return new AppError('Too many OTP requests. Please try again later.', 429, {
      provider: 'twilio',
      code,
      operation,
    });
  }

  if ([60202, 60203, 20404].includes(code) && operation === 'verify') {
    return new AppError('Invalid or expired OTP', 400, {
      provider: 'twilio',
      code,
      operation,
    });
  }

  return new AppError(
    operation === 'send'
      ? 'Unable to send OTP right now. Please try again.'
      : 'Unable to verify OTP right now. Please try again.',
    502,
    {
      provider: 'twilio',
      code,
      operation,
      moreInfo: error.moreInfo,
    }
  );
};

const sendOtp = async (phoneNumber) => {
  assertTwilioConfig();
  try {
    const verification = await withTimeout(
      twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verifications.create({
          to: phoneNumber,
          channel: 'sms',
        }),
      TWILIO_TIMEOUT_MS,
      'OTP provider timeout while sending code.'
    );

    return {
      sid: verification.sid,
      to: verification.to,
      status: verification.status,
      channel: verification.channel,
    };
  } catch (error) {
    logger.error(
      {
        phoneNumber: maskPhone(phoneNumber),
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      },
      'Twilio send OTP failed'
    );
    if (error instanceof AppError) throw error;
    throw mapTwilioError(error, 'send');
  }
};

const verifyOtpCode = async (phoneNumber, code) => {
  assertTwilioConfig();
  try {
    const verificationCheck = await withTimeout(
      twilioClient.verify.v2
        .services(TWILIO_VERIFY_SERVICE_SID)
        .verificationChecks.create({
          to: phoneNumber,
          code,
        }),
      TWILIO_TIMEOUT_MS,
      'OTP provider timeout while verifying code.'
    );

    return {
      sid: verificationCheck.sid,
      status: verificationCheck.status,
      valid: verificationCheck.valid,
      to: verificationCheck.to,
    };
  } catch (error) {
    logger.error(
      {
        phoneNumber: maskPhone(phoneNumber),
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo,
      },
      'Twilio verify OTP failed'
    );
    if (error instanceof AppError) throw error;
    throw mapTwilioError(error, 'verify');
  }
};

module.exports = {
  sendOtp,
  verifyOtpCode,
};
