import { validOutput, type Input, type Output } from '../content.ts';
import { seededRandom } from './context.ts';
import {
  buildJudgeMessages, buildPolishMessages, buildWriterMessages, headlineOk, LETTERS, parseJudge, parsePolish, parsePool,
  type JudgedCandidate, type Message, type Pool,
} from './agents.ts';
import { openingOverlap, scoreOutput } from './quality.ts';
import { pickDistinct, scoreCandidate, similarity, type Ranked } from './select.ts';
import type { CampaignBrief } from './types.ts';

export type PipelineMode = 'single' | 'smart' | 'deep';
export type StageName = 'write' | 'judge' | 'judge-reverse' | 'polish';
/** Gọi LLM, trả JSON đã parse. Tự ném lỗi nếu upstream lỗi/hết giờ/không phải JSON. */
export type ChatJson = (messages: readonly Message[], stage: StageName) => Promise<unknown>;

export type PipelineTrace = {
  mode: PipelineMode;
  stages: { stage: StageName; ok: boolean; ms: number }[];
  pool: { generated: number; eligible: number };
  judged: boolean;
  judgeAgreement?: number;
  polished: boolean[];
  finalScore?: number;
  finalPass?: boolean;
};

export function parseMode(value: string | undefined): PipelineMode {
  const mode = value?.trim().toLowerCase();
  return mode === 'smart' || mode === 'deep' ? mode : 'single';
}

const WEIGHT_JUDGE = 0.55;
const MIN_SIMILARITY_TO_ACCEPT_POLISH = 0.35;

function shuffled<T>(items: T[], random: () => number) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}

type Eligible = { text: string; slot: number; det: number; poolIndex: number };

function eligibleCandidates(pool: Pool, input: Input, brief: CampaignBrief): { eligible: Eligible[][]; generated: number; passed: number } {
  let generated = 0, passed = 0;
  const eligible = pool.slots.map((list, slot) => {
    const scored = list.map((candidate, poolIndex) => ({ text: candidate.text, slot, poolIndex, ...scoreCandidate(candidate.text, slot, input, brief) }));
    generated += scored.length;
    const ok = scored.filter(item => item.text.trim() && Array.from(item.text).length <= 4000).map(item => ({ text: item.text, slot, det: item.hard ? item.score * 0.35 : item.score, poolIndex: item.poolIndex }));
    passed += ok.length;
    return ok;
  });
  return { eligible, generated, passed };
}

function pickHeadlines(pool: Pool, input: Input, openings: string[]) {
  const seen = new Set<string>(), out: string[] = [];
  const ranked = [...pool.headlines].sort((a,b)=>Number(openings.some(open=>openingOverlap(open,a)>0.8))-Number(openings.some(open=>openingOverlap(open,b)>0.8)));
  for (const headline of ranked) {
    const key = headline.toLocaleLowerCase('vi-VN');
    if (seen.has(key) || !headlineOk(headline, input)) continue;
    seen.add(key); out.push(headline);
    if (out.length === 3) break;
  }
  return out.length === 3 ? out : undefined;
}

// Cơ cấu hashtag theo quy tắc sẵn có: 1 brand, 2 category, 1 audience, 1 mood; thiếu role nào thì lấy phần còn lại theo thứ tự model đưa ra.
function pickHashtags(pool: Pool) {
  const out: string[] = [], seen = new Set<string>();
  const take = (tag: string) => { const key = tag.toLocaleLowerCase('vi-VN'); if (!seen.has(key) && out.length < 5) { seen.add(key); out.push(tag); } };
  for (const [role, quota] of [['brand', 1], ['category', 2], ['audience', 1], ['mood', 1]] as const) {
    let used = 0;
    for (const item of pool.hashtags) if (item.role === role && used < quota && out.length < 5) { const before = out.length; take(item.tag); if (out.length > before) used++; }
  }
  for (const item of pool.hashtags) take(item.tag);
  return out.length === 5 ? out : undefined;
}

export async function runPipeline(args: {
  input: Input; brief: CampaignBrief; mode: Exclude<PipelineMode, 'single'>; chat: ChatJson; seed?: number;
  /** Cho phép host chặn bước muộn khi gần hết giờ; bước write luôn chạy. */
  canRun?: (stage: StageName) => boolean; now?: () => number;
}): Promise<{ output?: Output; trace: PipelineTrace }> {
  const { input, brief, mode, chat, canRun = () => true, now = Date.now } = args;
  const random = seededRandom((args.seed ?? 0) ^ 0x9e3779b9);
  const trace: PipelineTrace = { mode, stages: [], pool: { generated: 0, eligible: 0 }, judged: false, polished: [false, false, false] };
  const run = async (stage: StageName, messages: Message[]) => {
    const started = now();
    const record = { stage, ok: false, ms: 0 };
    trace.stages.push(record);
    try { const value = await chat(messages, stage); record.ok = true; record.ms = now() - started; return { value, record }; }
    catch (error) { record.ms = now() - started; throw error; }
  };

  // 1) WRITER: pool ứng viên đa dạng. Không có pool dùng được thì trả undefined để host rơi về đường 1 lượt.
  const pool = parsePool((await run('write', buildWriterMessages(input, brief))).value);
  if (!pool) return { trace };
  const { eligible, generated, passed } = eligibleCandidates(pool, input, brief);
  trace.pool = { generated, eligible: passed };
  if (eligible.some(list => !list.length)) return { trace };

  // 2) JUDGE (tùy chọn): chấm theo rubric trên các ứng viên đã qua cổng sự thật.
  const judged: Map<string, JudgedCandidate>[][] = []; // theo lượt chấm → theo slot → nhãn
  const orders: Eligible[][][] = [];
  const judgeOnce = async (stage: StageName, order: Eligible[][]) => {
    const groups = order.map(list => list.map((item, i) => ({ id: LETTERS[i], text: item.text })));
    const { value, record } = await run(stage, buildJudgeMessages(input, brief, groups));
    const result = parseJudge(value, groups);
    if (!result) throw new Error('INVALID_AI_OUTPUT');
    record.ok &&= !!result;
    if (result) { judged.push(result); orders.push(order); }
  };
  const needsJudge = eligible.some(list => list.length > 1);
  if (needsJudge && canRun('judge')) {
    const capped = eligible.map(list => [...list].sort((a, b) => b.det - a.det).slice(0, LETTERS.length));
    const first = capped.map(list => shuffled(list, random));
    // deep: hai lượt chấm với thứ tự đảo ngược chạy SONG SONG (không phụ thuộc nhau) để không cộng thêm độ trễ.
    const rounds = [judgeOnce('judge', first)];
    if (mode === 'deep' && canRun('judge-reverse')) rounds.push(judgeOnce('judge-reverse', first.map(list => [...list].reverse())));
    await Promise.all(rounds);
  }
  trace.judged = judged.length > 0;

  // 3) Điểm cuối = trộn điểm code (cổng sự thật + nghề viết) và điểm judge trung bình qua các lượt/đảo thứ tự.
  const judgeOf = (slot: number, candidate: Eligible) => {
    const readings: JudgedCandidate[] = [];
    judged.forEach((result, round) => {
      const label = orders[round][slot].indexOf(candidate);
      const reading = label >= 0 ? result[slot].get(LETTERS[label]) : undefined;
      if (reading) readings.push(reading);
    });
    if (!readings.length) return undefined;
    const avg = (pick: (r: JudgedCandidate) => number) => readings.reduce((sum, r) => sum + pick(r), 0) / readings.length;
    const fixes = readings.map(r => r.fix).filter(Boolean);
    return { quality: avg(r => r.quality), faithful: avg(r => r.faithful), fix: fixes[0] ?? '' };
  };
  const ranked: (Ranked & { candidate: Eligible; fix: string })[][] = eligible.map((list, slot) => {
    const rows = list.map((candidate, index) => {
      const judge = judgeOf(slot, candidate);
      const unfaithful = judge && judge.faithful < 2.5 ? 0.35 : 0; // judge nghi bịa dữ kiện → trừ nặng dù code chưa bắt được
      const score = judge ? (1 - WEIGHT_JUDGE) * candidate.det + WEIGHT_JUDGE * judge.quality - unfaithful : candidate.det;
      return { index, text: candidate.text, score, candidate, fix: judge?.fix ?? '' };
    });
    return rows;
  });
  if (judged.length === 2) {
    // độ đồng thuận giữa hai thứ tự: tỉ lệ slot mà ứng viên thắng theo từng lượt chấm là một
    const winners = judged.map((result, round) => result.map((map, slot) => {
      let best = -1, bestLabel = '';
      for (const [label, value] of map) if (value.quality > best) { best = value.quality; bestLabel = label; }
      return bestLabel ? orders[round][slot][LETTERS.indexOf(bestLabel as typeof LETTERS[number])] : undefined;
    }));
    trace.judgeAgreement = Number((winners[0].filter((w, i) => w && w === winners[1][i]).length / 3).toFixed(2));
  }
  const chosen = pickDistinct(ranked, 0.5).map((pick, slot) => ranked[slot].find(row => row.index === pick.index)!);
  let captions = chosen.map(row => row.text);

  // 4) POLISH (deep): chỉ nhận bản sửa nếu vẫn qua cổng, không tệ hơn, và vẫn là cùng một bài (không viết lại).
  if (mode === 'deep' && chosen.some(row => row.fix) && canRun('polish')) {
    const polished = parsePolish((await run('polish', buildPolishMessages(input, brief, chosen.map(row => ({ text: row.text, fix: row.fix }))))).value);
    if (!polished) throw new Error('INVALID_AI_OUTPUT');
    if (polished) {
      captions = captions.map((original, slot) => {
        const next = polished[slot];
        if (!chosen[slot].fix || next === original) return original;
        const before = scoreCandidate(original, slot, input, brief), after = scoreCandidate(next, slot, input, brief);
        const similar = similarity(original, next) >= MIN_SIMILARITY_TO_ACCEPT_POLISH;
        const bounded = Array.from(next).length <= Array.from(original).length * 1.25;
        if (after.hard || !similar || !bounded || after.score < before.score - 0.02) return original;
        trace.polished[slot] = true;
        return next;
      });
    }
  }

  // 5) Lắp ráp bộ 3/3/5 và kiểm lần cuối bằng đúng validator + scorer của đường 1 lượt.
  const headlines = pickHeadlines(pool, input, captions.map(text => text.split('\n')[0]));
  const hashtags = pickHashtags(pool);
  if (!headlines || !hashtags) return { trace };
  const output: Output = { captions, headlines, hashtags };
  if (!validOutput(output)) return { trace };
  const report = scoreOutput(output, input, brief);
  trace.finalScore = report.score; trace.finalPass = report.pass;
  return { output, trace };
}
