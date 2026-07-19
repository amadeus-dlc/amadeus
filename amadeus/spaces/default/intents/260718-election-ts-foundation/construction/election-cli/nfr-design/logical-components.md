# Logical Components — election-cli(nfr-design)

> 上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md、business-rules.md、frontend-components.md

## モジュール構成

| コンポーネント | 責務 | 公開 API(狭い面のみ) |
|---|---|---|
| `scripts/amadeus-election.ts` | U5 全体(CLI エントリ+指令ループ)— 配置の典拠は unit-of-work.md U5 行+ADR-1(U-01=B 裁定) | CLI verb 群(next/report/open/notify/vote/status/tally/render/verify — business-logic-model.md の verb 表全数)。型: ReportResult/TransitionError(domain-entities.md 宣言) |
| 内部(非公開) | 7状態決定表・exit code 写像・argv parse — 実装詳細として非 export | なし(検証は CLI 経由の e2e+機械実行器) |

- スタイルは functional-domain-modeling-ts 既決(project.md Code Style): ReportResult は判別ユニオン。CLI 層はドメイン型を持たず U1〜U4 の配線のみ(手書き argv parse — tech-stack-decisions.md の CLI フレームワーク却下と一体)
- 依存方向: U5 → U1/U2/U3/U4 の4ユニット(unit-of-work-dependency.md:27 — depends_on 全部品)。U6 が U5 を転送(:29)

## NFR 横断の設計制約

- 保証の層別: **出力契約**(stdout/stderr/exit — reliability-requirements.md)は frontend-components.md 表の e2e 写像が担い、**実行境界**(検証バイパス排除・読取専用 next — security-requirements.md)は verb 配線の単線性が担い、**規模前提**(performance-requirements.md/scalability-requirements.md)は選挙単位スコープが担う。追加モジュール不要(tech-stack-decisions.md と一体)

## テスト配置

- 機械実行器 e2e は e2e 層(unit-of-work.md U5 行と整合)。verb 単位の exit code 検証も e2e 基盤に同乗
