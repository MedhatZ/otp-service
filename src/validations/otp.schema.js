const Joi = require('joi');
const {
  normalizePhoneNumber,
  isValidE164PhoneNumber,
} = require('../utils/phone.util');

const phoneNumberSchema = Joi.string()
  .required()
  .custom((value, helpers) => {
    const normalized = normalizePhoneNumber(value);
    if (!isValidE164PhoneNumber(normalized)) {
      return helpers.error('string.e164');
    }
    return normalized;
  }, 'phone number normalization')
  .messages({
    'any.required': 'phoneNumber is required.',
    'string.empty': 'phoneNumber is required.',
    'string.e164':
      'Invalid phone number. Use E.164 format, e.g. +201234567890.',
  });

const sendOtpSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
});

const resendOtpSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
});

const verifyOtpSchema = Joi.object({
  phoneNumber: phoneNumberSchema,
  code: Joi.string().pattern(/^\d{4,10}$/).required().messages({
    'string.pattern.base': 'Invalid code. OTP code must be 4-10 numeric digits.',
    'any.required': 'code is required.',
    'string.empty': 'code is required.',
  }),
});

module.exports = {
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
};
