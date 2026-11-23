let idCounter = 0;

/**
 * 목록 항목의 React key 겸 삭제용 식별자.
 * 시각만 쓰면 같은 밀리초에 두 번 만들 때 겹치므로 카운터를 붙인다.
 */
export function createId(prefix = 'id'): string {
  idCounter += 1;
  return `${prefix}${Date.now().toString(36)}-${idCounter}`;
}
