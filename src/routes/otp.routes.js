const express = require('express');
const {
  sendOtp,
  verifyOtp,
  resendOtp,
} = require('../controllers/otp.controller');
const validate = require('../middlewares/validate.middleware');
const {
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
} = require('../validations/otp.schema');

const router = express.Router();

router.post('/send', validate(sendOtpSchema), sendOtp);
router.post('/verify', validate(verifyOtpSchema), verifyOtp);
router.post('/resend', validate(resendOtpSchema), resendOtp);

module.exports = router;
