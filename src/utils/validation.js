// Input validation utilities for authentication forms

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email.trim()),
    error: !emailRegex.test(email.trim())
      ? "Please enter a valid email address"
      : null,
  };
};

export const validatePassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`,
    };
  }

  if (!hasUpperCase || !hasLowerCase) {
    return {
      isValid: false,
      error: "Password must contain both uppercase and lowercase letters",
    };
  }

  if (!hasNumbers) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  return {
    isValid: password === confirmPassword,
    error: password !== confirmPassword ? "Passwords do not match" : null,
  };
};

export const validateFullName = (fullName) => {
  const trimmedName = fullName.trim();
  const minLength = 2;
  const hasValidCharacters = /^[a-zA-Z\s]+$/.test(trimmedName);

  if (trimmedName.length < minLength) {
    return {
      isValid: false,
      error: "Full name must be at least 2 characters long",
    };
  }

  if (!hasValidCharacters) {
    return {
      isValid: false,
      error: "Full name can only contain letters and spaces",
    };
  }

  return {
    isValid: true,
    error: null,
  };
};

// Comprehensive form validation
export const validateSignUpForm = (formData) => {
  const { fullName, email, password, confirmPassword } = formData;

  const nameValidation = validateFullName(fullName);
  if (!nameValidation.isValid) {
    return nameValidation;
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    return passwordValidation;
  }

  const confirmPasswordValidation = validateConfirmPassword(
    password,
    confirmPassword
  );
  if (!confirmPasswordValidation.isValid) {
    return confirmPasswordValidation;
  }

  return {
    isValid: true,
    error: null,
  };
};

export const validateLoginForm = (formData) => {
  const { email, password } = formData;

  if (!email.trim()) {
    return {
      isValid: false,
      error: "Email is required",
    };
  }

  const emailValidation = validateEmail(email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  if (!password.trim()) {
    return {
      isValid: false,
      error: "Password is required",
    };
  }

  return {
    isValid: true,
    error: null,
  };
};
