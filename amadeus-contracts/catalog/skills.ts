import type { SkillContract } from "./skill-contract";

const commonConsumerReferences = [
  {
    consumer: "validator",
    purpose: "生成物の存在、構造、参照入口を検出する。",
    inputs: ["generatedReferencePaths", "prerequisites", "invariants", "postconditions", "readBoundary", "writeBoundary"],
  },
  {
    consumer: "evaluator",
    purpose: "Skill Contract と実行結果の品質評価入力にする。",
    inputs: ["invariants", "postconditions", "feedbackConditions"],
  },
  {
    consumer: "decision-review",
    purpose: "意思決定の再確認に必要な契約条件を参照する。",
    inputs: ["prerequisites", "invariants", "postconditions", "readBoundary", "writeBoundary"],
  },
  {
    consumer: "learning-review",
    purpose: "後段発見と学習候補の分類に必要な条件を参照する。",
    inputs: ["feedbackConditions", "postconditions", "consumerReferences"],
  },
] as const satisfies SkillContract["consumerReferences"];

const noDelegation = {
  allowed: [],
  order: [],
  prohibited: ["対象 skill の責務外成果物を作る skill"],
} as const satisfies SkillContract["delegation"];

export const skillContracts = [
  {
    skillId: "amadeus-grilling",
    skillName: "amadeus-grilling",
    sourcePaths: ["skills/amadeus-grilling/SKILL.md", ".agents/skills/amadeus-grilling/SKILL.md"],
    generatedReferencePaths: [
      "skills/amadeus-grilling/references/skill-contract.md",
      ".agents/skills/amadeus-grilling/references/skill-contract.md",
    ],
    prerequisites: [
      {
        id: "PRE001",
        description: "確認したい論点と、反映先候補の成果物が特定されている。",
      },
    ],
    invariants: [
      {
        id: "INV001",
        description: "質問は一度に並べず、一問ずつ行う。",
      },
      {
        id: "INV002",
        description: "回答があるまで成果物を確定しない。",
      },
    ],
    postconditions: [
      {
        id: "POST001",
        description: "質問、推奨回答、ユーザー回答、確定判断、反映先を記録できる。",
      },
    ],
    readBoundary: {
      allowed: ["amadeus/spaces/<space>/intents/**", "amadeus/spaces/<space>/memory/**", "対象 skill が渡した前提"],
      prohibited: ["質問対象と無関係な成果物"],
    },
    writeBoundary: {
      allowed: ["親 skill が許可した grillings.md と Gxxx-*.md"],
      prohibited: ["親 skill が許可していない成果物", "実装コード", "merge 操作"],
    },
    delegation: noDelegation,
    grillingConditions: [
      {
        id: "GR001",
        description: "自分自身は質問実行の skill であり、対象 skill から渡された論点だけを扱う。",
      },
    ],
    feedbackConditions: [
      {
        id: "FB001",
        description: "回答で新しい範囲外作業が見つかった場合は、親 skill に戻して分類する。",
      },
    ],
    consumerReferences: commonConsumerReferences,
  },
  {
    skillId: "amadeus-validator",
    skillName: "amadeus-validator",
    sourcePaths: ["skills/amadeus-validator/SKILL.md", ".agents/skills/amadeus-validator/SKILL.md"],
    generatedReferencePaths: [
      "skills/amadeus-validator/references/skill-contract.md",
      ".agents/skills/amadeus-validator/references/skill-contract.md",
    ],
    prerequisites: [
      {
        id: "PRE001",
        description: "検証対象 workspace または Intent を指定できる。",
      },
    ],
    invariants: [
      {
        id: "INV001",
        description: "validator の pass は実行時参照に必要な最低限の構造条件を満たす意味であり、内容承認ではない。",
      },
      {
        id: "INV002",
        description: "Domain Map と Context Map に候補を載せない。",
      },
    ],
    postconditions: [
      {
        id: "POST001",
        description: "検査カテゴリごとの pass、warning、fail、blocked と不足または矛盾を報告する。",
      },
    ],
    readBoundary: {
      allowed: ["aidlc/**", "検証対象の関連成果物"],
      prohibited: ["秘密情報", "検証対象外 workspace"],
    },
    writeBoundary: {
      allowed: [],
      prohibited: ["検証対象成果物", "実装コード", "merge 操作"],
    },
    delegation: noDelegation,
    grillingConditions: [
      {
        id: "GR001",
        description: "validator は質問を起動せず、不足または矛盾を報告する。",
      },
    ],
    feedbackConditions: [
      {
        id: "FB001",
        description: "構造検出で見つかった不足は、対象 phase skill または人間判断へ戻す。",
      },
    ],
    consumerReferences: commonConsumerReferences,
  },
] as const satisfies readonly SkillContract[];
