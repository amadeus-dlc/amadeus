# Business Rules — U1 perf-tier-and-migration

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## ルール一覧

- BR-U1-1: `--ci` の実行ファイル集合に tests/perf/ 配下を含めない(FR-1b / AC-1。services.md の blocking 区分準拠)
- BR-U1-2: `--perf` は tests/perf/ 配下の *.test.ts 全数を実行する(FR-1a。levelFiles の既存走査規則 :839 を流用 — 新規 discover 機構を発明しない)
- BR-U1-3: `--all` / `--release` は perf を含む(FR-1c)
- BR-U1-4: t05 が pin する既存 CLI 契約(不正 --parallel → exit 2・サマリ様式・planted-failure 伝播)を byte-identical に維持(FR-1d)
- BR-U1-5: 移設対象は components.md C-2 表の全数・それのみ(FR-1e の基準適用済み目録)。述語ピンテスト2件(latency-median-budget-gate / plugin-discovery-overhead-gate)は移設禁止(FR-1f)
- BR-U1-6: 分割・移設ファイルの covers: claim は両側保持し、registry --check で UNCOVERED 増加ゼロ(FR-5a)
- BR-U1-7: t258 の per-test timeout は 250_000(導出式・出典コメント必須 — FR-4a/AC-4)。t257 は 120_000 維持+判断コメント(FR-4d)
- BR-U1-8: 絶対 median 予算(500/750ms)・サンプル数(100×3)は変更しない(FR-4c — スコープ外)
- BR-U1-9: baseline 再カットと allowlist remap は同一 PR 内。remap は機械 remap+reason/現行行の直読照合の併用(FR-5b/5c)
- BR-U1-10: 移設後ファイルの size 宣言は正規 key(`// size:`)を使う。旧 `@test-size` 形は残さない(components.md C-2 — 無効注釈の是正)
- BR-U1-11: AC-5 の全検証コマンド exit 0 を push 前にローカル実測(cid:code-generation:local-lcov-pre-push)

## 落ちる実証(新設検証の完成条件)

- 新規 unit テストは perf tier 実装前に赤であること(Red 実測 — TDD)
- BR-U1-1 の検査(実行集合照合)は、意図的に perf ファイルを integration へ置いた注入で赤くなることを1回実証してから完成扱い(注入は commit しない — falling-proof-injection-one-set)
