const AppError = require('../utils/app-error');

const validate = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    return next(
      new AppError('Validation error.', 400, {
        fields: error.details.map((item) => item.message),
      })
    );
  }

  req[source] = value;
  return next();
};

module.exports = validate;
