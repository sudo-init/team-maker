import { useState, type ReactNode } from 'react';
import { Link2, Pin, Plus, Split, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import Segmented, { type SegmentedOption } from '../../components/Segmented';
import {
  PAIR_KIND_LABEL,
  removeConstraint,
  upsertPair,
  upsertPin,
  type ConstraintChange,
  type Constraints,
  type PairKind
} from '../../lib/constraints';
import { josa } from '../../lib/text';

// 조건 입력줄에서 고르는 조건 종류. 'pin'만 상대가 사람이 아니라 팀이다.
type ConstraintKind = PairKind | 'pin';

const KIND_OPTIONS: { value: ConstraintKind; label: string }[] = [
  { value: 'apart', label: '갈라놓기' },
  { value: 'together', label: '붙여놓기' },
  { value: 'pin', label: '팀 고정' }
];

const KIND_ICON = { apart: Split, together: Link2, pin: Pin };

// 네이티브 select에 Input과 같은 결의 스타일만 입힌다. 이것 하나 때문에 라이브러리를 늘리지 않는다.
// 모바일에서 16px 미만 글자는 iOS가 화면을 확대하므로 기본은 text-base로 둔다.
const SELECT_CLASS =
  'h-10 min-w-0 flex-1 basis-[7.5rem] rounded-lg border border-input bg-card px-2.5 text-base font-medium shadow-xs outline-none sm:flex-none sm:basis-auto sm:min-w-[7.5rem] sm:text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

/** 문장 사이에 끼는 조사·단어. */
const Word = ({ children }: { children: ReactNode }) => (
  <span className="shrink-0 text-sm text-muted-foreground">{children}</span>
);

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

  const kindOptions: SegmentedOption<ConstraintKind>[] = KIND_OPTIONS.map(({ value, label }) => {
    const Icon = KIND_ICON[value];
    return {
      value,
      label: (
        <>
          <Icon />
          {label}
        </>
      ),
      disabled: value !== 'pin' && !canAddPair
    };
  });

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
      `${subject}${josa(subject, '와/과')} ${targetName} 조건을 '${PAIR_KIND_LABEL[kind]}'으로 바꿨어요.`
    );
  };

  const remove = (id: string) => {
    onChange(removeConstraint(rules, id));
    onNotice('');
  };

  const subjectSelect = (
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
  );

  return (
    <div className="space-y-4">
      <Segmented label="조건 종류" options={kindOptions} value={kind} onChange={setKind} />

      {/* 고른 값이 그대로 한 문장으로 읽히게 한다. 예: "철수와 영희는 다른 팀" */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {kind === 'pin' ? (
          <>
            {subjectSelect}
            <Word>{josa(subject, '은/는')}</Word>
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
            <Word>에 고정</Word>
          </>
        ) : (
          <>
            {subjectSelect}
            <Word>{josa(subject, '와/과')}</Word>
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
            <Word>
              {josa(targetName, '은/는')}{' '}
              <strong className="font-semibold text-foreground">{PAIR_KIND_LABEL[kind]}</strong>
            </Word>
          </>
        )}
        <Button variant="outline" onClick={add} disabled={names.length === 0} className="sm:ml-auto">
          <Plus />
          추가
        </Button>
      </div>

      {notice && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notice}
        </p>
      )}

      {rules.pairs.length + rules.pins.length > 0 && (
        <ul className="space-y-2" aria-label="걸려 있는 조건">
          {rules.pairs.map(pair => (
            <RuleItem key={pair.id} kind={pair.kind} onRemove={() => remove(pair.id)}>
              <b className="font-semibold">{pair.a}</b>
              {josa(pair.a, '와/과')} <b className="font-semibold">{pair.b}</b>
              {josa(pair.b, '은/는')} {PAIR_KIND_LABEL[pair.kind]}
            </RuleItem>
          ))}
          {rules.pins.map(pin => (
            <RuleItem key={pin.id} kind="pin" onRemove={() => remove(pin.id)}>
              <b className="font-semibold">{pin.name}</b>
              {josa(pin.name, '은/는')} {pin.teamIndex + 1}팀 고정
            </RuleItem>
          ))}
        </ul>
      )}
    </div>
  );
};

interface RuleItemProps {
  kind: ConstraintKind;
  children: ReactNode;
  onRemove: () => void;
}

const RuleItem = ({ kind, children, onRemove }: RuleItemProps) => {
  const Icon = KIND_ICON[kind];
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card py-1.5 pr-1.5 pl-3 text-sm">
      <Icon aria-hidden className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">{children}</span>
      <button
        type="button"
        aria-label="조건 삭제"
        onClick={onRemove}
        className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <X className="size-4" />
      </button>
    </li>
  );
};

export default ConstraintEditor;
