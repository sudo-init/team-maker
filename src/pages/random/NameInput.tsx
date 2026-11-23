import { useState, type KeyboardEvent } from 'react';
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

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="이름 입력 (쉼표로 여러 명 한 번에)"
          aria-label="추가할 이름"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
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
