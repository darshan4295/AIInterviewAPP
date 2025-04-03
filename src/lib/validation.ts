export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex
  const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(email);
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 && // At least 8 characters
    /[A-Z]/.test(password) && // At least one uppercase letter
    /[a-z]/.test(password) && // At least one lowercase letter
    /[0-9]/.test(password) && // At least one number
    /[!@#$%^&*]/.test(password) // At least one special character
  );
}

export function isValidOTP(otp: string): boolean {
  // OTP should be exactly 6 digits
  return /^\d{6}$/.test(otp);
}