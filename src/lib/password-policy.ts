export interface PasswordRuleState {
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSymbol: boolean
}

export const getPasswordRuleState = (password: string): PasswordRuleState => ({
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSymbol: /[^A-Za-z0-9]/.test(password),
})

export const isPasswordStrongEnough = (password: string) => {
  const rules = getPasswordRuleState(password)
  return Object.values(rules).every(Boolean)
}

export const PASSWORD_RULE_HINT = 'Use at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 symbol.'
