import moment from "moment";

export const validateStringField = (value) => {
  return typeof value === "string";
};

export const validateStringStrictField = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const regex = /^[\p{L}]+$/u;

  return regex.test(value);
};

export const validateStringStrictFieldWithNumbers = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const regex = /^[a-zA-Z0-9._]+$/;

  return regex.test(value);
};

export const validateNumberField = (value) => {
  const numberValue = parseFloat(value);

  return !isNaN(numberValue) && typeof numberValue === "number";
};

export const validateBoolField = (value) => {
  if (typeof value === "boolean") {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "true" || trimmedValue === "false";
};

export const validateArrayField = (value) => {
  return Array.isArray(value);
};

export const validateEmailFormatField = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;

  return regex.test(value);
};

export const validateDateField = (value) => {
  return moment(value, moment.ISO_8601, true).isValid();
};

export const validateMobileNumberField = (value) => {
  const regex = /^\d{10}$/;

  return typeof regex.test(value);
};
