import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { AnalysisCards, SummaryCards } = await server.ssrLoadModule('/src/components/SummaryCards.tsx');
  const { buildDailySummary } = await server.ssrLoadModule('/src/features/events/useEvents.ts');
  const noop = () => {};
  const date = '2026-09-18';
  let id = 0;
  const event = (eventType, day = date, extra = {}) => ({
    id: String(++id), babyId: 'test', eventType, occurredAt: `${day}T10:00:00`, createdAt: `${day}T10:00:00`, ...extra,
  });
  const bottle = event('feed', date, { amountMl: 120 });
  const meal = event('meal', date, { mealAmountG: 60, mealName: '소고기 채소죽', mealToppings: ['rice', 'beef'] });
  const breast = event('feed', '2026-09-17', { feedingMethod: 'breast', breastLeftMinutes: 15 });
  const analyze = (events, selectedDate = date) => renderToStaticMarkup(React.createElement(AnalysisCards, {
    events, selectedDate, summary: buildDailySummary(events, selectedDate),
    onDateChange: noop, onEditEvent: noop, onQuickAdd: noop, onViewEventInPattern: noop,
  }));
  const mixed = analyze([bottle, meal, breast]);
  for (const label of ['수유 타임라인', '이유식 타임라인', '통합 수유 간격', '이유식 간격', '분유 총량', '수유와 이유식을 함께']) assert.ok(mixed.includes(label), label);
  assert.match(mixed, /<span>분유<\/span><strong>120ml<\/strong>/);
  assert.match(mixed, /<span>모유<\/span><strong>15분<\/strong>/);
  assert.match(mixed, /<span>이유식<\/span><strong>60g<\/strong>/);
  for (const [events, present, absent] of [
    [[bottle], '수유 타임라인', '이유식 타임라인'],
    [[meal], '이유식 타임라인', '수유 타임라인'],
    [[bottle, event('meal', '2026-09-01')], '수유 타임라인', '이유식 타임라인'],
    [[bottle, event('meal', '2026-09-19')], '수유 타임라인', '이유식 타임라인'],
    [[event('meal')], '이유식 타임라인', '수유 타임라인'],
  ]) {
    const html = analyze(events);
    assert.ok(html.includes(present), present);
    assert.ok(!html.includes(absent), absent);
  }
  assert.ok(analyze([bottle, event('meal', '2026-09-17')]).includes('이유식 타임라인'));
  assert.ok(analyze([]).includes('이날은 아직 기록이 없어요'));
  const home = (events) => renderToStaticMarkup(React.createElement(SummaryCards, {
    baby: { name: '테스트', gender: 'boy', birthDate: '2026-01-01' }, events,
    feedIntervalMinutes: 180,
    summary: { lastFeedAt: events.find(e => e.eventType === 'feed')?.occurredAt ?? null,
      lastMealAt: events.find(e => e.eventType === 'meal')?.occurredAt ?? null,
      todayFeedCount: 1, todayMealCount: 1, todayMealTotalG: 60, todaySleepMinutes: 0 },
    onFeedIntervalChange: noop, onQuickAdd: noop, onWakeSleep: noop, onEndPlay: noop,
  }));
  const mixedHome = home([bottle, meal]);
  for (const label of ['마지막 수유', '마지막 이유식', '오늘 수유', '오늘 이유식', '다음 수유 예측']) assert.ok(mixedHome.includes(label), label);
  assert.ok(!home([meal]).includes('다음 수유 예측'));
  assert.ok(!home([bottle]).includes('오늘 이유식'));
  assert.ok(mixedHome.indexOf('마지막 이유식') < mixedHome.indexOf('마지막 수유'));
  assert.equal((mixedHome.match(/오늘 이유식/g) ?? []).length, 1);
  assert.equal((mixedHome.match(/오늘 수유/g) ?? []).length, 1);
  assert.ok(mixedHome.includes('>1회<'));
  assert.ok(!mixedHome.includes('소고기 채소죽'));
  assert.ok(!mixedHome.includes('쌀'));
  assert.ok(!mixedHome.includes('소고기'));
  const { EventList } = await server.ssrLoadModule('/src/components/EventList.tsx');
  const recent = (events) => renderToStaticMarkup(React.createElement(EventList, { events, onEdit: noop, onDelete: noop }));
  const heading = (html) => html.match(/class="event-date-heading">(.*?)<\/div>/s)?.[1] ?? '';
  const mixedHeading = heading(recent([bottle, meal, { ...breast, occurredAt: `${date}T11:00:00` }]));
  for (const text of ['이유식 60g', '분유 120ml', '모유 15분']) assert.ok(mixedHeading.includes(text), text);
  assert.ok(!mixedHeading.includes('수면'));
  const zeroHeading = heading(recent([event('meal'), event('feed'), event('feed', date, { feedingMethod: 'breast' })]));
  assert.ok(!zeroHeading.includes('<span>'));
  assert.ok(recent([event('meal')]).includes('event-swipe'));
  const sleepHeading = heading(recent([event('sleep', date, { endedAt: `${date}T11:00:00` })]));
  assert.ok(sleepHeading.includes('수면 1시간'));
  assert.ok(!sleepHeading.includes('분유'));
  console.log('PASS: mixed intake, independent averages, single record, zero amount, date range, empty state, home visibility');
} finally {
  await server.close();
}
