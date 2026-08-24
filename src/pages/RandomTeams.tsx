import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Minus, Plus, Shuffle, Users, X } from 'lucide-react';
import { parseNames, splitIntoTeams } from '../lib/team';
import {
  EMPTY_CONSTRAINTS,
  PAIR_KIND_LABEL,
  createConstraintId,
  isSamePair,
  parseStoredConstraints,
  pruneConstraints,
  type Constraints,
  type PairKind
} from '../lib/constraints';

const NAMES_STORAGE_KEY = 'randomTeamNames';
const CONSTRAINTS_STORAGE_KEY = 'randomTeamConstraints';
const TEAM_COUNT_STORAGE_KEY = 'randomTeamCount';

const MIN_TEAM_COUNT = 2;

// 조건 입력줄에서 고르는 조건 종류. 'pin'만 상대가 사람이 아니라 팀이다.
type ConstraintKind = PairKind | 'pin';

const CONSTRAINT_KIND_OPTIONS: { value: ConstraintKind; label: string }[] = [
  { value: 'apart', label: PAIR_KIND_LABEL.apart },
  { value: 'together', label: PAIR_KIND_LABEL.together },
  { value: 'pin', label: '팀 고정' }
];

// 네이티브 select에 Input과 같은 결의 스타일만 입힌다. 이것 하나 때문에 라이브러리를 늘리지 않는다.
const SELECT_CLASS =
  'h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]';

// 팀 카드에 순서대로 입히는 색. 팀이 많아지면 처음부터 다시 돌려 쓴다.
const TEAM_STYLES = [
  { title: 'text-blue-600', item: 'bg-blue-50' },
  { title: 'text-red-600', item: 'bg-red-50' },
  { title: 'text-green-600', item: 'bg-green-50' },
  { title: 'text-amber-600', item: 'bg-amber-50' },
  { title: 'text-purple-600', item: 'bg-purple-50' },
  { title: 'text-teal-600', item: 'bg-teal-50' }
];

const RandomTeams = () => {
  const [names, setNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState('');
  const [teamCount, setTeamCount] = useState(MIN_TEAM_COUNT);
  const [teams, setTeams] = useState<string[][]>([]);
  // 안내는 관련된 입력 옆에 붙여둔다. 한곳에 모으면 화면 아래에서 조건을 만지다가 놓친다.
  const [nameNotice, setNameNotice] = useState('');
  const [ruleNotice, setRuleNotice] = useState('');
  const [splitError, setSplitError] = useState('');

  const [rules, setRules] = useState<Constraints>(EMPTY_CONSTRAINTS);
  const [subject, setSubject] = useState('');
  const [kind, setKind] = useState<ConstraintKind>('apart');
  const [targetName, setTargetName] = useState('');
  const [targetTeam, setTargetTeam] = useState(0);

  useEffect(() => {
    // 매번 같은 멤버와 조건을 다시 입력하지 않도록 불러온다.
    // 저장된 값이 깨져 있어도 화면이 죽지 않도록 파싱 실패는 삼킨다.
    const loadedNames = readStoredNames() ?? [];
    // 팀 개수까지 복원해야 "3팀 고정" 같은 조건이 살아남는다.
    const loadedTeamCount = Math.min(
      readStoredTeamCount() ?? MIN_TEAM_COUNT,
      Math.max(MIN_TEAM_COUNT, loadedNames.length)
    );
    const loadedRules = readStoredConstraints() ?? EMPTY_CONSTRAINTS;

    setNames(loadedNames);
    setTeamCount(loadedTeamCount);
    // 이름이 지워진 뒤 조건만 남는 일이 없도록 불러온 값 기준으로 한 번 정리한다.
    setRules(pruneConstraints(loadedRules, loadedNames, loadedTeamCount));
  }, []);

  const saveNames = (next: string[]) => {
    try {
      localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 저장에 실패해도 이번 세션의 팀 나누기는 그대로 쓸 수 있다.
    }
  };

  const saveConstraints = (next: Constraints) => {
    try {
      localStorage.setItem(CONSTRAINTS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // 위와 같다.
    }
  };

  const saveTeamCount = (next: number) => {
    try {
      localStorage.setItem(TEAM_COUNT_STORAGE_KEY, String(next));
    } catch {
      // 위와 같다.
    }
  };

  /**
   * 참가자 목록 변경은 조건·팀 수와 함께 움직인다.
   * 사람이 빠지면 그 사람이 낀 조건도 같이 지워야 팀 짜기가 조용히 실패하지 않는다.
   */
  const updateNames = (next: string[]) => {
    // 인원이 팀 수보다 적어지면 팀 수도 같이 내려준다.
    const nextTeamCount = Math.min(teamCount, Math.max(MIN_TEAM_COUNT, next.length));
    const nextRules = pruneConstraints(rules, next, nextTeamCount);

    setNames(next);
    setTeamCount(nextTeamCount);
    setRules(nextRules);
    // 멤버가 바뀐 뒤에도 옛 결과가 남아 있으면 지금 멤버로 짠 팀처럼 보인다.
    setTeams([]);
    // 실패 이유도 지금 상태와 맞지 않으니 함께 지운다.
    setSplitError('');

    saveNames(next);
    saveConstraints(nextRules);
    saveTeamCount(nextTeamCount);
  };

  const updateConstraints = (next: Constraints) => {
    setRules(next);
    setTeams([]);
    setSplitError('');
    saveConstraints(next);
  };

  const addNames = () => {
    const candidates = parseNames(nameInput);
    if (candidates.length === 0) {
      setNameNotice('이름을 입력해주세요.');
      return;
    }

    const duplicated: string[] = [];
    const next = [...names];

    candidates.forEach(name => {
      // 같은 이름이 두 번 들어가면 결과에서 누가 누군지 구분할 수 없다.
      if (next.includes(name)) {
        duplicated.push(name);
        return;
      }
      next.push(name);
    });

    if (next.length > names.length) updateNames(next);
    setNameInput('');
    setNameNotice(
      duplicated.length > 0 ? `이미 있는 이름은 건너뛰었어요: ${duplicated.join(', ')}` : ''
    );
  };

  const removeName = (target: string) => {
    updateNames(names.filter(name => name !== target));
    if (subject === target) setSubject('');
    if (targetName === target) setTargetName('');
    setNameNotice('');
    setRuleNotice('');
  };

  const clearNames = () => {
    updateNames([]);
    setNameInput('');
    setSubject('');
    setTargetName('');
    setNameNotice('');
    setRuleNotice('');
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter는 글자를 확정하는 입력이라 이름 추가로 보면 안 된다.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    addNames();
  };

  const changeTeamCount = (delta: number) => {
    // 팀보다 사람이 적으면 빈 팀이 생기므로 인원 수를 상한으로 둔다.
    const max = Math.max(MIN_TEAM_COUNT, names.length);
    const next = Math.min(max, Math.max(MIN_TEAM_COUNT, teamCount + delta));
    if (next === teamCount) return;

    setTeamCount(next);
    setTeams([]);
    saveTeamCount(next);
    if (targetTeam >= next) setTargetTeam(next - 1);

    // 팀이 줄면 사라진 팀을 가리키는 고정 조건도 함께 정리한다.
    const nextRules = pruneConstraints(rules, names, next);
    if (nextRules.pins.length !== rules.pins.length) {
      setRules(nextRules);
      saveConstraints(nextRules);
      setRuleNotice('없어진 팀에 걸려 있던 고정 조건을 정리했어요.');
    }
  };

  const addConstraint = () => {
    if (!subject) {
      setRuleNotice('조건을 걸 사람을 골라주세요.');
      return;
    }

    if (kind === 'pin') {
      const existing = rules.pins.find(pin => pin.name === subject);
      if (existing?.teamIndex === targetTeam) {
        setRuleNotice('이미 있는 조건이에요.');
        return;
      }

      updateConstraints({
        pairs: rules.pairs,
        // 한 사람이 두 팀에 고정될 수는 없으니 기존 고정은 새 조건으로 갈아끼운다.
        pins: [
          ...rules.pins.filter(pin => pin.name !== subject),
          { id: createConstraintId(), name: subject, teamIndex: targetTeam }
        ]
      });
      setRuleNotice(existing ? `${subject}의 고정 팀을 ${targetTeam + 1}팀으로 바꿨어요.` : '');
      setSubject('');
      return;
    }

    if (!targetName || targetName === subject) {
      setRuleNotice('서로 다른 두 사람을 골라주세요.');
      return;
    }

    const existing = rules.pairs.find(pair => isSamePair(pair, subject, targetName));
    if (existing?.kind === kind) {
      setRuleNotice('이미 있는 조건이에요.');
      return;
    }

    updateConstraints({
      // 같은 짝에 '같은 팀'과 '다른 팀'이 동시에 걸리면 모순이라 새 조건으로 갈아끼운다.
      pairs: [
        ...rules.pairs.filter(pair => !isSamePair(pair, subject, targetName)),
        { id: createConstraintId(), kind, a: subject, b: targetName }
      ],
      pins: rules.pins
    });
    setRuleNotice(
      existing ? `${subject}·${targetName} 조건을 '${PAIR_KIND_LABEL[kind]}'으로 바꿨어요.` : ''
    );
    setSubject('');
    setTargetName('');
  };

  const removePair = (id: string) => {
    updateConstraints({ pairs: rules.pairs.filter(pair => pair.id !== id), pins: rules.pins });
    setRuleNotice('');
  };

  const removePin = (id: string) => {
    updateConstraints({ pairs: rules.pairs, pins: rules.pins.filter(pin => pin.id !== id) });
    setRuleNotice('');
  };

  const clearConstraints = () => {
    updateConstraints(EMPTY_CONSTRAINTS);
    setRuleNotice('');
  };

  const makeTeams = () => {
    const result = splitIntoTeams(names, teamCount, rules);
    if (!result.ok) {
      // 조건이 서로 부딪히면 왜 안 되는지 그대로 보여준다.
      setTeams([]);
      setSplitError(result.reason);
      return;
    }

    setTeams(result.teams);
    setSplitError('');
  };

  const ruleCount = rules.pairs.length + rules.pins.length;
  const canAddPair = names.length >= 2;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            이름으로 랜덤 팀 짜기
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="이름 입력 (쉼표로 여러 명 한 번에)"
                  value={nameInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setNameInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                />
                <Button onClick={addNames}>
                  <Plus className="h-4 w-4" />
                  추가
                </Button>
              </div>
              {nameNotice && <p className="text-sm text-muted-foreground">{nameNotice}</p>}
            </div>

            {/* 참가자 목록 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">참가자 {names.length}명</h3>
                {names.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearNames}>
                    전체 삭제
                  </Button>
                )}
              </div>
              {names.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  아직 추가된 사람이 없습니다. 이름을 입력해 참가자를 등록해보세요.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {names.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                    >
                      {name}
                      <button
                        type="button"
                        aria-label={`${name} 삭제`}
                        onClick={() => removeName(name)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 팀 개수 */}
            <div className="flex items-center justify-between">
              <span className="font-bold">팀 개수</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="팀 개수 줄이기"
                  onClick={() => changeTeamCount(-1)}
                  disabled={teamCount <= MIN_TEAM_COUNT}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-lg font-bold">{teamCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="팀 개수 늘리기"
                  onClick={() => changeTeamCount(1)}
                  disabled={teamCount >= names.length}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 조건 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">조건 {ruleCount > 0 && `${ruleCount}개`}</h3>
                {ruleCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearConstraints}>
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
                  onChange={e => {
                    setSubject(e.target.value);
                    // 상대로 골라둔 사람을 본인으로 다시 고르면 상대 선택을 비운다.
                    if (e.target.value === targetName) setTargetName('');
                  }}
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
                  {CONSTRAINT_KIND_OPTIONS.map(option => (
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
                    disabled={!canAddPair}
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

                <Button variant="outline" onClick={addConstraint} disabled={names.length === 0}>
                  <Plus className="h-4 w-4" />
                  조건 추가
                </Button>
              </div>

              {ruleNotice && <p className="text-sm text-muted-foreground">{ruleNotice}</p>}

              {ruleCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  꼭 갈라야 하는 사람, 붙여야 하는 사람, 특정 팀에 고정할 사람을 지정할 수 있어요.
                </p>
              ) : (
                <div className="space-y-2">
                  {rules.pairs.map(pair => (
                    <div
                      key={pair.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{pair.a}</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="font-medium">{pair.b}</span>
                        <span className="text-muted-foreground"> → </span>
                        {PAIR_KIND_LABEL[pair.kind]}
                      </span>
                      <button
                        type="button"
                        aria-label="조건 삭제"
                        onClick={() => removePair(pair.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {rules.pins.map(pin => (
                    <div
                      key={pin.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium">{pin.name}</span>
                        <span className="text-muted-foreground"> → </span>
                        {pin.teamIndex + 1}팀 고정
                      </span>
                      <button
                        type="button"
                        aria-label="조건 삭제"
                        onClick={() => removePin(pin.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={makeTeams} className="w-full" disabled={names.length < teamCount}>
                <Shuffle className="mr-2 h-4 w-4" />
                {teams.length > 0 ? '다시 섞기' : '팀 짜기'}
              </Button>
              {/* 버튼이 왜 눌리지 않는지 알려준다. */}
              {names.length < teamCount && (
                <p className="text-center text-sm text-muted-foreground">
                  {teamCount}팀으로 나누려면 최소 {teamCount}명이 필요해요.
                </p>
              )}
              {/* 조건이 서로 부딪혀 팀을 못 만든 이유는 버튼 바로 아래에 둔다. */}
              {splitError && <p className="text-sm text-destructive">{splitError}</p>}
            </div>

            {/* 결과 */}
            {teams.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {teams.map((team, index) => {
                  const style = TEAM_STYLES[index % TEAM_STYLES.length];
                  return (
                    <div key={index} className="space-y-2">
                      <h3 className={`font-bold text-lg ${style.title}`}>
                        {index + 1}팀 ({team.length}명)
                      </h3>
                      {team.map(name => (
                        <div key={name} className={`rounded p-2 ${style.item}`}>
                          {name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/** 저장된 이름 목록. 깨져 있으면 지우고 null을 돌려준다. */
function readStoredNames(): string[] | null {
  try {
    const saved = localStorage.getItem(NAMES_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.every(name => typeof name === 'string')) {
      // 저장된 값이 손으로 편집됐을 수도 있으니 중복과 빈 이름은 걸러서 쓴다.
      return [...new Set<string>(parsed)].filter(Boolean);
    }

    localStorage.removeItem(NAMES_STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(NAMES_STORAGE_KEY);
    return null;
  }
}

/** 저장된 팀 개수. 값이 이상하면 지우고 null을 돌려준다. */
function readStoredTeamCount(): number | null {
  try {
    const saved = localStorage.getItem(TEAM_COUNT_STORAGE_KEY);
    if (!saved) return null;

    const parsed = Number(saved);
    if (Number.isInteger(parsed) && parsed >= MIN_TEAM_COUNT) return parsed;

    localStorage.removeItem(TEAM_COUNT_STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

/** 저장된 조건. 깨져 있으면 지우고 null을 돌려준다. */
function readStoredConstraints(): Constraints | null {
  try {
    const saved = localStorage.getItem(CONSTRAINTS_STORAGE_KEY);
    if (!saved) return null;

    const parsed = parseStoredConstraints(JSON.parse(saved));
    if (parsed) return parsed;

    localStorage.removeItem(CONSTRAINTS_STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(CONSTRAINTS_STORAGE_KEY);
    return null;
  }
}

export default RandomTeams;
