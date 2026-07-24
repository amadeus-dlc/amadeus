# Performance Requirements — U5 completeness-sensor

上流入力: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 実行予算

- sensor は PostToolUse の同期処理として10秒以内に完了し、タイムアウト時は PASSED に丸めず FAILED とする。
- 登録簿の走査は O(entries)、SHA-256 計算は対象実装の総バイト数に対して O(bytes) とし、同一ファイルを1回の fire で重複読込しない。
- 100 entry・合計10MiBの固定fixtureを用い、warm-up 2回後に10回連続実行する。受入基準は各回10秒未満かつ最大値10秒未満とし、標本不足になる percentile 指標は用いない。

## 計測

- 計測対象は manifest dispatch から verdict 生成まで。同一process・同一fixtureで測り、OS、CPU、対象ファイル数、総バイト数、Bun版をテスト出力へ記録する。
- TLC 完全探索の時間は本 Unit の性能指標へ含めない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:15:32Z
- **Iteration:** 1
- **Scope decision:** none

性能・監査契約は概ね具体的ですが、モデル未更新を機械的に証明できない自己認証構造が NFR-3 と FR-4.2 を破っています。

### Findings

- Critical: model-map更新がモデルidentity変更を要求せず自己認証可能。
- Major: symlink containment、regular-file、size上限が未定義。
- Major: p95測定の標本契約が不足。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T15:20:54Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Critical 1件と Major 2件は、model/cfg identity 結合、ファイル境界強化、再現可能な最大時間基準によって閉包しました。

### Findings

- Closed — Critical: updateModelMap は model/cfg identity が直前世代から変化しない実装hashのみの更新を MODEL_UNCHANGED で拒否し、canonical record を atomic publishするため、自己認証経路は閉じています。
- Closed — Major: repo-root realpath containment、symlink・非regular file拒否、ファイル単位16MiB・総量64MiB上限が追加され、外部読取と無制限ブロックの境界が定義されました。
- Closed — Major: percentile 指標を撤回し、100 entry・10MiB fixture、warm-up 2回、10回連続、各回および最大値10秒未満という再現可能な受入基準へ置換されました。
- Validation: stage 宣言sensorはpass-list内に実行コマンドまたは結果がないため未実行です。
