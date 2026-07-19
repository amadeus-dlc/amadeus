# Performance Requirements — election-model(nfr-requirements)

> 上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 性能特性と目標

U1 は純関数層(business-logic-model.md エラー処理節: shuffleView/tally/canEarlyTally/classifyLate は全域関数)であり、入力規模はチーム選挙(現登録 14 名 — `team.sh amadeus` 実行出力「14 member(s)」、2026-07-19 実測・stage diary 記録)に閉じる。投票者数の上限は未確定だが、W-04(配布外・チームローカル)の運用実態上、数十名オーダーを超えない。この規模で専用の性能 SLO を新設しない(observability-setup:c3 — 実在しない service SLO を作らない)。

- 応答時間: 個別の数値目標を置かない。強制メカニズムは既存テストランナーのタイムアウト(tests/run-tests.sh — 単発実行の停止ガード)のみで、これは service SLO ではない
- アルゴリズム上限: shuffleView は Fisher-Yates O(n)、tally は票列の単一走査 O(n)(business-logic-model.md 決定表)。二次以上の計算量を導入しない
- 決定性が性能より優先: requirements.md NFR-3(同一入力→同一出力)。キャッシュ・並列化等の非決定要素を性能目的で持ち込まない(business-rules.md BR-10/BR-11 のテストが強制)

## 測定と検証

- 性能専用ベンチマークは追加しない(新規機構は既存で代替できない根拠がある場合のみ — inception 規模正当化ルール)。unit テスト(BR-10 の同一入力2回 deep-equal)が決定性を、既存ランナーのタイムアウトが停止性を検証する
- ランタイムは既存スタック(technology-stack.md の Bun/TS 実測)を踏襲する。起動時間の数値目標は置かない(未実測の数値を SLO 化しない — numbers-from-command-output-only)。CLI 応答性は既存ツール群(amadeus-*.ts)と同一 runtime 特性で足り、追加最適化を要求しない
