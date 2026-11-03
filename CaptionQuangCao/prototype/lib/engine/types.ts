export const ENGINE_VERSION = 2;

export type CategoryId =
  | 'stationery'
  | 'beverage'
  | 'cosmetics'
  | 'electronics'
  | 'education'
  | 'fashion'
  | 'food'
  | 'home'
  | 'service'
  | 'generic';

export type StrategyId = 'benefit-led' | 'audience-led' | 'story-led';
export type ClaimKind = 'fact' | 'inference' | 'category-knowledge' | 'unknown';
export type ToneId = 'youthful' | 'formal' | 'humorous';
export type ClaimRisk = 'low' | 'medium' | 'high';
export type HookId =
  | 'pain-question' | 'scene' | 'contrast' | 'call-out' | 'number-fact' | 'confession'
  | 'curiosity' | 'pov' | 'micro-promise' | 'permission' | 'rhythm';
export type CtaId = 'save' | 'tag' | 'comment' | 'inbox' | 'see' | 'choose';

export type HookType = { id: HookId; label: string; how: string; tones: ToneId[]; needsDigitFact?: boolean };
export type CtaType = { id: CtaId; label: string; how: string; tones: ToneId[] };
export type FeatureKind = 'size' | 'quantity' | 'volume' | 'material' | 'look' | 'sensory' | 'ingredient' | 'connect' | 'format' | 'other';
export type FeatureAngle = { fact: string; kind: FeatureKind; soWhat: string };

export type AudienceProfile = {
  id: string;
  labels: string[];
  usageContext: string[];
  needs: string[];
  painPoints: string[];
  motivations: string[];
  objections: string[];
  selectionCriteria: string[];
  languagePatterns: string[];
  avoidPhrases: string[];
  priorityBenefits: string[];
};

export type ToneProfile = {
  id: string;
  label: string;
  sentenceRhythm: string;
  vocabulary: string[];
  intimacy: string;
  openings: string[];
  benefitStyle: string;
  emotion: string;
  questions: string;
  emojiPolicy: string;
  ctaStyle: string;
  avoid: string[];
  voice: string;
  devices: string[];
  emojiMax: number;
  allowedHooks: HookId[];
  allowedCtas: CtaId[];
};

export type CategoryRule = {
  id: CategoryId;
  label: string;
  keywords: string[];
  aliases: string[];
  forbiddenClaims: string[];
  unsupportedAssumptions: string[];
  valueAngles: string[];
  defaultAudienceId: string;
  risk: ClaimRisk;
  imagery: string[];
};

export type CopyExample = {
  id: string;
  category: CategoryId;
  tone: string;
  audienceId: string;
  strategy: StrategyId;
  product: string;
  facts: string;
  caption: string;
  why: string;
};

export type ProductFact = { text: string; kind: ClaimKind; confidence: number };

export type ProductContext = {
  name: string;
  category: CategoryId;
  categoryLabel: string;
  categoryConfidence: number;
  facts: ProductFact[];
  features: string[];
  benefits: ProductFact[];
  useCases: string[];
  differentiators: string[];
  motivations: string[];
  objections: string[];
  missing: string[];
  injectionAttempt: boolean;
};

export type AudienceContext = {
  id: string;
  label: string;
  confidence: number;
  inferred: boolean;
  usageContext: string[];
  needs: string[];
  painPoints: string[];
  motivations: string[];
  objections: string[];
  selectionCriteria: string[];
  languagePatterns: string[];
  avoidPhrases: string[];
  priorityBenefits: string[];
};

export type StrategyPlan = {
  id: StrategyId;
  goal: string;
  angle: string;
  length: [number, number];
  framework: string;
  hook: { id: HookId; label: string; how: string };
  cta: { id: CtaId; label: string; how: string };
};

export type CampaignBrief = {
  version: number;
  product: ProductContext;
  audience: AudienceContext;
  tone: ToneProfile;
  objective: string;
  mainMessage: string;
  primaryBenefit: string;
  emotionalAngle: string;
  persuasion: string;
  platform: string;
  ctaIntent: string;
  verifiedFacts: string[];
  claimsToAvoid: string[];
  required: string[];
  missing: string[];
  claimRisk: ClaimRisk;
  featureAngles: FeatureAngle[];
  strategies: StrategyPlan[];
  examples: CopyExample[];
};

export type QualityIssue = { code: string; hard: boolean; detail: string };

export type QualityReport = {
  pass: boolean;
  score: number;
  issues: QualityIssue[];
  dimensions: Record<string, number>;
};
