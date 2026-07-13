# Release & Migration Closure Frontend Components

## 適用判定

U-06はGUI、web frontend、form、AWS consoleを持たない。`unit-of-work.md`と`unit-of-work-story-map.md`はmaintainer向けrelease closure、`requirements.md`はtest/distribution/docs/Issue、`components.md`と`component-methods.md`はC-04/C-12、`services.md`は短命local processだけを定義する。したがってcomponent hierarchy、props/state、visual interaction、form validationはN/Aである。

engine directiveのproducesに含まれるため、本成果物はCLI/release reportのfeedback contractだけを記録する。

## CLI feedback contract

read-only closure checkはstdoutへ`ReleaseClosureReportV1`のmachine-readable JSONを1件だけ出す。stderrは人向け診断で、成功時は空、失敗時は次だけを表示する。

- candidate tree digestの短縮値。
- `blocked` domain/code/subject ID。
- secretを含まないrerun command ID。
- live不足時のdriver/harness journey ID。
- migration Issue不正時のmarker/status/checklist ID。

raw command、env値、provider output、prompt、session path、credential、GitHub API responseを表示しない。

## Exit status

| Exit | 意味 | stdout | stderr |
|---:|---|---|---|
| 0 | 6 domainがgreenでclosure closed | closed report | 空 |
| 1 | valid inputだがred/missing receipt | blocked report | finding要約 |
| 2 | schema、repository、tree bindingが不正 | error envelope | 修正可能なcode |
| 3 | Issue重複/closedなど外部状態が曖昧 | blocked report | 手動確認code |

skip、auth不足、unknown profileはexit 0にしない。色だけで状態を表現せず、`closed`/`blocked`とcodeを常に文字で出す。

## Human-readable release summary

Markdown reportはJSON正本から生成し、次の固定順で表示する。

1. Production registry: provider/driver cardinality、placeholder count。
2. Distribution: 4 dist tree、self-install、setup。
3. Documentation: semantic coverage ID。
4. Platform: macOS/Linux deterministic、Windows対象外。
5. Native live: 4 driverとKiro CLI/IDE journey。
6. Migration: 0.2.0 Issueのnumberとclickable URL。

各rowは`green`、`red`、`missing`のいずれかで、空欄をpassとみなさない。Issueを言及するときは必ずURLを付ける。

## GitHub Issue interaction

Issue ensureは非対話の暗黙作成をしない。Code Generationで明示的に実行し、結果を次へ分類する。

- open 1件: `reused`とnumber/URLを表示する。
- 0件から作成: `created`とnumber/URLを表示する。
- multiple/closed only: 外部状態を変更せずexit 3にする。

title/body/checklistは日本語で、0.2.0削除を今回実行しないことを明記する。

## Kiro CLI / Kiro IDE、Claude、Codex一貫性

release checkはharness内へselection proseを複製しない。C-12が同じcore contractを4 harnessへ投影し、docs receiptとpackage parityが差分を検出する。harness固有の表示差はnative UI構文だけで、driver値、error code、fallback、legacy意味を変えない。

## Accessibilityとplatform

GUIがないためvisual accessibilityはN/Aである。JSON key、text status、exit codeを併用し、色やemojiだけへ依存しない。macOSとGitHub Actions Linuxだけを検証対象として表示し、Windowsを`green`、`supported`、`verified`と表示しない。

