import { useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { parseNames } from '../../lib/team';

interface NameInputProps {
  /** 입력창 내용을 이름 목록으로 나눠 넘긴다. 비어 있으면 빈 배열이다. */
  onAdd: (candidates: string[]) => void;
  notice: string;
}

const NameInput = ({ onAdd, notice }: NameInputProps) => {
  const [value, setValue] = useState('');

  const submit = () => {
    onAdd(parseNames(value));
    setValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter는 글자를 확정하는 입력이라 이름 추가로 보면 안 된다.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  };

  // 한 줄 입력칸은 붙여넣은 줄바꿈을 공백으로 바꿔버린다. 메신저에서 한 줄에 한 명씩 복사한
  // 명단이 "철수 영희 민수" 한 명이 되지 않도록, 줄바꿈이 있으면 입력칸을 거치지 않고 바로 추가한다.
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const text = event.clipboardData.getData('text');
    if (!/[\r\n]/.test(text)) return;
    event.preventDefault();
    onAdd(parseNames(text));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="이름 입력 (쉼표로 여러 명 한 번에)"
          aria-label="추가할 이름"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <Button onClick={submit}>
          <Plus className="h-4 w-4" />
          추가
        </Button>
      </div>
      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
    </div>
  );
};

export default NameInput;
