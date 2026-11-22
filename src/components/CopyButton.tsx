import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { copyText } from '@/lib/clipboard';

type CopyState = 'idle' | 'copied' | 'failed';

const LABEL: Record<CopyState, string> = {
  idle: '결과 복사',
  copied: '복사했어요',
  failed: '복사하지 못했어요'
};

/** 누르면 getText()의 글을 복사하고 잠깐 결과를 보여준다. */
const CopyButton = ({ getText }: { getText: () => string }) => {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    setState((await copyText(getText())) ? 'copied' : 'failed');
  };

  return (
    <Button variant="outline" size="sm" onClick={copy} aria-live="polite">
      {state === 'copied' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {LABEL[state]}
    </Button>
  );
};

export default CopyButton;
