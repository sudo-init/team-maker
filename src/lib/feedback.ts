/**
 * 피드백 보내기.
 *
 * 받는 곳은 두 가지다.
 * - 전송 주소(FEEDBACK_ENDPOINT)가 설정된 빌드: 그 주소로 JSON을 POST한다. 나중에 만들 공용 수신 서버용이다.
 * - 설정이 없는 빌드: 내용을 미리 채운 GitHub 이슈 작성 화면을 연다. 서버가 필요 없다.
 *
 * 명단·점수·조건 같은 사용자의 입력 데이터는 어떤 경우에도 담지 않는다.
 */

export type FeedbackCategory = 'bug' | 'idea' | 'other';

export const FEEDBACK_CATEGORY_LABEL: Record<FeedbackCategory, string> = {
  bug: '불편·오류',
  idea: '제안',
  other: '기타'
};

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_CONTACT_LENGTH = 100;

/** 문제를 재현하는 데 필요한 최소한의 환경 정보. */
export interface FeedbackDiagnostics {
  /** 피드백을 연 화면의 경로. 검색어·해시는 담지 않는다. */
  path: string;
  /** 빌드한 커밋. */
  appVersion: string;
  userAgent: string;
  /** 예: "system(dark)" */
  theme: string;
  /** 예: "375×812 @3x" */
  viewport: string;
  language: string;
}

export interface FeedbackDraft {
  category: FeedbackCategory;
  message: string;
  /** 답장받을 연락처. 비워도 된다. */
  contact: string;
}

/** 전송 주소로 보내는 JSON의 모양. 수신 서버는 이 모양을 받는다. */
export interface FeedbackPayload {
  app: 'team-maker';
  category: FeedbackCategory;
  message: string;
  contact?: string;
  diagnostics?: FeedbackDiagnostics;
  /** ISO 8601 */
  sentAt: string;
}

/** 보낼 수 없는 이유. 보낼 수 있으면 null. */
export function validateFeedback(draft: FeedbackDraft): string | null {
  const message = draft.message.trim();
  if (!message) return '내용을 적어주세요.';
  if (message.length > MAX_MESSAGE_LENGTH) return `내용은 ${MAX_MESSAGE_LENGTH}자까지 쓸 수 있어요.`;
  if (draft.contact.trim().length > MAX_CONTACT_LENGTH) return '연락처가 너무 길어요.';
  return null;
}

export function buildPayload(
  draft: FeedbackDraft,
  diagnostics: FeedbackDiagnostics | null,
  now = new Date()
): FeedbackPayload {
  const contact = draft.contact.trim();
  return {
    app: 'team-maker',
    category: draft.category,
    message: draft.message.trim(),
    ...(contact && { contact }),
    ...(diagnostics && { diagnostics }),
    sentAt: now.toISOString()
  };
}

/** 사람이 읽는 환경 정보 줄. 대화상자에서 "보내는 정보"로 보여주고, 이슈 본문에도 쓴다. */
export function diagnosticLines(diagnostics: FeedbackDiagnostics): string[] {
  return [
    `화면: ${diagnostics.path}`,
    `버전: ${diagnostics.appVersion}`,
    `화면 모드: ${diagnostics.theme}`,
    `화면 크기: ${diagnostics.viewport}`,
    `언어: ${diagnostics.language}`,
    `브라우저: ${diagnostics.userAgent}`
  ];
}

// GitHub는 너무 긴 주소를 거절한다(414). 한글은 주소에서 한 글자가 9자로 늘어나니 넉넉히 잡는다.
export const MAX_ISSUE_URL_LENGTH = 6000;
const TRUNCATED_NOTE = '\n\n(내용이 길어 앞부분만 담겼어요. 복사해 둔 전체 내용을 붙여넣어 주세요.)';
const TITLE_SNIPPET_LENGTH = 40;

/**
 * .github/ISSUE_TEMPLATE/feedback.yml 양식에 내용을 채운 이슈 작성 주소.
 * 양식 칸은 id(message, diagnostics)로 채운다. 주소가 너무 길면 내용을 잘라내고 truncated로 알린다.
 */
export function buildIssueUrl(
  repoUrl: string,
  payload: FeedbackPayload
): { url: string; truncated: boolean } {
  const firstLine = payload.message.split('\n')[0].trim();
  const snippet =
    firstLine.length > TITLE_SNIPPET_LENGTH ? `${firstLine.slice(0, TITLE_SNIPPET_LENGTH)}…` : firstLine;
  const title = `[${FEEDBACK_CATEGORY_LABEL[payload.category]}] ${snippet}`;
  const diagnostics = payload.diagnostics ? diagnosticLines(payload.diagnostics).join('\n') : '';

  const urlFor = (message: string) => {
    const params = new URLSearchParams({ template: 'feedback.yml', title, message });
    if (diagnostics) params.set('diagnostics', diagnostics);
    return `${repoUrl}/issues/new?${params}`;
  };

  const full = urlFor(payload.message);
  if (full.length <= MAX_ISSUE_URL_LENGTH) return { url: full, truncated: false };

  // 맞을 때까지 줄인다. 내용이 최대 1,000자라 이진 탐색까지는 필요 없지만 반복 횟수는 줄여둔다.
  let low = 0;
  let high = payload.message.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (urlFor(payload.message.slice(0, mid) + TRUNCATED_NOTE).length <= MAX_ISSUE_URL_LENGTH) low = mid;
    else high = mid - 1;
  }
  return { url: urlFor(payload.message.slice(0, low) + TRUNCATED_NOTE), truncated: true };
}

/** 전송 주소로 보낸다. 네트워크 오류·시간 초과·실패 응답은 모두 false. */
export async function postFeedback(
  endpoint: string,
  payload: FeedbackPayload,
  fetchImpl: typeof fetch = fetch
): Promise<boolean> {
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10_000) : undefined
    });
    return response.ok;
  } catch {
    return false;
  }
}
