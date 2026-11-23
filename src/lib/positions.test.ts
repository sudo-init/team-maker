import { describe, expect, it } from 'vitest';
import {
  MAX_RECORDS,
  POSITIONS,
  createRecord,
  emptySlots,
  parseStoredRecords,
  splitByPosition,
  type PositionSlots
} from './positions';

function filledSlots(): PositionSlots {
  const slots = emptySlots();
  POSITIONS.forEach((position, index) => {
    slots[position] = [`A${index}`, `B${index}`];
  });
  return slots;
}

describe('splitByPosition', () => {
  it('포지션마다 한 명씩 양 팀에 나눈다', () => {
    const result = splitByPosition(filledSlots());
    if (!result.ok) throw new Error(result.reason);

    expect(result.teamA.map(p => p.position)).toEqual([...POSITIONS]);
    expect(result.teamB.map(p => p.position)).toEqual([...POSITIONS]);
    POSITIONS.forEach((_, index) => {
      const pair = [result.teamA[index].name, result.teamB[index].name].sort();
      expect(pair).toEqual([`A${index}`, `B${index}`]);
    });
  });

  it('난수에 따라 어느 쪽으로든 갈 수 있다', () => {
    const toA = splitByPosition(filledSlots(), () => 0);
    const toB = splitByPosition(filledSlots(), () => 0.99);
    if (!toA.ok || !toB.ok) throw new Error('실패하면 안 된다');
    expect(toA.teamA[0].name).toBe('A0');
    expect(toB.teamA[0].name).toBe('B0');
  });

  it('공백을 다듬어 저장한다', () => {
    const slots = filledSlots();
    slots.TOP = ['  가  ', '나'];
    const result = splitByPosition(slots);
    if (!result.ok) throw new Error(result.reason);
    expect([result.teamA[0].name, result.teamB[0].name].sort()).toEqual(['가', '나']);
  });

  it('빈칸(공백만 포함)이 있으면 어느 포지션인지 알려준다', () => {
    const slots = filledSlots();
    slots.MID = ['가', '   '];
    const result = splitByPosition(slots);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('MID');
  });

  it('같은 사람이 두 칸에 있으면 거절한다', () => {
    const slots = filledSlots();
    slots.ADC = ['A0', 'B3'];
    const result = splitByPosition(slots);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('A0');
  });
});

describe('parseStoredRecords', () => {
  const record = () => {
    const result = splitByPosition(filledSlots());
    if (!result.ok) throw new Error(result.reason);
    return createRecord(result);
  };

  it('정상 기록은 그대로 되살린다', () => {
    const stored = [record(), record()];
    expect(parseStoredRecords(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  it('배열이 아니면 null', () => {
    expect(parseStoredRecords({})).toBeNull();
    expect(parseStoredRecords(null)).toBeNull();
  });

  it('모양이 깨진 항목은 버린다 (예전엔 화면이 하얗게 죽던 경우)', () => {
    const good = record();
    const parsed = parseStoredRecords([
      { id: '1', date: 'x' },
      { ...good, teamA: [{ name: '가', position: 'CARRY' }] },
      { ...good, teamB: 'B팀' },
      null,
      good
    ]);
    expect(parsed).toEqual([good]);
  });

  it('만든 시각이 없는 예전 기록도 살리고, 시각이 숫자가 아니면 버린다', () => {
    const { createdAt, ...legacy } = record();
    expect(typeof createdAt).toBe('number');
    expect(parseStoredRecords([legacy])).toEqual([legacy]);
    expect(parseStoredRecords([{ ...legacy, createdAt: 'yesterday' }])).toEqual([]);
  });

  it('id가 겹치면 앞의 것만 남기고 최대 개수를 지킨다', () => {
    const good = record();
    expect(parseStoredRecords([good, good])).toHaveLength(1);

    const many = Array.from({ length: MAX_RECORDS + 5 }, () => record());
    expect(parseStoredRecords(many)).toHaveLength(MAX_RECORDS);
  });
});
