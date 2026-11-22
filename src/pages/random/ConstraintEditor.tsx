import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  PAIR_KIND_LABEL,
  removeConstraint,
  upsertPair,
  upsertPin,
  type ConstraintChange,
  type Constraints,
  type PairKind
} from '../../lib/constraints';

// 조건 입력줄에서 고르는 조건 종류. 'pin'만 상대가 사람이 아니라 팀이다.
type ConstraintKind = PairKind | 'pin';

const KIND_OPTIONS: { value: ConstraintKind; label: string }[] = [
  { value: 'apart', label: PAIR_KIND_LABEL.apart },
  { value: 'together', label: PAIR_KIND_LABEL.together },
  { value: 'pin', label: '팀 고정' }
];

// 네이티브 select에 Input과 같은 결의 스타일만 입힌다. 이것 하나 때문에 라이브러리를 늘리지 않는다.
const SELECT_CLASS =
  'h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

interface ConstraintEditorProps {
  names: string[];
  teamCount: number;
  rules: Constraints;
  onChange: (next: Constraints) => void;
  notice: string;
  onNotice: (message: string) => void;
}

const ConstraintEditor = ({
  names,
  teamCount,
  rules,
  onChange,
  notice,
  onNotice
}: ConstraintEditorProps) => {
  const [subjectChoice, setSubject] = useState('');
  const [kindChoice, setKind] = useState<ConstraintKind>('apart');
  const [targetChoice, setTargetName] = useState('');
  const [teamChoice, setTargetTeam] = useState(0);

  // 고른 값은 명단·팀 수가 바뀌면 무효가 될 수 있다. 바뀔 때마다 따로 비우는 대신
  // 지금 상태에서 유효한 값만 쓰도록 매번 계산한다.
  const canAddPair = names.length >= 2;
  const subject = names.includes(subjectChoice) ? subjectChoice : '';
  const kind: ConstraintKind = canAddPair ? kindChoice : 'pin';
  const targetName =
    names.includes(targetChoice) && targetChoice !== subject ? targetChoice : '';
  const targetTeam = Math.min(teamChoice, teamCount - 1);
  const ruleCount = rules.pairs.length + rules.pins.length;

  const apply = (
    { constraints, change }: { constraints: Constraints; change: ConstraintChange },
    replacedMessage: string
  ) => {
    if (change === 'duplicate') {
      onNotice('이미 있는 조건이에요.');
      return;
    }
    onChange(constraints);
    onNotice(change === 'replaced' ? replacedMessage : '');
    setSubject('');
    setTargetName('');
  };

  const add = () => {
    if (!subject) {
      onNotice('조건을 걸 사람을 골라주세요.');
      return;
    }

    if (kind === 'pin') {
      apply(
        upsertPin(rules, subject, targetTeam),
        `${subject}의 고정 팀을 ${targetTeam + 1}팀으로 바꿨어요.`
      );
      return;
    }

    if (!targetName) {
      onNotice('서로 다른 두 사람을 골라주세요.');
      return;
    }
    apply(
      upsertPair(rules, kind, subject, targetName),
      `${subject}·${targetName} 조건을 '${PAIR_KIND_LABEL[kind]}'으로 바꿨어요.`
    );
  };

  const remove = (id: string) => {
    onChange(removeConstraint(rules, id));
    onNotice('');
  };

  const clear = () => {
    onChange({ pairs: [], pins: [] });
    onNotice('');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">조건 {ruleCount > 0 && `${ruleCount}개`}</h3>
        {ruleCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clear}>
            조건 비우기
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={SELECT_CLASS}
          aria-label="조건을 걸 사람"
          value={subject}
          disabled={names.length === 0}
          onChange={e => setSubject(e.target.value)}
        >
          <option value="">사람 선택</option>
          {names.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          className={SELECT_CLASS}
          aria-label="조건 종류"
          value={kind}
          onChange={e => setKind(e.target.value as ConstraintKind)}
        >
          {KIND_OPTIONS.map(option => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.value !== 'pin' && !canAddPair}
            >
              {option.label}
            </option>
          ))}
        </select>

        {kind === 'pin' ? (
          <select
            className={SELECT_CLASS}
            aria-label="고정할 팀"
            value={targetTeam}
            onChange={e => setTargetTeam(Number(e.target.value))}
          >
            {Array.from({ length: teamCount }, (_, index) => (
              <option key={index} value={index}>
                {index + 1}팀
              </option>
            ))}
          </select>
        ) : (
          <select
            className={SELECT_CLASS}
            aria-label="조건 상대"
            value={targetName}
            onChange={e => setTargetName(e.target.value)}
          >
            <option value="">상대 선택</option>
            {names
              .filter(name => name !== subject)
              .map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        )}

        <Button variant="outline" onClick={add} disabled={names.length === 0}>
          <Plus className="h-4 w-4" />
          조건 추가
        </Button>
      </div>

      {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

      {ruleCount === 0 ? (
        <p className="text-sm text-muted-foreground">
          꼭 갈라야 하는 사람, 붙여야 하는 사람, 특정 팀에 고정할 사람을 지정할 수 있어요.
        </p>
      ) : (
        <ul className="space-y-2">
          {rules.pairs.map(pair => (
            <RuleItem key={pair.id} onRemove={() => remove(pair.id)}>
              <span className="font-medium">{pair.a}</span>
              <span className="text-muted-foreground"> · </span>
              <span className="font-medium">{pair.b}</span>
              <span className="text-muted-foreground"> → </span>
              {PAIR_KIND_LABEL[pair.kind]}
            </RuleItem>
          ))}
          {rules.pins.map(pin => (
            <RuleItem key={pin.id} onRemove={() => remove(pin.id)}>
              <span className="font-medium">{pin.name}</span>
              <span className="text-muted-foreground"> → </span>
              {pin.teamIndex + 1}팀 고정
            </RuleItem>
          ))}
        </ul>
      )}
    </div>
  );
};

const RuleItem = ({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) => (
  <li className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
    <span>{children}</span>
    <button
      type="button"
      aria-label="조건 삭제"
      onClick={onRemove}
      className="text-muted-foreground hover:text-foreground"
    >
      <X className="h-4 w-4" />
    </button>
  </li>
);

export default ConstraintEditor;
