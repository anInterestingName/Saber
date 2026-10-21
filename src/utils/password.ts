/** 与 system PasswordPolicy 的 BCrypt 输入限制保持一致。 */
export const PASSWORD_MAX_BYTES = 72;

export const validateNewPassword = (
  password: string,
  account: string,
  minLength = 8,
  maxLength = 64,
  maxBytes = PASSWORD_MAX_BYTES
): string | null => {
  if (password.length < minLength || password.length > maxLength) {
    return `密码须为${minLength}至${maxLength}位`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return '密码须包含字母和数字';
  if (password === account) return '密码不能与账号相同';
  if (new TextEncoder().encode(password).length > Math.min(maxBytes, PASSWORD_MAX_BYTES)) {
    return `密码不能超过${Math.min(maxBytes, PASSWORD_MAX_BYTES)}个UTF-8字节`;
  }
  return null;
};
