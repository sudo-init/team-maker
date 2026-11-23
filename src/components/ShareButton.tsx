import { Share2 } from 'lucide-react';
import { Button } from './ui/button';

const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** 휴대폰 공유 시트로 결과 글을 보낸다. 공유 기능이 없는 브라우저(대부분의 데스크톱)에서는 그리지 않는다. */
const ShareButton = ({ getText }: { getText: () => string }) => {
  if (!canShare()) return null;

  const share = async () => {
    try {
      await navigator.share({ text: getText() });
    } catch {
      // 사용자가 공유 시트를 닫은 경우도 여기로 온다. 알릴 것이 없다.
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={share}>
      <Share2 />
      공유
    </Button>
  );
};

export default ShareButton;
