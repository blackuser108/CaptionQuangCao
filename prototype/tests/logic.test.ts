import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captionWarning, cleanInput, count, normalize, openingCount, validate } from '../lib/content.ts';
import { addHistory, deleteHistory, HISTORY_KEY, readHistory } from '../lib/history.ts';
import { getSample, longSample, sampleInput, samples } from '../lib/samples.ts';
import type { Entry } from '../lib/content.ts';

const entry = (id: string): Entry => ({ id, createdAt: '2026-10-26T15:00:00.000Z', input: { ...sampleInput }, output: getSample(0) });
function memoryStore() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('Unicode NFC, emoji sequences, CRLF/CR and exact text are counted consistently', () => {
  for (const [value, expected] of [['a\u0301', 1], ['á', 1], ['😀', 1], ['👍🏽', 2], ['👨‍👩‍👧‍👦', 7], ['a\r\nb', 3], ['a\rb', 3], [' x\n', 3]] as const) assert.equal(count(value), expected);
  assert.equal(normalize('a\u0301\r\nb'), 'á\nb');
  assert.equal(openingCount('á\r\nb'), 1);
});

test('Editorial >280 is a warning; opening threshold can be checked separately', () => {
  assert.doesNotMatch(captionWarning('a'.repeat(279), 2), /Caption hơi dài/);
  assert.equal(captionWarning('a'.repeat(280), 2), '');
  assert.match(captionWarning('a'.repeat(281), 2), /Caption hơi dài/);
  assert.equal(openingCount('a'.repeat(116) + '\nabc'), 116);
  for (const [index, min, max] of [[0,45,90], [1,150,260], [2,180,280]]) {
    assert.equal(captionWarning('a'.repeat(min), index), '');
    assert.equal(captionWarning('a'.repeat(max), index), '');
    assert.ok(captionWarning('a'.repeat(min - 1), index));
    assert.ok(captionWarning('a'.repeat(max + 1), index));
  }
});

test('Four inputs: whitespace, exact code-point limits, enum inherited names rejected', () => {
  assert.equal(Object.keys(validate({ productName: ' ', description: '', audience: '', tone: '' })).length, 4);
  for (const tone of ['humorous', 'formal', 'youthful']) assert.deepEqual(validate({ ...sampleInput, tone }), {});
  assert.ok(validate({ ...sampleInput, tone: 'toString' }).tone);
  assert.deepEqual(validate({ ...sampleInput, productName: '😀'.repeat(120) }), {});
  assert.ok(validate({ ...sampleInput, productName: '😀'.repeat(121) }).productName);
  assert.ok(validate({ ...sampleInput, description: 'a'.repeat(1001) }).description);
  assert.ok(validate({ ...sampleInput, audience: 'a'.repeat(301) }).audience);
  assert.equal(cleanInput({ ...sampleInput, productName: ' a\u0301 ' }).productName, 'á');
});

test('Both fixed sets keep 3/3/5 and related hashtags; boundary sample is deliberately long', () => {
  for (const output of samples) {
    assert.deepEqual([output.captions.length, output.headlines.length, output.hashtags.length], [3,3,5]);
    for (const values of Object.values(output)) assert.equal(new Set(values).size, values.length);
    assert.ok(output.hashtags.every(tag => /^#[^\s#]+$/u.test(tag)));
  }
  assert.ok(count(longSample.captions[2]) > 280);
  assert.ok(openingCount(longSample.captions[2]) > 115);
  assert.ok(count(longSample.headlines[2]) > 40);
  assert.ok(longSample.captions[2].includes('\n'));
});

test('AI key, reload roundtrip and delete one item preserve prototype data', () => {
  const store = memoryStore();
  store.setItem('ban-bien-tap:prototype:history:v1', 'untouched');
  assert.equal(HISTORY_KEY, 'ban-bien-tap:history:v1');
  assert.deepEqual(readHistory(store), []);
  addHistory(store, entry('first')); addHistory(store, entry('second'));
  assert.deepEqual(readHistory(store).map(e => e.id), ['second','first']);
  assert.deepEqual(deleteHistory(store, 'first').map(e => e.id), ['second']);
  assert.equal(store.getItem('ban-bien-tap:prototype:history:v1'), 'untouched');
  assert.equal(readHistory(store)[0].output.captions[1], getSample(0).captions[1]);
});

test('Corrupted payload/schema/version are never overwritten', () => {
  for (const raw of ['{broken', '{"version":2,"entries":[]}', JSON.stringify({ version: 1, entries: [{...entry('bad'), output: { captions: [] }}] })]) {
    const store = memoryStore(); store.setItem(HISTORY_KEY, raw);
    assert.throws(() => readHistory(store));
    assert.throws(() => addHistory(store, entry('new')));
    assert.throws(() => deleteHistory(store, 'bad'));
    assert.equal(store.getItem(HISTORY_KEY), raw);
  }
});

test('Failed add/delete throw, stored record remains; current output is not mutated', () => {
  const store = memoryStore(); const current = entry('old'); addHistory(store, current);
  const before = store.getItem(HISTORY_KEY);
  const fullStore = { getItem: store.getItem, setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); } };
  assert.throws(() => addHistory(fullStore, entry('new')), { name: 'QuotaExceededError' });
  assert.throws(() => deleteHistory(fullStore, 'old'), { name: 'QuotaExceededError' });
  assert.equal(store.getItem(HISTORY_KEY), before);
  assert.deepEqual(current, entry('old'));
});
