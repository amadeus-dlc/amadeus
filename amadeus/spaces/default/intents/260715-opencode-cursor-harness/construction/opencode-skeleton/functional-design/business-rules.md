# Business Rules — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: requirements.md(FR-1/FR-2/FR-4)、application-design の component-methods.md(型契約)/ components.md(AC-5c 目録)/ services.md、unit-of-work.md / unit-of-work-story-map.md。

## ルール一覧(検証可能形)

| ID | ルール | 検証 |
| --- | --- | --- |
| R-U1-1 | manifest は `HarnessManifest` 全必須フィールドを満たす — 特に `authoredExempt` は空でも `[]` を明示(未設定は package.ts:668 で TypeError) | typecheck + `bun scripts/package.ts` exit 0 |
| R-U1-2 | core(`packages/framework/core/`)・`scripts/`・installer に変更を加えない | AC-4d grep: `git diff main.. -- packages/framework/core/ scripts/ packages/setup/ \| grep -iE "opencode\|cursor"` ヒット0(レビュー観点) |
| R-U1-3 | emit は write⇔check 対称(emission table 駆動)— check モードで書き込みゼロ | dist:check を2回連続実行して冪等 exit 0(落ちる実証: table のエントリを故意に欠いて DIFFERS/MISSING が赤くなることを1回実測) |
| R-U1-4 | `dist/opencode/.opencode/tools/data/harness.json` は writeHarnessData 生成の `{"harnessDir":".opencode","rulesSubdir":"amadeus-rules"}`(2フィールド、既存4 harness と同形 — E-OC15 訂正)を返す | smoke 実測(AC-1d)+ amadeus-lib.ts:175-189(shippedRulesSubdir — rulesSubdir() の内部ヘルパーによる harness.json 読取)/:191(rulesSubdir())の解決経路で doctor が読む |
| R-U1-5 | 既存4 harness の dist に byte 差分を生じない | `bun run dist:check` exit 0(AC-4b) |
| R-U1-6 | 逸脱(設計にない構造・要件との乖離)は実装前に停止して conductor へ報告 | deviation-stop-before-implement(ディスパッチプロンプト明記) |
| R-U1-7 | 実装時に閉じ列挙目録(AC-5c、components.md 添付)の第3独立再列挙を行い差分を報告 | enumeration-reverify-at-implementation |

## 完了条件(U1 ゲート、bolt-plan と同一)

`bun scripts/package.ts` exit 0 / `bun run dist:check` exit 0 / `bun run typecheck`・`lint`・`promote:self:check`・`tests --ci` exit 0 / 手動配置で --version・--doctor 実測 / AC-2b 最小疎通(directive 受領1回)/ push 前 lcov diff 未カバー0 / deslop 実施。
