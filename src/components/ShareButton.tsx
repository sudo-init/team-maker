import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { Button } from './ui/button';
import { copyText } from '@/lib/clipboard';

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * 휴대폰 공유 시트로 결과 글을 보낸다. 공유 기능이 없는 브라우저(대부분의 데스크톱)에서는 그리지 않는다.
 * 사용자가 시트를 닫은 경우(AbortError)는 조용히 넘기고, 그 밖의 이유로 공유가 안 되면 복사로 대신한다.
 */
const ShareButton = ({ getText }: { getText: () => string }) => {
  const [fallback, setFallback] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (fallback === 'idle') return;
    const timer = window.setTimeout(() => setFallback('idle'), 2500);
    return () => window.clearTimeout(timer);
  }, [fallback]);

  if (!canShare()) return null;

  const share = async () => {
    const text = getText();
    try {
      await navigator.share({ text });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFallback((await copyText(text)) ? 'copied' : 'failed');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={share} aria-live="polite">
      {fallback === 'copied' ? <Check /> : <Share2 />}
      {fallback === 'copied' ? '공유 대신 복사했어요' : fallback === 'failed' ? '공유하지 못했어요' : '공유'}
    </Button>
  );
};

export default ShareButton;
