# setup-transaction-safety — Functional Design Questions

## 質問判定

質問は0件である。Issue #2130と承認済み`requirements`、`components`、`component-methods`、`services`、`unit-of-work`、`unit-of-work-story-map`により、全競合preflight、target-local staging、write-ahead journal、backup、manifestを含むcommit、逆順rollback、次回起動recovery、recovery前の新transaction拒否が確定している。

ユーザーの指示「Issueに書いていることは質問せず、矛盾と抜け漏れだけ質問する」に従い、既決事項を再質問しない。現行`Plan` / `Applier` / `ApplyWrite` / install manifestの不足は実装差分であり、製品判断を要する矛盾ではない。

## 解決済み設計判断

| 論点 | 採用 | 根拠 |
|---|---|---|
| commit単位 | managed file、廃止managed file、利用者向けbackup、install manifestを1 transactionに含める | FR-DST-001の部分適用0 |
| interruption方針 | durable commit decision前はrollback、decision後はcommit cleanupを完了 | 一意に収束し、commit済み更新を巻き戻さない |
| rename後・journal更新前 | before/after digestとstaging/backupの所在から判定 | crash境界でblind replayしない |
| 同時実行 | targetごとのexclusive admission lock | preflightからcommitまでのTOCTOUを防ぐ |
| conflict時のwrite 0 | payload、manifest、利用者fileへのmutation 0。lockは一時的なcoordination metadataのみ | 安全性と排他を同時に満たす |
| 廃止file | old manifestのchecksumと一致するmanaged fileだけremove actionへ変換 | 利用者変更を削除しない |
| symlink | target root外へ到達するancestor/leaf symlinkはpreflight conflict | lexical containmentだけのescapeを防ぐ |

## 上流トレーサビリティ

`unit-of-work`のSetupTransactionCoordinator ownership、`unit-of-work-story-map`のFR-DST-001 / NFR-REL-002〜003、`requirements`のfresh/update/idempotent/rollback、`components`のtarget-local transaction境界、`component-methods`のplan/apply/recover result、`services`の短命transaction lifecycleを用いた。
