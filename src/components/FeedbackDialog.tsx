import { useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, MessageSquareText, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Segmented from './Segmented';
import { APP_VERSION, FEEDBACK_ENDPOINT, REPO_URL } from '@/lib/config';
import { copyText } from '@/lib/clipboard';
import {
  FEEDBACK_CATEGORY_LABEL,
  MAX_CONTACT_LENGTH,
  MAX_MESSAGE_LENGTH,
  buildIssueUrl,
  buildPayload,
  diagnosticLines,
  postFeedback,
  validateFeedback,
  type FeedbackCategory,
  type FeedbackDiagnostics
} from '@/lib/feedback';
import { loadTheme } from '@/lib/theme';

// 수신 서버가 있으면 앱 안에서 바로 보내고, 없으면 GitHub 이슈 작성 화면으로 넘긴다.
const SENDS_DIRECTLY = FEEDBACK_ENDPOINT !== '';
// 실수로 여러 번 누르거나 장난으로 연달아 보내는 것을 막는 간격.
const RESEND_INTERVAL = 30_000;

const CATEGORY_OPTIONS = (Object.keys(FEEDBACK_CATEGORY_LABEL) as FeedbackCategory[]).map(value => ({
  value,
  label: FEEDBACK_CATEGORY_LABEL[value]
}));

/** 문제를 재현하는 데 필요한 환경만 모은다. 입력한 명단 같은 내용은 건드리지 않는다. */
function collectDiagnostics(): FeedbackDiagnostics {
  const dark = document.documentElement.classList.contains('dark');
  return {
    path: window.location.pathname,
    appVersion: APP_VERSION,
    userAgent: navigator.userAgent,
    theme: `${loadTheme()}(${dark ? 'dark' : 'light'})`,
    viewport: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`,
    language: navigator.language
  };
}

type Status =
  /** issueUrl: 보내지 못했을 때 대신 누를 수 있는 GitHub 이슈 작성 링크. */
  | { kind: 'editing'; error: string; issueUrl?: string }
  | { kind: 'sending' }
  | { kind: 'sent'; via: 'endpoint' }
  /** truncated: 주소에 내용을 다 담지 못함. copied: 그때 전체 내용을 클립보드에 복사했는지. */
  | { kind: 'sent'; via: 'github'; truncated: boolean; copied: boolean };

const EDITING: Status = { kind: 'editing', error: '' };

const FeedbackDialog = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastSentAt = useRef(0);
  const titleId = useId();
  const messageId = useId();
  const contactId = useId();

  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  // 대화상자를 열 때 잰다. 열어둔 채 창 크기를 바꿔도 처음 값이면 충분하다.
  const [diagnostics, setDiagnostics] = useState<FeedbackDiagnostics | null>(null);
  const [status, setStatus] = useState<Status>(EDITING);
  // 봇만 채우는 숨은 칸. 채워져 있으면 보낸 척만 한다.
  const [honeypot, setHoneypot] = useState('');

  // 고치기 시작하면 이전 오류 문구는 지운다.
  const edited = () => {
    if (status.kind === 'editing' && status.error) setStatus(EDITING);
  };

  // 보낸 뒤에는 다음에 열 때 다시 쓰는 화면으로 돌아간다. 쓰던 내용은 수신 서버가 받았다고 확인한
  // 경우에만 지운다. GitHub로 넘긴 경우는 실제로 제출했는지 알 수 없어서 남겨둔다(다시 열어 복사할 수 있게).
  const settle = () => {
    if (status.kind !== 'sent') return;
    if (status.via === 'endpoint') {
      setMessage('');
      setContact('');
      setConsent(false);
    }
    setStatus(EDITING);
  };

  const open = () => {
    settle();
    setDiagnostics(collectDiagnostics());
    dialogRef.current?.showModal();
  };

  const sending = status.kind === 'sending';

  // 보내는 중에 닫으면 결과를 알릴 곳이 없어진다. 응답이 올 때까지(최대 10초) 닫지 못하게 한다.
  const close = () => {
    if (!sending) dialogRef.current?.close();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const draft = { category, message, contact: SENDS_DIRECTLY ? contact : '' };
    const invalid = validateFeedback(draft);
    if (invalid) {
      setStatus({ kind: 'editing', error: invalid });
      return;
    }
    if (draft.contact.trim() && !consent) {
      setStatus({ kind: 'editing', error: '연락처를 남기려면 개인정보 수집에 동의해주세요.' });
      return;
    }

    const payload = buildPayload(draft, includeDiagnostics ? diagnostics : null);

    if (!SENDS_DIRECTLY) {
      const { url, truncated } = buildIssueUrl(REPO_URL, payload);
      // 브라우저는 클릭 처리 중에 바로 연 창만 허용한다. await를 거친 뒤에 열면 팝업으로 막힌다.
      // 그래서 복사(주소에 다 담지 못했을 때 전체 내용을 붙여넣을 수 있게)도 창을 열기 전에 시작만 해둔다.
      const copying = truncated ? copyText(payload.message) : Promise.resolve(true);
      // noopener를 주면 성공해도 null이 돌아와 막혔는지 알 수 없다. 대신 열린 뒤 바로 연결을 끊는다.
      const popup = window.open(url, '_blank');
      if (!popup) {
        setStatus({
          kind: 'editing',
          error: '새 창이 막혀서 GitHub를 열지 못했어요. 아래 링크를 눌러 이어서 보내주세요.',
          issueUrl: url
        });
        return;
      }
      popup.opener = null;
      setStatus({ kind: 'sent', via: 'github', truncated, copied: await copying });
      return;
    }

    if (Date.now() - lastSentAt.current < RESEND_INTERVAL) {
      setStatus({ kind: 'editing', error: '방금 보내주셨어요. 잠시 후에 다시 보내주세요.' });
      return;
    }
    if (honeypot) {
      setStatus({ kind: 'sent', via: 'endpoint' });
      return;
    }

    setStatus({ kind: 'sending' });
    const ok = await postFeedback(FEEDBACK_ENDPOINT, payload);
    if (ok) {
      lastSentAt.current = Date.now();
      setStatus({ kind: 'sent', via: 'endpoint' });
    } else {
      setStatus({
        kind: 'editing',
        error: '지금은 보내지 못했어요. 잠시 후 다시 보내거나 GitHub에 남겨주세요.',
        // GitHub 이슈는 공개라 연락처는 빼고 넘긴다.
        issueUrl: buildIssueUrl(REPO_URL, buildPayload({ ...draft, contact: '' }, null)).url
      });
    }
  };

  const error = status.kind === 'editing' ? status.error : '';
  const fallbackUrl = status.kind === 'editing' ? status.issueUrl : undefined;

  return (
    <>
      <Button variant="ghost" onClick={open} aria-haspopup="dialog" className="px-2.5 sm:px-3">
        <MessageSquareText className="size-5 sm:size-4" />
        <span className="sr-only sm:not-sr-only">피드백</span>
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={event => {
          // Esc로 닫기. 보내는 중이면 막는다.
          if (sending) event.preventDefault();
        }}
        // 바깥 어두운 곳을 누르면 닫는다. 대화상자 안쪽 클릭은 target이 안쪽 요소다.
        onClick={event => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-[2px]"
      >
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id={titleId} className="text-lg font-bold">
                피드백 보내기
              </h2>
              <p className="text-sm text-muted-foreground">
                불편했던 점, 있었으면 하는 기능을 알려주세요. 하나하나 읽고 다음 개선에 반영해요.
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={close}
              disabled={sending}
              aria-label="닫기"
              className="-mt-1 -mr-2 shrink-0"
            >
              <X />
            </Button>
          </div>

          {status.kind === 'sent' ? (
            <div className="space-y-5 py-4 text-center">
              <CheckCircle2 aria-hidden className="mx-auto size-12 text-primary" />
              <div className="space-y-1.5" role="status">
                {status.via === 'endpoint' ? (
                  <>
                    <p className="font-semibold">보냈어요. 고마워요!</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.trim() ? '답이 필요하면 남겨주신 연락처로 알려드릴게요.' : '보내주신 내용은 꼭 읽어볼게요.'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">GitHub 창에서 마무리해주세요</p>
                    <p className="text-sm text-muted-foreground">
                      새 창의 내용을 확인하고 <b>Create</b>를 누르면 접수돼요.
                      {status.truncated &&
                        (status.copied
                          ? ' 내용이 길어 일부만 채워졌어요. 전체 내용을 복사해 두었으니 붙여넣어 주세요.'
                          : ' 내용이 길어 일부만 채워졌어요. 피드백 창을 다시 열면 쓰던 내용이 남아 있으니 나머지를 복사해 붙여넣어 주세요.')}
                    </p>
                  </>
                )}
              </div>
              <Button onClick={close} className="w-full">
                닫기
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5" noValidate>
              <Segmented label="피드백 종류" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />

              <div className="space-y-1.5">
                <label htmlFor={messageId} className="text-sm font-semibold">
                  내용
                </label>
                <textarea
                  id={messageId}
                  required
                  rows={5}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={message}
                  onChange={e => {
                    setMessage(e.target.value);
                    edited();
                  }}
                  placeholder={
                    category === 'bug'
                      ? '어떤 화면에서 무엇을 했더니 어떻게 됐는지 적어주시면 빨리 고칠 수 있어요.'
                      : '자유롭게 적어주세요.'
                  }
                  className="block w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm dark:bg-input/30"
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">
                  {message.length} / {MAX_MESSAGE_LENGTH}
                </p>
              </div>

              {SENDS_DIRECTLY && (
                <div className="space-y-2">
                  <label htmlFor={contactId} className="text-sm font-semibold">
                    연락처 <span className="font-normal text-muted-foreground">(선택)</span>
                  </label>
                  <Input
                    id={contactId}
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={MAX_CONTACT_LENGTH}
                    placeholder="답장을 받을 이메일 등"
                    value={contact}
                    onChange={e => {
                      setContact(e.target.value);
                      edited();
                    }}
                  />
                  {contact.trim() && (
                    <label className="flex items-start gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={e => {
                          setConsent(e.target.checked);
                          edited();
                        }}
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                      />
                      <span>
                        [선택] 개인정보 수집·이용 동의 — 수집 항목: 연락처 · 목적: 피드백 답변 · 보관: 답변
                        후 지체 없이 파기. 동의하지 않아도 연락처 없이 피드백을 보낼 수 있어요.
                      </span>
                    </label>
                  )}
                  {/* 사람 눈에는 보이지 않는 칸. 자동으로 폼을 채우는 봇만 여기에 값을 넣는다. */}
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden
                    value={honeypot}
                    onChange={e => setHoneypot(e.target.value)}
                    className="absolute -left-[9999px] size-px opacity-0"
                  />
                </div>
              )}

              <div className="rounded-lg border p-3 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={e => setIncludeDiagnostics(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  사용 환경 정보 함께 보내기
                </label>
                <details className="mt-1.5 pl-6 text-xs text-muted-foreground">
                  <summary className="cursor-pointer select-none">무엇을 보내나요?</summary>
                  <ul className="mt-2 space-y-0.5 break-all">
                    {diagnostics && diagnosticLines(diagnostics).map(line => <li key={line}>{line}</li>)}
                  </ul>
                  <p className="mt-2">입력한 명단·점수·조건·기록은 보내지 않아요.</p>
                </details>
              </div>

              {error && (
                <div role="alert" className="space-y-1 text-sm text-destructive">
                  <p>{error}</p>
                  {fallbackUrl && (
                    <a
                      href={fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                    >
                      GitHub에 남기기 <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Button type="submit" size="lg" className="w-full" disabled={sending}>
                  {sending ? (
                    '보내는 중…'
                  ) : SENDS_DIRECTLY ? (
                    '보내기'
                  ) : (
                    <>
                      GitHub에서 이어서 보내기 <ExternalLink />
                    </>
                  )}
                </Button>
                {!SENDS_DIRECTLY && (
                  <p className="text-center text-xs text-muted-foreground">
                    내용이 채워진 GitHub 이슈 작성 화면이 새 창으로 열려요. GitHub 계정이 필요하고, 올린 내용은
                    공개돼요.
                  </p>
                )}
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
};

export default FeedbackDialog;
