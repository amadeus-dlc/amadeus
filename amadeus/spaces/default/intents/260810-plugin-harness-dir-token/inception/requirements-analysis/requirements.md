# 要件定義 — plugin stage のハーネスパス中立化

Intent: `260810-plugin-harness-dir-token` / Scope: `self-fix` / Depth: **Minimal**
Focus: [Issue #2790](https://github.com/amadeus-dlc/amadeus/issues/2790)（ミラー [#2799](https://github.com/amadeus-dlc/amadeus/issues/2799)）
観測 ref: observed = `df1c874cfb397fafe877a72f00a82664a59689ae`（= repo HEAD = `origin/main`）

## 上流成果物の参照

本要件は Reverse Engineering ステージの成果物を一次入力とする。

- `business-overview.md` — Amadeus が「ハーネス中立な単一の方法論を全ハーネスへ投影する」ことを価値の中核に置く点。本件はその中核契約の破れである
- `architecture.md` — 新設節「plugin 配布の二経路と非対称なトークン置換器」。経路A（build-time packager、置換あり）と経路B（runtime compose、置換なし）の構成と、self-install が経路B に乗る非対称（N-3）
- `code-structure.md` — `plugins/` 権威ソース、`scripts/` パッケージャ、`packages/framework/core/tools/` ランタイムの三層配置
- `code-quality-assessment.md` — ガードの死角（N-5 / N-6 / t377 の述語・corpus ミスマッチ）
- `component-inventory.md` — 両経路の関数・定数の file:line 棚卸し

`intent-statement`・`scope-document`・`team-practices` は `self-fix` スコープで当該生成ステージが SKIP のため不在（設計どおりの欠落）。Intent の記述は起票時の `--arguments` と Issue #2790 本文が代替する。

## Intent 分析

達成したいのは「`:180` の 1 行を直すこと」ではなく、**plugin 機構のハーネス中立契約を、実際に配送される全経路で成立させること**である。患部は 1 行だが、その 1 行が正しく解決するかどうかは配送経路によって変わる。したがって受け入れ判定は「ソースがトークンになったか」ではなく「**各ハーネスの実ツリーで実パスに解決したか**」で行う。

- 種別: bug fix（既存契約からの実装逸脱）
- 範囲: 単一コンポーネント（plugin 配送）+ ドリフトガード
- 複雑度: Standard 寄り。患部は自明だが配送経路が 2 本あり、片方だけ直すと退行する

**深度に関する助言**: engine が解決した depth は Minimal。患部の小ささとは整合するが、配送経路の非対称という構造要因を含むため、実装時に想定外が出た場合は `--depth standard` への引き上げを検討されたい（depth 権限は engine にあるため本ステージでは変更しない）。

## 機能要件

### FR-1: 患部行のトークン化

`plugins/pr-convergence/stages/pr-convergence.md` のセンサー手動発火行の `.claude/tools/amadeus-sensor.ts` を `{{HARNESS_DIR}}/tools/amadeus-sensor.ts` に改める。これは core prose の確立された表現形（`packages/framework/core/` 配下の `.md` に `{{HARNESS_DIR}}/tools/` が 92 行実在）への復帰である。
**受け入れ**: 当該ファイルに対し `grep -c '\.claude/tools' ` = 0 件、`grep -c '{{HARNESS_DIR}}/tools/amadeus-sensor\.ts'` = 1 件（判定は行番号ではなく文字列述語で行う。同ファイルは本 intent の編集対象で行番号がずれるため）。

### FR-2: self-install seeding をトークン変換経由へ

`scripts/plugin-projection.ts:1031`（`projectInTemporaryWorkspace` の authoring `plugins/` verbatim `cpSync`）が、prose に対して `harness-transform.ts` の `transform()` を通るようにする。これが self-install 5 面の唯一の供給元である（呼び出し元は `scripts/promote-self.ts:382` `buildSelfInstallProjection`）。
**受け入れ**: `bun run promote:self`（= `bun scripts/promote-self.ts --apply`。`bun run build` はこれを内包する）を実行後、self-install 5 面それぞれの `plugins/pr-convergence/stages/pr-convergence.md` について、(i) 当該面の `<harnessDir>/tools/amadeus-sensor.ts` がちょうど 1 件、(ii) `{{HARNESS_DIR}}` の生リテラルが 0 件、(iii) **自面以外**の harnessDir リテラルが 0 件。

### FR-3: repo-root ソース経由の compose でも解決する

`packages/framework/core/tools/amadeus-plugin.ts` の `collectPluginSources`（`:821-838`）が repo-root `plugins/` を第一ソースにする dogfood 経路についても、**seeding 側で変換を通す**（Q1-A の第 2 の seeding 点）。compose 本体（`amadeus-plugin-compose.ts`）への置換器導入は採らない — Q1 で明示的に却下された経路であり、本文書の「スコープ外」に列挙してある。
**受け入れ**: `<harnessDir>/.amadeus-plugin-src/` を空にした状態から compose した composed stage について、FR-2 と同じ (i)(ii)(iii) の 3 条件が成立する。

### FR-4: consumer 導入バンドル面の解決

経路A の導入バンドル `dist/plugins/pr-convergence/<harness>/plugins/pr-convergence/stages/pr-convergence.md` が、8 面すべてで各ハーネスの実 tools パスに解決すること。N-1 のとおり `transform()` はこのコーパスに対し**一度も発火していない**ため、これは既存挙動の確認ではなく**新規の実証**である。
**受け入れ**: 8 面それぞれについて (i) 当該面の `<harnessDir>/tools/amadeus-sensor.ts` がちょうど 1 件、(ii) `{{HARNESS_DIR}}` の生リテラルが 0 件、(iii) 自面以外の harnessDir リテラルが 0 件。`kiro` と `kiro-ide` は `harnessDir` を共有するため両面とも `.kiro/tools/…` になる。

### FR-5: 落ちる実証（failing-first）

FR-2 と FR-4 のそれぞれについて、修正前に**赤になる**テストを先に置くこと。片方だけの green は他方の退行を隠すため、両面を同時に覆う。
**受け入れ**: 修正コミット前の断面で当該テストが fail し、修正後に pass する（両断面の実行結果を記録する）。

### FR-6: ドリフトガードの corpus 拡張

`tests/unit/t146-core-hygiene.test.ts` の走査根に `plugins/` を加え、plugin prose にハーネス固有ディレクトリのリテラルが混入したら赤になるようにする。偽陽性は 0 件を実測済み（`grep -rnE "\.(claude|kiro|codex)/" plugins/ --include='*.md'` = 患部 1 件のみ）のため carve-out の追加は不要。
**受け入れ**: 患部を修正前の内容に戻すと当該テストが赤になり、修正後の内容では緑になる。

### FR-7: ガード述語のハーネス網羅

`t146-core-hygiene` の `HARNESS_PATH_RE = /\.(claude|kiro|codex)\//` を 7 個の実 `harnessDir`（`.claude` `.codex` `.cursor` `.kimi-code` `.kiro` `.opencode` `.pi`）すべてへ拡張する。現状は 3 個のみで、`.opencode` `.cursor` `.kimi-code` `.pi` のリテラルは core prose に混入しても素通りする（N-5）。
**受け入れ**: (i) 新規に覆う 4 個（`.opencode` `.cursor` `.kimi-code` `.pi`）それぞれについて、当該リテラルを含む一時的挿入でガードが**赤になる**ことを 4 件示す（陽性判定。非退行だけでは正規表現の書き損じを検出できない）。(ii) 拡張後も既存 corpus（`packages/framework/core/`）が緑で carve-out 2 件が維持される。ハーネス名は `packages/framework/harness/*/manifest.ts` の `harnessDir` から取り、推測しない。

### FR-8: トークン下限テストの走査範囲の分離

`t146` の第 2 テスト（core `.md` のうち `{{HARNESS_DIR}}` を含むファイルが 50 件超）は core を前提とする。FR-6 で corpus を広げる際、この下限判定が `plugins/`（現在トークン 0 件）を巻き込んで壊れないよう、2 つのテストの walk scope を分離する。
**受け入れ**: corpus 拡張後、下限テストが引き続き core のみを対象に緑。

### FR-9: 兄弟 11 行の別 Issue 起票

root-relative なツール参照 11 行（`pr-convergence.md:54/:80/:162/:214`, `formal-model-check.md:48`, `tla-authoring.md:65/:68/:110/:113/:116`, `formal-model-check/README.md:111`）は本 intent では**修正しない**が、Issue を起票する。現状の判定は DEDUCED（consumer ワークスペースでの実行実測なし）であるため、起票本文にその限定を明記し、実測での確定を完了条件に含める。
**受け入れ**: Issue が起票され、本 intent の PR 本文と #2790 から相互リンクされている。

## 非機能要件

- **決定性**: 変換は純関数であること。同一入力・同一 `harnessDir` に対し出力がバイト単位で一致する（`t416` の冪等性・決定性テストを壊さない）
- **既存テストの非退行**: 経路A のピン（`t-plugin-projection`, `t-plugin-projection-packaging`, t303/t308/t310/t311/t254）と経路B のピン（`t416` 系）がすべて緑
- **観測可能性**: 生成物（`dist/`, self-install `plugins/`）は git 追跡外（追跡ファイル数 0 を実測済み）のため、修正の証跡はソースとテストで示す

## 制約

- `harness-transform.ts` の `transform()` は拡張子だけで分岐する（`.md` / `.md.example` のみ変換、`.json` / `.ts` は逐語）。この設計は維持する
- ハーネスは 8 面、`harnessDir` は 7 種（`kiro` と `kiro-ide` が `.kiro` を共有）。self-install 面は 5 面のみ
- `plugin.json` は composed ツリーへ配られない（staging `.amadeus-plugin-src/` にのみ存在、N-9）

## 前提

- consumer ホストは `installDoc`（`plugin-projection.ts:620-664`）の指示どおり導入バンドルを `<harnessDir>/.amadeus-plugin-src/<name>/` に置く。repo-root `plugins/` を作る運用は想定しない
- `t377-plugin-boundary-guard` は corpus に `plugins/` を持つが述語が `scripts/` 限定であり、本件のクラスは捕捉しない。今回は t146 側で塞ぐ
- staging 側（`<harnessDir>/.amadeus-plugin-src/<name>/`）の 5 ファイルは、FR-2 の変換点を seeding 側に置く以上、置換済みになる見込みである。N-4 が実測した漏洩 10 ファイルのうち composed 側 5 件は FR-2 (i)-(iii) で判定するが、staging 側 5 件については**置換済み・生トークン残存のいずれでも可**とし、判定対象から外す。理由は staging が中間生成物であり、consumer 面では既に置換済みバンドルが置かれる場所だから。実装後の実際の状態はゲートで報告する

## スコープ外

- **兄弟 11 行の修正**（FR-9 で Issue 起票のみ）
- **compose 本体への置換器導入**（Q1 選択肢B）— N-7 の staleness digest 設計判断を伴うため、必要になった時点で別 intent とする
- **N-2 の是正**（`dist/<harness>/<harnessDir>/plugins/` が生成されず header コメントと矛盾する件）— 設計文書と実装の齟齬であり本件の患部ではない
- **`boundary-guard.ts` の `SCAN_ROOTS` に `dist/kimi` `dist/pi` `.kimi-code` `.pi` が無い件** — 別クラスのカバレッジギャップ
- Issue #2791（pr-convergence の provenance 検査）— 別 intent（`self-feature`）で直列に着手する

## 未解決事項

- FR-2 と FR-3 の 2 つの seeding 点を単一の変換ヘルパで満たすか、それぞれ個別に満たすかは実装時の判断に委ねる（どちらでも受け入れ条件は同一）。compose 本体への置換器導入は Q1 で却下済みでスコープ外のため、この選択肢は含まない
- 兄弟 11 行が consumer で解決しないことは DEDUCED のまま。実 consumer ワークスペースでの実測は FR-9 の Issue 側に送る
- `harnessStageEntry` と `resolveHarnessToolsDir`（`amadeus-plugin.ts:368`）が prose 以外のランタイム経路でハーネス差をどこまで吸収しているかは UNMEASURED

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-10T05:49:36Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 3 件と ADVISORY 4 件はすべて CLOSED。FR-2/FR-3/FR-4 の受け入れが同一の (i)(ii)(iii) 3 条件に統一され、FR-7 に陽性判定が入った。新規 BLOCKER なし。

### Findings

- FOLLOW-UP | FR-3 — compose 実証の面数（dogfood 1 面か self-install 5 面か）が不定。実証面数を 1 語で固定すれば実装段の往復が消える
- FOLLOW-UP | NFR 観測可能性 — 未追跡生成物への grep 実測の証跡形式が一意でない。実測結果をゲート報告に添付すると明記されたい
