# Performance Test Instructions — 260719-cursor-complete-clear

上流入力(consumes 全数): code-generation-plan, code-summary

## 方針(比例選定)

専用の性能 SLO は本 bugfix に存在しない(観測系変更なし)。比例選定(build-and-test:c1)として以下のみ:

## 観測

- status ゲートの追加 I/O(appendAuditEntryUnlocked 毎の registry 読取)は architecture-reviewer が非ブロッキング所見として許容判定済み(code-summary 参照 — 監査追記頻度でファイル1読取)。専用ベンチは追加しない。
- フルスイート実行時間の顕著な悪化がないこと(--ci PASS の wall-clock が既存レンジ内)で代替観測する。
