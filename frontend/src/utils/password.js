const SPECIAL_CHAR_PATTERN = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/~`;']/;

// 8자 이상 + 영문자 + 특수문자 조합인지 검사하고, 아니면 이유를 문자열로 반환 (통과 시 null)
export function getPasswordError(password) {
  if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.';
  if (!/[A-Za-z]/.test(password)) return '비밀번호에 영문자를 포함해주세요.';
  if (!SPECIAL_CHAR_PATTERN.test(password)) return '비밀번호에 특수문자를 포함해주세요.';
  return null;
}
