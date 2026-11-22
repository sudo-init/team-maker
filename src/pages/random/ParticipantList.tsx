import { X } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ParticipantListProps {
  names: string[];
  onRemove: (name: string) => void;
  onClear: () => void;
}

const ParticipantList = ({ names, onRemove, onClear }: ParticipantListProps) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <h3 className="font-bold">참가자 {names.length}명</h3>
      {names.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          전체 삭제
        </Button>
      )}
    </div>
    {names.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        아직 추가된 사람이 없습니다. 이름을 입력해 참가자를 등록해보세요.
      </p>
    ) : (
      <ul className="flex flex-wrap gap-2">
        {names.map(name => (
          <li
            key={name}
            className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
          >
            {name}
            <button
              type="button"
              aria-label={`${name} 삭제`}
              onClick={() => onRemove(name)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default ParticipantList;
