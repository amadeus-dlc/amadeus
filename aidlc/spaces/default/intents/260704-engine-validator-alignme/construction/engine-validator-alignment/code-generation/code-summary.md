# Code Summary — engine-validator-alignment

Unit: engine-validator-alignment（bugfix scope、単一 unit）
Source: code-generation-plan.md（Step 1〜9 完了）、requirements.md（FR-1〜FR-4、NFR-1〜NFR-2、AC-1〜AC-3）

## 変更ファイル

### エンジン（`.agents/amadeus/tools/`）

- `amadeus-lib.ts` — FR-1: `birthIntent` と `migrateFlatLayout` の registry status を `in-flight` から `in_progress` に変更。FR-3.1: `birthIntent` が `repos` を常に配列で書く（空の場合は `[]`）。
- `amadeus-utility.ts` — FR-3.2: `handleIntentBirthStateBuild` が書く state template の `## Current Status` に `- **Construction Autonomy Mode**: unset` を追加。
- `amadeus-runtime.ts` — FR-4: runtime graph compile が stage 行の `memory_path` を `relativeMemoryPath(phase, slug, relativeRecordDir(projectDir))` で書くように変更（record prefix を通す）。
- `amadeus-learnings.ts` — FR-4: `handleSurface` の phase 解決を `memory_path` の先頭 index（`split("/")[1]`）から末尾 3 番目のセグメントに変更。

### validator（`.agents/skills/amadeus-validator/validator/` と正準ソース `skills/amadeus-validator/validator/` の両方）

- `AmadeusValidator.ts` — FR-1.2: `registryStatusValues` に後方互換として `in-flight` を追加。FR-3.3: registry の `repos` 未設定を後方互換として pass 扱いに変更。
- `lifecycle-v2.ts` — FR-2: `checkPhaseEvents` の phase 名照合を大文字小文字非依存に変更（`PHASE_VERIFIED` / `PHASE_SKIPPED` の両方）。FR-3.3: `Construction Autonomy Mode` 未設定を後方互換として pass 扱いに変更（設定済みの値は従来どおり許可値検査）。

### テスト（dev-scripts/evals）

- `dev-scripts/evals/engine-e2e/check.ts` — sandbox 上の intent-birth 実行に対する検証を追加。FR-1（status: in_progress）、FR-3.1（repos 配列）、FR-3.2（Construction Autonomy Mode: unset）、FR-4（runtime compile → record diary 作成 → `surface` が `memory_entries_total: 2` と `phase: "ideation"` を返す）。
- `dev-scripts/evals/amadeus-validator/check.ts` — V18（FR-1.2: 既存 record の `in-flight` が pass）、V19（FR-2: 小文字の `**Phase**: ideation` と `**Phase boundary**: initialization → inception` が pass。大文字表記は既存 V12 が担保）、V20（FR-3.3: `repos` と `Construction Autonomy Mode` 未設定の record が pass）を追加。

### 計画外の追加修正（AC-3 成立に必須）

- `dev-scripts/data/parity-map.json` — parity-check が上流 baseline とのエンジン hash 照合で fail するため、修正した 4 ツール（上流名 `tools/aidlc-{lib,utility,runtime,learnings}.ts`）を `engineFileExceptions` に宣言し、理由を `exceptions` に記録した。上流が同修正を取り込んだら例外を外して hash 照合に戻す。
- `skills/amadeus-validator/validator/{AmadeusValidator,lifecycle-v2}.ts` — promote-skill eval が正準ソースと `.agents/skills/` の promoted コピーの一致を要求するため、validator 修正を正準ソースにも同一内容で反映した。

## 主要な実装判断

### `repos` 既定値の導出（requirements.md 未解決事項）

空配列 `[]` を既定値とした。根拠: `intentRepos` は registry 行の `repos ?? []` を返すため、`resolveConstructionRepo` は `[]` と「行なし」を同一（`repos.length === 0` → lone-repo 推論、cwd=projectDir）に扱う。検出したリポジトリ名を書く案と異なり、construction path の推論挙動が一切変わらない。なお `--repos` 指定または sibling 自動発見がある場合は従来どおり非空集合が書かれる（`resolveBirthRepoSet` の挙動は不変）。flat 移行（`migrateFlatLayout`）の registry 行は既存 record の移行であるため `repos` なしのまま据え置き、validator の未設定許容でカバーする。

### FR-4 の根本原因

2 つの独立した欠陥の複合だった。

1. **カウント 0 の原因**: runtime graph compile（`amadeus-runtime.ts`）が stage 行の `memory_path` を `relativeMemoryPath(phase, slug)` と record prefix なしで呼んでいたため、`aidlc/spaces/default/intents/<phase>/<slug>/memory.md` という intent ディレクトリ抜きの実在しない path が記録されていた。`surface` はこの path を読み、存在しないファイルを空文字として parse するため常に 0 件になった（`parseMemoryEntries` 自体は実 memory template を正しく parse する）。
2. **phase が `spaces` になる原因**: `handleSurface` が `memRel.split("/")[1]` と先頭からの固定 index で phase を解決しており、record path 形式（`aidlc/spaces/...`）では 2 番目のセグメント `spaces` を拾う。`memory_path` は常に `<可変長 prefix>/<phase>/<slug>/memory.md` の形なので、末尾から 3 番目のセグメント解決に変更した。1. の修正だけでは phase は直らない（正しい record path でも `split("/")[1]` は `spaces`）ため、両方の修正が必要だった。

## テストカバレッジ

Minimal 戦略（FR 1 件につき検証 1 件、FR-2 のみ 2 形式を対で検証）。全 FR で RED を確認してから GREEN 化した（NFR-1）。

| FR | RED（修正前の失敗根拠） | GREEN 検証 |
|----|----|----|
| FR-1 | engine-e2e: `status: "in-flight"` / validator eval: `` `status` が許可値である — in-flight `` | engine-e2e FR-1 チェック、validator eval V18 |
| FR-2 | validator eval: `Skipped の phase は PHASE_SKIPPED イベントを持つ — Ideation` と `Verified の phase は PHASE_VERIFIED イベントを持つ — Inception` の両方 | validator eval V19（PHASE_VERIFIED / PHASE_SKIPPED 両形式） |
| FR-3 | engine-e2e: `repos — undefined`、`Construction Autonomy Mode` 行なし | engine-e2e FR-3.1 / FR-3.2 チェック、validator eval V20（未設定許容） |
| FR-4 | engine-e2e: `memory_entries_total: 0`、`phase: "spaces"` | engine-e2e FR-4 チェック（実エントリ数 2、phase: ideation） |

`npm run test:all` は exit 0 で全件 pass（AC-3）。既存 record（`aidlc/spaces/**`）への書き換えはない（NFR-2。`git status` で確認。本 Intent の record 追記と、前ステージ由来の registry 追記・learnings 反映・audit 追記のみ）。

## 計画からの逸脱

- parity-map.json の `engineFileExceptions` 宣言と、正準ソース `skills/amadeus-validator/` への同一修正の反映は計画に含まれていなかった。いずれもエンジン／validator を修正した必然の随伴変更で、`npm run test:all`（Step 9、AC-3）の成立に必須だった。詳細は diary（memory.md）の Deviations を参照。

## 残観測（別 Issue 候補）

- `amadeus-state.ts` advance の stdout JSON `memory_path`（L998 付近）にも record prefix 抜けが残る。FR-4 の対象（runtime graph と surface）ではないため未修正。
- intent-birth の state-build は scope 外ステージを `[ ] <slug> — SKIP` と書くが、validator は `[S]` を要求する。本 Intent の実 record がこの検査で fail する（Issue #455 の 3 不整合とは別系統）。requirements の範囲外（対象外検査項目の変更禁止）のため据え置き。

## Review

レビュー担当: amadeus-architecture-reviewer-agent（code-generation ステージ）

検証ツールの実行結果は次のとおりである。

- `npm run test:it:amadeus-validator` は exit 0 で pass した（V18〜V20 を含む）。
- `npm run test:it:engine-e2e` は exit 0 で pass した（FR-1、FR-3.1、FR-3.2、FR-4 の各チェックを含む）。
- `npm run typecheck` は exit 0 で pass した。
- `npm run test:it:parity` は本レビュー環境のサンドボックス制約（一時ディレクトリへの git clone 不可）で再実行できなかった。parity-map.json の例外宣言は静的に確認した。

所見は次のとおりである。

- FR-1 から FR-4 のすべてが確定回答（Q1=B、Q2=C、Q3=A、Q4=A）どおりに実装されている。差分を直接読んで確認した。エンジン全体を検索し、registry status として `in-flight` を書く箇所が残っていないことも確認した。
- FR-2 の照合は `PHASE_VERIFIED` と `PHASE_SKIPPED` の両方で大文字小文字非依存になっており、エンジン側の表記と記録済み audit イベントには手を入れていない（FR-2.3 遵守）。V19 は `**Phase**: ideation` と `**Phase boundary**: initialization → inception` の両形式を検証しており、requirements-analysis の Review が推奨した 2 形式のテストを満たしている。
- FR-3 の `repos` 既定値を空配列とした判断は妥当である。`intentRepos` が `entry.repos ?? []` を返すこと（amadeus-lib.ts L1595）を確認しており、`[]` と行なしで construction path の推論挙動が変わらないという code-summary の根拠は事実と一致する。
- FR-4 の 2 段の根本原因分析（runtime graph の `memory_path` に record prefix が通っていない件と、`surface` の phase 解決が先頭固定 index である件）はコードで裏が取れた。末尾から 3 番目のセグメントで解決する新実装は、prefix なしの旧形式 `<phase>/<slug>/memory.md`（3 セグメント、index 0）にも互換で、可変長 prefix に対して安全である。
- RED 先行（NFR-1）は構造的に確認できる。追加された各検証は修正前のコードで必ず fail する内容（旧許可値集合に `in-flight` なし、旧照合は case-sensitive、旧 validator は `repos` 未設定と `Construction Autonomy Mode` 空を fail、旧エンジンは `in-flight` を書き `memory_path` が実在しない path）であり、code-summary の RED 根拠テーブルとも一致する。
- 正準ソース `skills/amadeus-validator/validator/` と promoted コピー `.agents/skills/amadeus-validator/validator/` の差分は byte 単位で同一である（diff の diff で確認）。
- NFR-2 は成立している。`aidlc/spaces/**` への差分は、ワークフロー運用に伴う純追記（audit shard の追記、本 Intent の registry エントリ追加、project memory の learnings 追記）のみで、既存内容の書き換えはない。なお本 Intent 自身の registry エントリは修正前の intent-birth が書いた `in-flight` のままだが、validator の後方互換で pass する。
- parity-map.json の `engineFileExceptions` は parity-check.ts の照合キー（上流 path 表記 `tools/aidlc-*.ts`）と一致しており、理由と解除条件（上流が同修正を取り込んだら例外を外す）が `exceptions` に記録されている。ただし例外中は該当 4 ファイルの上流 drift（hash 不一致と欠落の両方）が検知されない点は運用上の留意事項である。
- 軽微な指摘 1: AC-1 の文言（intent-birth 直後からワークフロー完了直後まで手動補正なしで pass）は、残観測に記載された `SKIP` 表記と `[S]` 要求の不整合により、厳密には完全成立していない。これは Issue #455 の 3 不整合とは別系統で、requirements の範囲外（対象外検査項目の変更禁止）に該当するため据え置きは妥当だが、別 Issue の起票を推奨する。
- 軽微な指摘 2: case-insensitive 化により、phase 名が event 本文のどこかに現れれば一致する部分文字列照合の緩さは残る。これは既存の照合方式の性質であり、本変更で悪化していない。

Verdict: READY
