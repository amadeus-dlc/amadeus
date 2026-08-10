# コード生成計画 — fix-2790-plugin-harness-dir-token

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: **Minimal** / Test strategy: **Comprehensive**
観測 ref: `df1c874cfb397fafe877a72f00a82664a59689ae`

## 入力の由来（劣化入力の明示）

`self-fix` は units-generation と application-design を SKIP するため、`unit-of-work.md` と
application design は**設計どおり不在**（directive の `consumes_absent` が `expected: true` で明示）。
本計画は `<record>/inception/requirements-analysis/requirements.md`（FR-1〜FR-9）と、
brownfield の code knowledge base `amadeus/spaces/default/codekb/amadeus/`（N-1〜N-9）から scope した。
不在成果物の内容は一切創作していない。

## 追跡性（step -> FR）

- Step 1 -> FR-5（FR-6 の赤）
- Step 2 -> FR-5（FR-2 の赤）
- Step 3 -> FR-5（FR-4 の赤）
- Step 4 -> FR-1
- Step 5 -> FR-2
- Step 6 -> FR-3
- Step 7 -> FR-6
- Step 8 -> FR-7
- Step 9 -> FR-8
- Step 10 -> FR-2 / FR-3 / FR-4 の実ツリー実証
- Step 11 -> FR-9
- Step 12 -> NFR 非退行

## 実装ステップ

### 赤を先に置く（FR-5: failing-first）

- [x] **Step 1: `t146-core-hygiene` に `plugins/` コーパスの赤を置く**
  現行の `HARNESS_PATH_RE` のまま走査根に `plugins/` を加えると患部 1 件でヒットする。
  この時点でテストは**赤**であることを実行結果として記録する。

- [x] **Step 2: self-install seeding の変換を要求するテストを置く（赤）**
  `buildSelfInstallProjection` 経路（`plugin-projection.ts:1019-1067`）が prose のトークンを
  当該 `harnessDir` へ解決することを assert。トークンを含む fixture plugin を用い、
  現行実装（`:1031` の verbatim `cpSync`）では**赤**になることを記録する。

- [x] **Step 3: consumer 導入バンドル面の解決を要求するテストを置く（赤 or 緑を実測）**
  `projectPluginForHarness` / `installArtifacts` 経由の導入バンドルで、8 面それぞれの
  prose が自面の `harnessDir` へ解決することを assert。N-1 のとおり transform は
  plugin コーパスで未発火のため、**赤/緑どちらになるかを実測して記録**する
  （経路A は既に置換器を持つので緑の可能性が高いが、推測で書かない）。

### ソース修正

- [x] **Step 4: 患部行のトークン化（FR-1）**
  `plugins/pr-convergence/stages/pr-convergence.md` のセンサー手動発火行を
  `bun {{HARNESS_DIR}}/tools/amadeus-sensor.ts fire …` へ改める。

- [x] **Step 5: self-install seeding を transform 経由へ（FR-2）**
  `scripts/plugin-projection.ts:1031` の authoring `plugins/` verbatim `cpSync` を、
  prose に対し `harness-transform.ts` の `transform()` を適用するコピーへ置き換える。
  `transform()` は拡張子で分岐する純関数なので、`.json` / `.ts` は従来どおり逐語で運ばれる。

- [x] **Step 6: repo-root ソース経由の compose でも解決させる（FR-3）**
  `collectPluginSources`（`amadeus-plugin.ts:821-838`）が repo-root `plugins/` を第一ソースに
  する dogfood 経路についても、seeding 側で変換を通す。Step 5 と単一ヘルパで満たしてもよい。
  **compose 本体（`amadeus-plugin-compose.ts`）への置換器導入は禁止**（Q1 で却下、スコープ外）。

### ガード

- [x] **Step 7: `t146` の corpus 拡張を確定（FR-6）**
  Step 1 で置いた赤が、Step 4 の修正により緑になることを確認。
  患部を修正前の内容へ一時的に戻すと再び赤になることも示す（陽性判定）。

- [x] **Step 8: 述語を 7 harnessDir 全部へ拡張（FR-7）**
  `HARNESS_PATH_RE` を `.claude` `.codex` `.cursor` `.kimi-code` `.kiro` `.opencode` `.pi` へ拡張。
  ハーネス名は `packages/framework/harness/*/manifest.ts` の `harnessDir` から取り、推測しない。
  新規 4 個（`.opencode` `.cursor` `.kimi-code` `.pi`）それぞれで**赤になる**ことを 4 件示す。
  既存 carve-out 2 件は維持。

- [x] **Step 9: トークン下限テストの walk scope 分離（FR-8）**
  `t146` 第 2 テスト（core `.md` の `{{HARNESS_DIR}}` 保有が 50 件超）が `plugins/` を
  巻き込まないよう、2 テストの走査範囲を分離する。

### 実ツリー実証

- [x] **Step 10: 再生成して 8 面 + 5 面を実測（FR-2 / FR-3 / FR-4）**
  `bun run build`（`dist` + `promote:self`）を実行し、以下を grep で実測して出力を記録する。
  - consumer 導入バンドル 8 面: (i) 自面の `<harnessDir>/tools/amadeus-sensor.ts` が 1 件
    (ii) `{{HARNESS_DIR}}` 生リテラル 0 件 (iii) 自面以外の harnessDir リテラル 0 件
  - self-install 5 面: 同じ (i)(ii)(iii)
  - staging 側 5 件の実際の状態も**判定はしないが記録**する（要件の「前提」節の約束）

### 付随

- [x] **Step 11: 兄弟 11 行の Issue 起票（FR-9）**
  判定が DEDUCED である旨（consumer ワークスペースでの実行実測なし）を本文に明記し、
  実測での確定を完了条件に含める。#2790 と相互リンクする。

- [x] **Step 12: 非退行の確認（NFR）**
  経路A のピン（`t-plugin-projection`, `t-plugin-projection-packaging`, t303/t308/t310/t311/t254）と
  経路B のピン（`t416` 系）、および `bun run typecheck` / `bun run lint` が緑。

## テスト方針（Comprehensive）

要件駆動 + リスク駆動。新規テストは以下の 3 面に置く。

- **ユニット**: `harness-transform` の適用範囲、`t146` の述語と corpus（Step 1 / 7 / 8 / 9）
- **統合**: self-install 投影（`t416` 系に追加、Step 2）、consumer 導入バンドル投影（`t-plugin-projection-packaging` 系に追加、Step 3）
- **回帰**: 既存ピンの非退行（Step 12）

テスト設定ファイル（`vitest.config` 等）の新規追加は不要 — 既存の `bun tests/run-tests.ts` 構成を使う。

## 除外（明示）

- compose 本体への置換器導入（Q1 で却下）
- 兄弟 11 行の**修正**（Step 11 の起票のみ）
- N-2 / `SCAN_ROOTS` 欠落 4 面の是正
