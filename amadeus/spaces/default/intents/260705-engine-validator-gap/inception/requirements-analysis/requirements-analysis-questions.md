# Requirements Analysis — 確認事項

Intent: 260705-engine-validator-gap（bugfix scope）
対象: Issue #457、#458（グループ A。#459 の扱いは Q1 で確定する）

事前調査で確認した事実:

- #457: `amadeus-state.ts` L998 の advance stdout JSON は、`relativeMemoryPath(...)` を record prefix なしで返している。runtime graph 側（`amadeus-runtime.ts`）は PR #456 で record prefix 付きに修正済みのため、同じ論理 path が 2 系統で異なる値になる。
- #458: `amadeus-utility.ts` L2351-2353 の state-build は scope 外ステージを `- [ ] <slug> — SKIP` で書く。validator（`lifecycle-v2.ts` L218-224）は scope 外ステージの checkbox に `[S]`（Skipped）を要求するため、intent-birth 直後の実 record が必ず fail する。本 Intent の record `260705-engine-validator-gap` 自身でも再現している。
- #459: 本 Intent の intent-birth でも Greenfield 誤判定（Languages/Frameworks Unknown）が再現した。

---

## Q1. #459（workspace-detection の Greenfield 誤判定）を本 Intent の範囲に含めるか

#457/#458 は「エンジンが書く値と validator の許可値の不整合」という同一系統（#455/PR #456 の続き）だが、#459 は workspace-detection の判定ロジックという別系統である。

A. 含めない。後続の別 bugfix Intent として同じ worktree で直列に対応する（推奨: 根本原因が別系統であり、#455 の前例も系統単位で Intent を分けている）
B. 含める。グループ A の 3 バグを本 Intent で一括修正する
C. #459 は今回保留し、Issue のまま残す
X. Other (please specify)

[Answer]: A

## Q2. #458 の修正方向はどちら側か

`[S]` の語彙は state 契約上「--stage/--phase ジャンプで skip した」の意味であり、scope 除外（`— SKIP` suffix）とは別概念である（#458 の注記どおり）。

A. validator を engine 契約に合わせる。scope 外ステージは「`[ ]` ＋ `— SKIP` suffix」（birth 直後の正常形）と「`[S]`」（ジャンプ後）の両方を合法にする（推奨: エンジンは上流 v2 由来でパリティ維持対象、validator は Amadeus 固有実装であり、#455/PR #456 も validator 側を合わせた前例がある）
B. エンジンを validator に合わせる。state-build が scope 外ステージを最初から `[S]` で書く（上流とのドリフトになり parity-map の engineFileExceptions 宣言が必要）
C. 両方変更する（エンジンは `[S]` を書き、validator は両表記を許可）
X. Other (please specify)

[Answer]: A

## Q3. #457 の修正方向

A. `amadeus-state.ts` advance の `memory_path` を record prefix 付き（`aidlc/spaces/<space>/intents/<dirName>/...`）へ統一する。PR #456 の runtime 側修正と同型（推奨: 2 系統の path 値を一致させる）
B. 現状維持とし、advance stdout の消費者側で record prefix を補完する
X. Other (please specify)

[Answer]: A

## Q4. 受け入れ条件と検証方法

A. TDD で進める。先に失敗する検証（#457: advance stdout の path 検査、#458: `— SKIP` 表記の実 record を validator が pass する検査）を追加して RED を確認し、修正後に `npm run test:all`・engine sandbox e2e・AmadeusValidator（本 Intent record 指定）がすべて green になることを受け入れ条件とする（推奨: dev-scripts ルールの必須要件）
B. 修正を先に入れ、既存検証の green のみ確認する
X. Other (please specify)

[Answer]: A