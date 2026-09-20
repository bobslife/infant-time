import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { RhythmAnalysisCards } = await server.ssrLoadModule('/src/components/RhythmAnalysisCards.tsx');
  const now = new Date();
  const at = (hour, minute = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute).toISOString();
  let id = 0;
  const event = (eventType, hour, extra = {}) => ({
    id: String(++id), userId:'test', babyId:'baby', eventType, occurredAt:at(hour), createdAt:at(hour), ...extra,
  });
  const events = [
    event('feed', 7, { feedingMethod:'bottle', amountMl:120 }),
    event('feed', 10, { feedingMethod:'bottle', amountMl:130 }),
    event('feed', 8, { feedingMethod:'breast', breastLeftMinutes:10, breastRightMinutes:8 }),
    event('feed', 11, { feedingMethod:'breast', breastLeftMinutes:12, breastRightMinutes:10 }),
    event('meal', 9, { mealAmountG:90 }),
    event('meal', 13, { mealAmountG:100 }),
    event('sleep', 12, { endedAt:at(14) }),
    event('sleep', 17, { endedAt:at(19) }),
  ];
  const html = renderToStaticMarkup(React.createElement(RhythmAnalysisCards, { events }));
  for (const text of ['최근 7일','분유','모유','이유식','수면','250ml','40분','190g','4시간','리듬 신호']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('7일 통합 그래프'));
  assert.ok(!html.includes('날짜별 총량'));
  assert.ok(!html.includes('선택한 날짜'));
  assert.ok(!html.includes('7일 평균과 비교'));
  assert.ok(!html.includes('<p class="eyebrow">리듬</p>'));
  assert.ok(html.indexOf('>총량</button>') < html.indexOf('>평균 간격</button>'));
  assert.match(html, /<h2 class="rhythm-analysis-date-title">[^<]+ · 오늘<\/h2>/);
  assert.equal((html.match(/rhythm-trend-day/g) ?? []).length, 28);
  for (const className of ['rhythm-series-bottle','rhythm-series-breast','rhythm-series-meal','rhythm-series-sleep']) assert.ok(html.includes(className), className);

  const appSource = readFileSync('src/App.tsx', 'utf8');
  assert.ok(appSource.indexOf('label: "홈"') < appSource.indexOf('label: "리듬"'));
  assert.ok(appSource.indexOf('label: "리듬"') < appSource.indexOf('label: "성장"'));
  assert.ok(appSource.indexOf('label: "성장"') < appSource.indexOf('label: "프로필"'));
  assert.ok(!appSource.includes('id: "analysis"'));
  assert.ok(appSource.includes('<RhythmAnalysisCards events={events} />'));
  const emptyHtml = renderToStaticMarkup(React.createElement(RhythmAnalysisCards, { events:[] }));
  assert.ok(emptyHtml.includes('최근 7일 기록이 없어요'));
  assert.ok(!emptyHtml.includes('trend-bars'));
  assert.ok(!emptyHtml.includes('리듬 신호'));
  const bottleOnlyHtml = renderToStaticMarkup(React.createElement(RhythmAnalysisCards, { events:events.filter(item => item.eventType === 'feed' && item.feedingMethod === 'bottle') }));
  assert.ok(bottleOnlyHtml.includes('rhythm-series-bottle'));
  assert.ok(!bottleOnlyHtml.includes('rhythm-series-breast'));
  assert.ok(!bottleOnlyHtml.includes('rhythm-series-meal'));
  assert.ok(!bottleOnlyHtml.includes('rhythm-series-sleep'));
  assert.equal((bottleOnlyHtml.match(/rhythm-trend-day/g) ?? []).length, 7);
  console.log('PASS: fixed seven-day rhythm, split bottle/breast, values above 28 bars, merged tab, four-tab navigation');
} finally {
  await server.close();
}
