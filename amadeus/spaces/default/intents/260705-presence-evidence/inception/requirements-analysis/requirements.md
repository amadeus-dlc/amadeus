# Requirements：260705-presence-evidence

## Intent 分析

### 目的

Issue #506 の受け入れ条件を、人間の個別承認で確定した結論（候補 3 = 設計境界の文書化のみ。DECISION_RECORDED requirements-analysis、2026-07-06 08:43 JST）に沿って充足する。

1. docs-only 宣言の evidence 検証について presence 相関の要否が判断されている（= 不採用の確定、理由付き）。
2. 設計境界が文書化されている（audit-format.md への明文化）。

### 上流の位置づけ

- 採否判断の正は本ステージの DECISION_RECORDED（人間個別承認）である。判断材料は feasibility の実測 2 件と requirements-analysis-questions.md の突き合わせ表にある。
- 文書化対象の現行実装: `verifyDocsOnlyEvidence`（amadeus-state.ts）、`GUARD_EXEMPTED` の emit、presence ledger（`humanActedSinceGate`）。

## 機能要求

### FR-1: audit-format.md への設計境界の明文化

- FR-1.1: `GUARD_EXEMPTED`（または docs-only 宣言）を扱う節に、evidence 検証の設計境界を追記する: 検証は「形式 + 対象 Intent の audit shard への実在照合」までであり、evidence が人間由来であることの機械的証明は対象外である。
- FR-1.2: 防衛線の整理を明記する: (1) 免除発動は GUARD_EXEMPTED として必ず audit に残り、参照先 decision も同じ audit にあるため偽装は監査で追跡可能、(2) merge は人間が行う PR gate が最終防衛線、(3) 多体運用では承認転記の decision は中継承認定型文の受信直後に限る（team.md）。
- FR-1.3: 不採用 2 案の理由を記録する: 候補 1（presence 相関）= 二重に契約級の変更（相関導入 + mint 規律のディスパッチ受信時拡張）を要する割に、HUMAN_TURN 頻発環境では相乗りが可能で攻撃モデルへの防止効果が限定的。同秒ティアにより秒窓判定となり意味論も緩む（実測 2 件は Intent record を参照）。候補 2（GATE_APPROVED 限定）= 承認転記運用と正面衝突 + 意味論不適合。
- FR-1.4: #497 確定判断 8 の mint 規律は改定しない旨を明記する（presence 意味論は不変）。
- FR-1.5: 文書は既存 audit-format.md の見出し・語彙・スタイルに合わせる（生成前チェック）。新設見出しを追加する場合は、同文書冒頭の自己参照カウント（`70 events, 18 categories` 等）との整合も確認し、必要なら更新する。

### FR-2: 検証

- FR-2.1: PR 作成前に validator（Intent 指定）と `npm run test:all` を実行し、結果を記録する。
- FR-2.2: 文書変更のみのため新規 eval は作らない（既存 test:all が文書リンク等を壊していないことの回帰確認を兼ねる）。
- FR-2.3: 文書化する記述は、code-generation 実行時点で `verifyDocsOnlyEvidence`（tools/amadeus-state.ts の該当実装）を再読了し、現行実装と一致することを確認してから書く（requirements 時点のスナップショットの写経を完了と扱わない。将来のドリフト検出は本文書が実装ファイル・関数名を明示参照することで PR レビューに委ねる）。

## 非機能要求

- NFR-1: audit-format.md は全文英語であることを確認済みのため、追記も英語で書く（既存スタイルに一致させる。日本語成果物の規範は record 側成果物にのみ適用）。
- NFR-2: 出典（Issue #506、PR #505 Bugbot 指摘、本 Intent の decision）を明示する。

## 制約

- C-1: エンジンコード（amadeus-state.ts 等）は変更しない（候補 3 の帰結。並行 Intent との接触も消滅）。
- C-2: 完了済み record は書き換えない。
- C-3: merge は人間が行う。

## スコープ外

- 候補 1 / 候補 2 の実装（不採用確定）。BL-1〜BL-3（backlog どおり）。

## 未解決事項

- O-1: audit-format.md 内の追記位置（GUARD_EXEMPTED 節か新設節か）は functional-design で確定する。
