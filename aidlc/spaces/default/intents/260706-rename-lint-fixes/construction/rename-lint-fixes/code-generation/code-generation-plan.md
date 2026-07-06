# コード生成計画 — unit: rename-lint-fixes

上流入力は requirements.md（FR-1〜FR-4、NFR-1〜NFR-4、AC-1〜AC-6）である。
scope bugfix により functional-design / nfr-design / infrastructure-design は SKIP（設計どおりの不在）。要求と既存コード構造を事実上の設計として参照する。
Test Strategy は Minimal（要件駆動。TDD: RED 先行）。実行単位は単一 unit / 1 PR である。
B003 の実装は #528（PR #544）merge 後に conductor が直接実施した（Maintainer 指示 2026-07-06 02:39Z によるメイン直接処理。品質手順は維持）。

## トレーサビリティ

| Step | 対応要求 | 対象 |
|---|---|---|
| Step 1 | FR-4.2 / FR-1.2 / FR-2.2 | RED 先行：rename-leftovers eval の整備（許可リスト含む）|
| Step 2 | FR-1.1 | `amadeus-utility.ts` `skillMdPath()` の修正（skills/aidlc → skills/amadeus）|
| Step 3 | FR-2.1 | `amadeus-learnings.ts:84` の sensors 解決パターン修正（aidlc- → amadeus-）|
| Step 4 | FR-1.3 | `scope-table --check` の test:all 組み込み判断と package.json 更新 |
| Step 5 | FR-4.1 | parity-map 例外宣言の確認（既存宣言流用）|
| Step 6 | FR-3.2 / FR-3.3 / AC-6 | B003 設計確定：linter sensor 2 段階検出の実現形と検証仕様 |
| Step 7 | FR-3.1 / FR-3.2 | B003 実装：`amadeus-sensor-linter.ts` と `amadeus-linter.md` の更新（#528 merge 後）|
| Step 8 | AC-1〜AC-6 | 検証一式（`npm run test:all`、validator、B003 eval）|
| Step 9 | 成果物契約 | code-summary.md の作成 |

## 実行ステップ

- [x] **Step 1: RED 先行の eval 整備（FR-4.2 / FR-1.2 / FR-2.2）** — `dev-scripts/evals/rename-leftovers/check.ts` と `allowlist.json` を新規作成する。eval は次の 4 観点を決定論的に検査する: (a) tools/*.ts 内に旧名 `skills/aidlc` パス断片が残っていないか（join 引数パターン）、(b) tools/*.ts 内に `` `aidlc-${ `` テンプレートリテラルが残っていないか（sensor 解決の旧名）、(c) `.agents/amadeus/sensors/` の全 .md ファイルが `amadeus-` prefix で始まるか、(d) `amadeus-utility.ts scope-table --check` が exit 0 で完走するか。実装前に (a)(b)(d) が FAIL することを確認する（RED）。許可リスト（allowlist.json）には `aidlc-state.md`、`.aidlc-plan.json` 等の v2 互換名と、`amadeus-sensor-schema.ts` のデッドエラーメッセージ文字列を宣言する。
- [x] **Step 2: FR-1.1 実装** — `amadeus-utility.ts` の `skillMdPath()` を `join(TOOLS_DIR, "..", "..", "..", "skills", "amadeus", "SKILL.md")` へ修正する。`TOOLS_DIR` は `.agents/amadeus/tools/` であるため、3 段上がるとリポジトリルートに達し `skills/amadeus/SKILL.md` を正しく参照できる。修正後 eval (a)(d) が GREEN になることを確認する。
- [x] **Step 3: FR-2.1 実装** — `amadeus-learnings.ts:84` の `` `aidlc-${sensorId}.md` `` を `` `amadeus-${sensorId}.md` `` へ修正する。実在する 4 センサーファイル（`amadeus-linter.md`、`amadeus-required-sections.md`、`amadeus-type-check.md`、`amadeus-upstream-coverage.md`）の解決が一致することを eval (b)(c) の GREEN 確認で担保する。
- [x] **Step 4: FR-1.3 判断と package.json 更新** — `scope-table --check` を `rename-leftovers eval`（上記 (d)）経由で `test:it:rename-leftovers` として `test:it:all` に組み込む。**判断根拠**: scope-table の SKILL.md は、新しい Bolt scope を追加するたびに再生成が必要である。再生成を忘れると scope-table render と --check の出力が乖離し、`--check` が exit 非 0 になる（drift 検出として望ましい動作）。この drift を CI が自動検出することで、scope grid 変更時の SKILL.md 更新漏れを早期に発見できる。組み込まないと drift は人手レビューまで気づかれない。→ **組み込み採用**。`package.json` に `"test:it:rename-leftovers": "bun run dev-scripts/evals/rename-leftovers/check.ts"` を追加し、`test:it:all` 末尾に `&& npm run test:it:rename-leftovers` を追記する。
- [x] **Step 5: FR-4.1 parity 確認** — `dev-scripts/data/parity-map.json` の `engineFileExceptions` に `tools/aidlc-utility.ts` と `tools/aidlc-learnings.ts` が既存宣言済みであることを確認する（新規宣言不要）。`skills/` 正準ソース側（`skills/amadeus-utility/`、`skills/amadeus-learnings/` 等）が存在しない場合は反映不要（エンジン固有ファイル）。`npm run parity:check` でエラーがないことを確認する。
- [x] **Step 6: B003 設計確定（FR-3.2 / FR-3.3 / AC-6）** — 後掲「B003 設計仕様」節を参照。本 step は設計確定地点（bugfix scope は functional-design を持たないため code-generation-plan.md が設計確定地点）として AC-6 を充足する。
- [x] **Step 7: B003 実装（FR-3.1 / FR-3.2）** — #528 PR merge 後に着手する（NFR-2）。`amadeus-sensor-linter.ts` と `amadeus-linter.md` を「B003 設計仕様」に従って更新し、B003 eval の RED→GREEN を確認する。parity 宣言と skills/ 反映を同時に行う。
- [x] **Step 8: 検証一式** — `npm run test:all` pass、`npm run test:it:rename-leftovers` pass、B003 eval pass、`bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260706-rename-lint-fixes` pass を確認する。
- [x] **Step 9: code-summary.md 作成** — 変更ファイル、主要判断、RED→GREEN 証跡、検証結果、逸脱を記録する。B003 完了後に最終化する。

## B003 設計仕様（FR-3.2 / FR-3.3 / AC-6 設計確定地点）

### 問題

`amadeus-sensor-linter.ts` は `bunx eslint` をラップする。本リポジトリは eslint を使わず `lints/check.ts`（独自ハーネス、`npm run lint:check`）を使うため、gate 時に実 rule が効かない（quiet PASS の繰り返し）。`amadeus-linter.md` の description も「eslint by default」と記載しており、文書と挙動が乖離している。

### 実現形（候補 1、FR-3.2 Q4 確定）

**workspace の `package.json` に `lint:check` スクリプトが存在する場合はそれをラップし、存在しない場合は従来の eslint 検出→不在 exit 127（quiet PASS）へフォールバックする。**

この方式は次の制約を全て満たす。

- repo 固有パス（`lints/check.ts`）をエンジン本体に直書きしない（FR-3.2 設計制約「repo の開発用スクリプトを skill の実行時参照として書かない」規則）。
- `lint:check` スクリプトが存在しない workspace（例: eslint のみの別プロジェクト）では既存の quiet PASS 挙動を維持し、レグレッションを起こさない。
- sensor dispatcher（amadeus-sensor.ts）の機構は変更しない（NFR-4）。

### `amadeus-sensor-linter.ts` の変更仕様

```
function detectLintScript(projectRoot: string): string | null
  // projectRoot 以下の package.json を読み、scripts.lint:check が存在すればコマンド文字列を返す。
  // 不在または parse 失敗なら null。
```

実行フロー:

1. `--file-path` から `projectRoot`（最近傍 package.json のある dir）を既存ロジックで解決する。
2. `detectLintScript(projectRoot)` を呼ぶ。
3. `lint:check` スクリプトが存在する場合:
   - `npm run lint:check` を projectRoot で実行する（`bun x npm run lint:check` ではなく `bun run lint:check` でも可。package.json の scripts 経由が要件）。
   - exit 0 → `pass: true`、violations: []。
   - exit 非 0 → `pass: false`、stdout/stderr を violations として返す（file/line は `--file-path` を file に、詳細を message に詰める）。
4. `lint:check` スクリプトが存在しない場合:
   - 従来の eslint 検出（`bunx eslint --version` プローブ → 不在なら exit 127）へ進む。
   - exit 127 → dispatcher が quiet PASS として再分類（既存挙動維持）。

### `amadeus-linter.md` の変更仕様

`description:` フィールドを次のように更新する。

```
description: Wraps the project's configured linter; prefers 'lint:check' npm script if present, otherwise falls back to eslint detection (exit 127 = tool-unavailable = quiet PASS)
```

本文の説明も同様に 2 段階検出の挙動を反映する。「eslint by default for v0.5.0」という記述は実態と乖離しているため削除し、実際の挙動に合わせて書き直す。

### AC-6 検証仕様（FR-3.3 / #528 rule 有効化の確認）

#528 PR が merge されると `lints/check.ts` に `no-stub-compat` rule が追加される。B003 実装後、次の隔離 workspace 検査を eval で行う。

**eval 入力（設定）:**
- temp workspace を `mkdtempSync` で作成する。
- `package.json` に `"scripts": { "lint:check": "bun run lints/check.ts --check" }` を書く。
- `lints/check.ts` のスタブとして `no-stub-compat` rule に引っかかるパターン（例: `declare module '*.md'` などのスタブ互換宣言）を含む `.ts` ファイルを置く。
- sensor を `--file-path <stub-file-path>` で呼ぶ。

**eval 期待出力:**
- exit 0（sensor script 自体は常に 0 を返し、pass フィールドで結果を通知する）。
- stdout JSON: `{ "pass": false, "errorCount": 1, "violations": [{ "file": <--file-path 引数>, "rule": "lint:check", "message": <ハーネス診断出力（no-stub-compat の violation 行と許可リスト案内を含む）> }] }`。runLintScript は lint:check 全体を 1 violation に集約する設計であり、rule 名や違反ファイルの明細は message 内のハーネス出力で読む（reviewer 所見 B で記述を実出力形へ訂正）。
- SENSOR_FIRED 互換フォーマット（dispatcher が読める構造化出力）を維持する。

#528 が merge 前のうちは、この eval fixture だけ先行して作成し、#528 merge 後に `lints/check.ts` が rule を持つことを確認してから eval を有効化する（RED を踏む前に実装が整っている状態を回避するため）。

## 制約（requirements.md より）

- エンジン変更は parity-map の engineFileExceptions 宣言と skills/ 正準ソース反映を伴う（FR-4.1）。
- 新規検証は Bun + TypeScript、`package.json` には短い名前の薄い入口だけ足す。
- sensor dispatcher（amadeus-sensor.ts）の機構は再設計しない（NFR-4）。
- B003 実装は #528 PR merge 後（NFR-2）。
- 旧名パターン取りこぼし以外のリファクタリングはしない（Surgical Changes）。

## B003 実施記録（RED→GREEN 証跡、conductor 直接実施）

- RED（2026-07-06T02:47Z 頃）: `dev-scripts/evals/linter-sensor/check.ts`（4 観点: (a) lint:check fail → pass:false、(b) pass → pass:true、(c) 両方不在 → exit 127 維持、(d) no-stub-compat 実 rule fixture）を先に作成し、(a) が `exit 127 / no-eslint-config`（現行 eslint 経路）で fail することを確認した。
- GREEN: `amadeus-sensor-linter.ts` へ 2 段検出（detectLintScript / runLintScript）を実装後、4/4 ok。
- 文書一致（FR-3.1）: `amadeus-linter.md` の description と本文を 2 段検出の実挙動へ更新した。
- 実測補足: repo の `npm run lint:check` は 0.7 秒で、manifest の timeout_seconds: 30 に収まる（dispatcher 側 timeout の実測確認）。
- parity（FR-4.1）: engineFileExceptions へ `tools/aidlc-sensor-linter.ts` と `sensors/aidlc-linter.md` を追加し、exceptions へ理由 entry を追記した（上流が同等の 2 段検出を取り込んだら解除）。skills/ 正準ソース: エンジン固有ファイルのため対象なし（Step 5 と同じ判定）。

## reviewer 所見の記録（iteration 1、READY）

- 所見 A（skillMdPath の配布先考察、非ブロッカー）: 修正後の 3 段上パス（repo root の `skills/amadeus/SKILL.md`）は dev repo 専用であり、インストーラ配布先には `skills/` ソース dir が存在しない。採用理由: scope-table の write 対象は正準ソース（`skills/amadeus/SKILL.md`）であるべきで（昇格先 `.agents/skills/` への直接書き込みは「昇格手段を経由しない同期」の禁止に抵触する）、配布先で scope-table を再生成するユースケースは設計上存在しない（保守用 dev ユーティリティ）。配布先で --check を動かす要件が現れた場合は、source → 昇格先のフォールバック解決を後続で検討する。
- 所見 B（AC-6 期待 JSON の記述不正確、非ブロッカー）: 上記のとおり plan の期待 JSON を実出力形（rule = "lint:check"、明細は message 内）へ訂正済み。
