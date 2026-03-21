const AppError = require('../utils/app-error');
const asyncHandler = require('../middlewares/async-handler.middleware');
const { sendOtp: sendOtpViaTwilio, verifyOtpCode } = require('../services/twilio.service');
const {
  enforceRateLimit,
  enforceResendCooldown,
} = require('../services/rate-limit.service');
const { getClientIp } = require('../middlewares/global-rate-limit.middleware');
const {
  normalizePhone,
  isValidE164PhoneNumber,
  maskPhone,
} = require('../utils/phone.util');
const logger = require('../config/logger');
const {
  findUserByPhone,
  findUserById,
  createUser,
  setFirstLogin,
  updateLastLogin,
} = require('../services/user.service');
const { generateToken } = require('../services/auth.service');
const { recordUserLogin } = require('../services/login-history.service');

const OTP_PHONE_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.OTP_PHONE_RATE_LIMIT_MAX_REQUESTS || 5
);
const OTP_PHONE_RATE_LIMIT_WINDOW_MS = Number(
  process.env.OTP_PHONE_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000
);
const OTP_IP_RATE_LIMIT_MAX_REQUESTS = Number(
  process.env.OTP_IP_RATE_LIMIT_MAX_REQUESTS || 30
);
const OTP_IP_RATE_LIMIT_WINDOW_MS = Number(
  process.env.OTP_IP_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000
);
const OTP_RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_MS || 30 * 1000);

const enforceOtpLimits = async ({ phoneNumber, ip, action }) => {
  const phoneKeyPrefix = action === 'verify' ? 'otp:verify' : 'otp:send';
  await enforceRateLimit({
    key: `${phoneKeyPrefix}:${phoneNumber}`,
    maxRequests: OTP_PHONE_RATE_LIMIT_MAX_REQUESTS,
    windowMs: OTP_PHONE_RATE_LIMIT_WINDOW_MS,
    message: 'Too many OTP requests for this phone number. Please try again later.',
    details: { scope: 'phone', action },
  });

  await enforceRateLimit({
    key: `otp:ip:${ip}`,
    maxRequests: OTP_IP_RATE_LIMIT_MAX_REQUESTS,
    windowMs: OTP_IP_RATE_LIMIT_WINDOW_MS,
    message: 'Too many OTP requests from this IP. Please try again later.',
    details: { scope: 'ip', action },
  });
};

const sendOtp = asyncHandler(async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  if (!isValidE164PhoneNumber(phoneNumber)) {
    throw new AppError('Invalid phone number. Use E.164 format.', 400);
  }

  const ip = getClientIp(req);
  await enforceOtpLimits({ phoneNumber, ip, action: 'send' });

  const result = await sendOtpViaTwilio(phoneNumber);
  logger.info(
    { phoneNumber: maskPhone(phoneNumber), ip, status: result.status },
    'OTP send attempt'
  );

  return res.status(200).json({
    success: true,
    message: 'OTP sent successfully.',
    data: {
      status: result.status,
      to: result.to,
      note: 'OTP expiration and attempt limits are managed by Twilio Verify service configuration.',
    },
  });
});

const verifyOtp = asyncHandler(async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  const { code, metadata } = req.body;
  if (!isValidE164PhoneNumber(phoneNumber)) {
    throw new AppError('Invalid phone number. Use E.164 format.', 400);
  }

  const ip = getClientIp(req);
  await enforceOtpLimits({ phoneNumber, ip, action: 'verify' });

  const result = await verifyOtpCode(phoneNumber, code);

  if (result.status !== 'approved') {
    logger.warn(
      { phoneNumber: maskPhone(phoneNumber), ip, verifyStatus: result.status },
      'OTP verification failed'
    );

    return res.status(400).json({
      success: false,
      message: 'Invalid or expired OTP',
      data: {
        verifyStatus: result.status,
      },
    });
  }

  logger.info(
    { phoneNumber: maskPhone(phoneNumber), ip, verifyStatus: result.status },
    'OTP verification approved'
  );

  let user = await findUserByPhone(phoneNumber);
  if (!user) {
    user = await createUser(phoneNumber);
  }
  user = await findUserById(user.id);
  const isNewUser = user.firstLoginAt == null;
  if (isNewUser) {
    await setFirstLogin(user.id);
  } else {
    await updateLastLogin(user.id);
  }
  user = await findUserById(user.id);
  const token = await generateToken(user);

  const userAgent = req.headers['user-agent'] || '';
  try {
    await recordUserLogin({
      userId: user.id,
      ip,
      userAgent,
      metadata: metadata != null ? metadata : null,
    });
  } catch (err) {
    logger.error({ err, userId: user.id }, 'Failed to record user login history');
  }

  logger.info(
    { userId: user.id, ip, userAgent },
    'User login recorded'
  );
  logger.info({ userId: user.id, isNewUser }, 'User login event');

  return res.status(200).json({
    success: true,
    message: 'User authenticated',
    data: {
      token,
      user,
    },
  });
});

const resendOtp = asyncHandler(async (req, res) => {
  const phoneNumber = normalizePhone(req.body.phoneNumber);
  if (!isValidE164PhoneNumber(phoneNumber)) {
    throw new AppError('Invalid phone number. Use E.164 format.', 400);
  }

  const ip = getClientIp(req);
  await enforceOtpLimits({ phoneNumber, ip, action: 'resend' });

  await enforceResendCooldown({
    key: `otp:resend:${phoneNumber}`,
    cooldownMs: OTP_RESEND_COOLDOWN_MS,
    message: 'Please wait before requesting another OTP.',
    details: { scope: 'resend' },
  });

  const result = await sendOtpViaTwilio(phoneNumber);
  logger.info(
    { phoneNumber: maskPhone(phoneNumber), ip, status: result.status },
    'OTP resend attempt'
  );

  return res.status(200).json({
    success: true,
    message: 'OTP resent successfully.',
    data: {
      status: result.status,
      to: result.to,
    },
  });
});

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
};
