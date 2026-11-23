/**
 * localStorage 접근을 한곳에 모은다.
 *
 * 저장소는 사용자가 손으로 고치거나, 예전 버전이 다른 모양으로 남겼거나, 사생활 보호 모드에서
 * 아예 막혀 있을 수 있다. 그래서 읽을 때는 항상 검증 함수를 거치고, 어떤 경우에도 예외를
 * 화면까지 올려 보내지 않는다.
 */

/**
 * key에 저장된 JSON을 읽어 parse로 검증한다.
 * 값이 없으면 null, 깨졌거나 모양이 다르면 지우고 null을 돌려준다.
 */
export function readStored<T>(key: string, parse: (value: unknown) => T | null): T | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    // 저장소 자체를 못 쓰는 환경이다. 지울 수도 없으니 그냥 없는 셈 친다.
    return null;
  }
  if (raw === null) return null;

  let parsed: T | null = null;
  try {
    parsed = parse(JSON.parse(raw));
  } catch {
    parsed = null;
  }

  if (parsed === null) removeStored(key);
  return parsed;
}

/** 저장에 실패해도(용량 초과, 차단 등) 지금 화면은 그대로 쓸 수 있으므로 조용히 넘어간다. */
export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 위 설명과 같다.
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // 위 설명과 같다.
  }
}

/** 문자열 배열 검증. 앞뒤 공백을 지우고 빈 값과 중복을 걸러낸다. 하나라도 문자열이 아니면 null. */
export function parseStoredNames(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) return null;
  return [...new Set(value.map(name => name.trim()).filter(Boolean))];
}
