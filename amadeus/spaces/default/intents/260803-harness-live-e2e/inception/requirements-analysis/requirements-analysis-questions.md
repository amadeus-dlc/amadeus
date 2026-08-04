# Requirements Analysis Questions — ハーネス横断 live E2E

参照入力: `intent-statement`、`scope-document`、`business-overview`、`architecture`、`code-structure`、`team-practices`。

> **E-OC1 判定証跡**: Q1はIssue #1717内の明示opt-in契約と既存Claude TUI runnerの自動opt-inが衝突するユーザー可視・課金安全契約であり、ユーザー本人の直接裁定Aを `2026-08-03T10:41:05Z` に受領した。Issueと承認済み上流成果物で確定済みの事項は再質問せず、初稿Q2/Q3は削除した。

## 質問選定基準

Issue #1717 と承認済み `scope-document` で確定済みの事項は質問しない。質問対象は、正本間の矛盾または実装契約を変える未確定の抜け漏れに限定する。

## Q1. Claude Code TUI の明示 opt-in をどの契約に統一しますか？

現状は `tests/run-tests.ts` が特定条件で `AMADEUS_TUI_LIVE=1` を自動設定しますが、共通契約は利用者による明示 opt-in を要求しています。

A. 自動設定を廃止し、TUI も専用環境変数による明示 opt-in を必須にする（推奨）
B. `--all` または `--release --debug` の指定自体を明示 opt-in とみなし、自動設定を維持する
C. 専用環境変数と既存 runner フラグの両方を明示 opt-in として許可する
D. Claude Code TUI だけ共通 opt-in 契約の例外として維持する
E. Claude Code TUI の接続を本 Intent から外し、直ちに後続 Issue 化する
X. Other (please specify)

[Answer]: A — 自動設定を廃止し、Claude Code TUIも専用環境変数による明示opt-inを必須にする。
