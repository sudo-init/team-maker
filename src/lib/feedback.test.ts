import { describe, expect, it, vi } from 'vitest';
import {
  MAX_ISSUE_URL_LENGTH,
  MAX_MESSAGE_LENGTH,
  buildIssueUrl,
  buildPayload,
  diagnosticLines,
  postFeedback,
  validateFeedback,
  type FeedbackDiagnostics,
  type FeedbackDraft
} from './feedback';

const REPO = 'https://github.com/owner/repo';

const draft = (overrides: Partial<FeedbackDraft> = {}): FeedbackDraft => ({
  category: 'idea',
  message: '팀 결과를 이미지로 저장하고 싶어요',
  contact: '',
  ...overrides
});

const diagnostics: FeedbackDiagnostics = {
  path: '/team-maker/random',
  appVersion: 'abc1234',
  userAgent: 'TestBrowser/1.0',
  theme: 'system(dark)',
  viewport: '375×812 @3x',
  language: 'ko-KR'
};

const paramsOf = (url: string) => new URL(url).searchParams;

describe('validateFeedback', () => {
  it('내용이 비었으면 막는다', () => {
    expect(validateFeedback(draft({ message: '   \n ' }))).toBe('내용을 적어주세요.');
  });

  it('너무 길면 막는다', () => {
    expect(validateFeedback(draft({ message: '가'.repeat(MAX_MESSAGE_LENGTH + 1) }))).toContain('1000자');
    expect(validateFeedback(draft({ message: '가'.repeat(MAX_MESSAGE_LENGTH) }))).toBeNull();
  });

  it('연락처가 지나치게 길면 막는다', () => {
    expect(validateFeedback(draft({ contact: 'a'.repeat(101) }))).not.toBeNull();
  });
});

describe('buildPayload', () => {
  const now = new Date('2026-11-23T12:00:00Z');

  it('앞뒤 공백을 다듬고, 빈 연락처와 꺼둔 환경 정보는 넣지 않는다', () => {
    const payload = buildPayload(draft({ message: '  좋아요  ', contact: '  ' }), null, now);
    expect(payload).toEqual({
      app: 'team-maker',
      category: 'idea',
      message: '좋아요',
      sentAt: '2026-11-23T12:00:00.000Z'
    });
  });

  it('연락처와 환경 정보가 있으면 담는다', () => {
    const payload = buildPayload(draft({ contact: ' me@example.com ' }), diagnostics, now);
    expect(payload.contact).toBe('me@example.com');
    expect(payload.diagnostics).toEqual(diagnostics);
  });
});

describe('buildIssueUrl', () => {
  it('피드백 양식에 종류·내용·환경 정보를 채운다', () => {
    const { url, truncated } = buildIssueUrl(REPO, buildPayload(draft({ category: 'bug' }), diagnostics));
    const params = paramsOf(url);

    expect(url.startsWith(`${REPO}/issues/new?`)).toBe(true);
    expect(truncated).toBe(false);
    expect(params.get('template')).toBe('feedback.yml');
    expect(params.get('title')).toBe('[불편·오류] 팀 결과를 이미지로 저장하고 싶어요');
    expect(params.get('message')).toBe('팀 결과를 이미지로 저장하고 싶어요');
    expect(params.get('diagnostics')).toBe(diagnosticLines(diagnostics).join('\n'));
  });

  it('제목에는 첫 줄의 앞부분만 쓴다', () => {
    const message = `${'가'.repeat(60)}\n둘째 줄`;
    const title = paramsOf(buildIssueUrl(REPO, buildPayload(draft({ message }), null)).url).get('title');
    expect(title).toBe(`[제안] ${'가'.repeat(40)}…`);
  });

  it('환경 정보를 끄면 그 칸은 비운다', () => {
    const params = paramsOf(buildIssueUrl(REPO, buildPayload(draft(), null)).url);
    expect(params.has('diagnostics')).toBe(false);
  });

  it('주소가 너무 길어지면 내용을 잘라 한도 안에 맞추고 알린다', () => {
    const message = '한글'.repeat(MAX_MESSAGE_LENGTH / 2);
    const { url, truncated } = buildIssueUrl(REPO, buildPayload(draft({ message }), diagnostics));

    expect(truncated).toBe(true);
    expect(url.length).toBeLessThanOrEqual(MAX_ISSUE_URL_LENGTH);
    const sent = paramsOf(url).get('message') ?? '';
    expect(message.startsWith(sent.split('\n\n(')[0])).toBe(true);
    expect(sent).toContain('전체 내용을 붙여넣어');
  });
});

describe('postFeedback', () => {
  const payload = buildPayload(draft(), diagnostics);

  it('JSON으로 POST하고 성공 응답이면 true', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(postFeedback('https://api.example.com/feedback', payload, fetchImpl)).resolves.toBe(true);

    const [endpoint, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(endpoint).toBe('https://api.example.com/feedback');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('실패 응답이나 네트워크 오류면 false', async () => {
    await expect(
      postFeedback('x', payload, async () => new Response(null, { status: 429 }))
    ).resolves.toBe(false);
    await expect(
      postFeedback('x', payload, async () => {
        throw new TypeError('Failed to fetch');
      })
    ).resolves.toBe(false);
  });
});
