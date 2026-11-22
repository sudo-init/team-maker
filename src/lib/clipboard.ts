/**
 * 글을 클립보드에 복사한다. 성공하면 true.
 * Clipboard API는 https나 localhost에서만 열리고 브라우저가 막을 수도 있어서,
 * 실패하면 예전 방식(숨긴 textarea + execCommand)으로 한 번 더 시도한다.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyWithTextarea(text);
  }
}

function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
