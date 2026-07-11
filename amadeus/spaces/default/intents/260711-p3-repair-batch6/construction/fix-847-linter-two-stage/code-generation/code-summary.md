# code-summary — Bolt FR-5 / Issue #847

## 成果
- PR: https://github.com/amadeus-dlc/amadeus/pull/873
- ブランチ: `bolt/847-linter-two-stage`
- コミット: `066a9e590`

## 変更ファイル
- `packages/framework/core/tools/amadeus-sensor-linter.ts`（正本、tier-1 seam 群 + main export + dispatch）
- `packages/framework/core/sensors/amadeus-linter.md`（manifest description 再接地 — 元修正の喪失面）
- dist/self-install 4ハーネス（`.claude/` `.codex/` `dist/{claude,codex,kiro,kiro-ide}`）同期
- `tests/integration/t211-linter-lint-check.test.ts`（新規 hermetic テスト）

## 契約同等性と適合点
- #538 `c6597bf18` の2段検出契約（lint:check 優先 → eslint フォールバック）を現行正本 `packages/framework/core/` へ差分再接地。
- 元 `runLintScript`（process.exit 直呼び never）を exported seam へ分割: `detectLintScript` / `buildLintScriptOutput`(pure) / `runLintScript`(spawn 注入・env: process.env 明示) / `maybeRunLintTier` / `main` export。
- JSON locked shape 厳守。tier-2 eslint 経路は無改変。

## 落ちる実証
dist copy の `const tier1 = maybeRunLintTier(...)` を `const tier1 = null` へ一時 revert → t211 (a)(b) が exit 127（quiet PASS）で RED を実測 → 復元し 6/6 GREEN。

## 閉包実測（E-B6b 裁定 (B) 前提で更新）
scratch Biome プロジェクト（lint:check 宣言 + eslint 設定なし + lint エラー）で fixed sensor 直接実行 → `exit=0 / pass:false / findings_count:1`（rule=lint:check）。pre-fix の `exit 127 / no-eslint-config` quiet PASS は非再現。

**(B) 本 repo 相当構成での実測**: 裁定に従い root `package.json` へ check-only `lint:check`（既存 `lint` と同一の `bunx @biomejs/biome check tests/ packages/setup/ packages/framework/core/ scripts/`）を追加。projectRoot が repo root に解決される gated ファイル（例 `scripts/manifest-types.ts`）で sensor 直接実行 → `exit=0 / pass:true / findings_count:0`（tier-1 = 実 Biome 実行）。pre-fix の 127 quiet PASS は非再現、実 lint 結果がゲートに反映。

**モノレポ対応（E-B6b 範囲追補裁定により framework にも追加済み）**: `findProjectRoot` は gated ファイルから最寄り package.json へ解決する。`packages/framework/core/**` 配下は `packages/framework/package.json` に解決されるため、範囲追補裁定に従い同ファイルへも check-only `lint:check`（root と同一コマンド形、cwd=packages/framework に合わせ `../../` 前置で同一ターゲット群を check、既存 framework script の `../../` 慣習に整合）を追加。
- 閉包再実測（framework case）: `packages/framework/core/tools/amadeus-sensor-linter.ts`（projectRoot=packages/framework）で sensor 直接実行 → `exit=0 / pass:true / findings_count:0`（tier-1 = 実 Biome）。pre-fix の `exit 127 / no-eslint-config` quiet PASS は非再現。
- root case（projectRoot=root: scripts/・tests/・root 直下）も閉包済み（前述 `scripts/manifest-types.ts` 実測）。
- 両 package.json とも write/fix フラグなしの check-only。

## 同根棚卸し
- 元 diff 他ファイル面: manifest description の喪失を発見・同一 PR で再接地。package.json 面は旧 eval インフラ配線のみで superseded。
- 他 sensor: type-check は project script 無視型の同型欠陥なし（tsc はローカル解決、普遍的型検査器）。

## 検証（全 exit 0 / GREEN）
typecheck 0 / lint(Biome) 0 / dist:check 0 / promote:self:check 0 / complexity-gate --check 0 / gen-coverage-registry --check OK / t211 6 pass / t92+t93 58 pass。
push 前 lcov: 追加実行行（dist 153-244 + 418-421）は全被覆、diff 追加行未カバー 0。gen-coverage-registry drift なし（EXPECTED_NONE_TO_CLI 変更不要 — in-process import で mechanism=none）。

## codecov/patch 是正（オプション i: 小リファクタ、waiver 不要）
初版 push で codecov/patch 98.57%（missing 1行）。report API 公式確定（フル SHA 08a95c7e8）: missing は core `amadeus-sensor-linter.ts` の main() tier-1 分岐 `if (tier1) { ... }` の**閉じ括弧行**（`process.exit` 後に構造的に到達不能 → bun --coverage で DA:0。main は CLI spawn のみで走行、spawn 盲点）。exit 呼び出し自体は被覆済み。
- 対応: tier-1 分岐を block なしの2つの single-statement guard へ collapse（`if (tier1?.stdout) process.stdout.write(...)` + `if (tier1) process.exit(tier1.exitCode)`）。terminal exit の後続 block-close 行を消去。
- 挙動不変: stdout 書き出し順・exit code(0/127)・tier-2 非フォールスルー意味論を完全保存。t211 6件 + t92/t93/t68 回帰 68件で担保。framework/root 両 case の閉包実測も exit=0/pass:true で不変。
- 結果: tier-1 3行(dist 422-424)全て DA>0、patch 母集団から DA:0 行消失 → **waiver 不要**。

## E-B6b ユーザー裁定 (B) 採択
3対3同数 → ユーザーエスカレーション裁定で **(B) lint:check 限定維持 + 本 repo package.json へ lint:check script 追加**。決め手: 変異しうる lint script の自動実行リスク回避、起票者 e3 一次証言「または lint」は契約意図でない、#538 の限定は意図的安全設計。
- sensor 契約はコード変更なし（`lint:check` のみ、フォールバック非実装）。
- root `package.json` に check-only `lint:check` 追加（既存 `lint` と同一呼び出し、write/fix フラグなし）。
- 汎用 `lint` フォールバックは bugs-only スコープにより enhancement Issue で凍結起票（起票は conductor）。
