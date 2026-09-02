// 입력값에 자동으로 하이픈을 넣어 010-1234-5678 형식으로 만들어준다
export function formatPhoneInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

// 010-1234-5678 형식(010/011/016/017/018/019)인지 검사한다
export function isValidPhone(value) {
  return /^01[016789]-\d{3,4}-\d{4}$/.test(value);
}

// 휴대폰(010-XXXX-XXXX)뿐 아니라 지역번호(02, 031...)·대표번호(1588-XXXX)까지 자동 하이픈 처리
export function formatBusinessPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);

  // 1588-1234 같은 8자리 대표번호
  if (digits.length <= 8 && /^1\d{3}/.test(digits)) {
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
  }

  // 02(서울) 지역번호
  if (digits.startsWith('02')) {
    if (digits.length < 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
  }

  // 010 등 휴대폰, 031/051 등 그 외 지역번호 (0XX-XXX(X)-XXXX)
  if (digits.length < 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
