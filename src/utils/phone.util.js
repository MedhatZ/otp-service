const E164_PHONE_REGEX = /^\+[1-9]\d{7,14}$/;

const normalizePhone = (phoneNumber) => {
  const raw = String(phoneNumber || '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  if (raw.startsWith('+')) return raw;
  return `+${raw}`;
};

const isValidE164PhoneNumber = (phoneNumber) =>
  E164_PHONE_REGEX.test(String(phoneNumber || '').trim());

const maskPhone = (phoneNumber) => {
  const value = String(phoneNumber || '');
  if (value.length < 6) return '***';
  return `${value.slice(0, 3)}****${value.slice(-2)}`;
};

module.exports = {
  normalizePhone,
  normalizePhoneNumber: normalizePhone,
  isValidE164PhoneNumber,
  maskPhone,
};
