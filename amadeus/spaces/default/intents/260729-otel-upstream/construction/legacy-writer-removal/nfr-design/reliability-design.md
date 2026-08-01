# Reliability Design — U8: legacy-writer-removal

上流入力（consumes 全数）: performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md（すべて参照済み）

reliability-requirements.md の中核（false-green の排除・削除後 green 維持・retention 判定の機械再現性）に対する設計。

## false-green の排除設計

- 判定不能（fixture 欠損・report 未到達等）の条件は verdict を `UNKNOWN` とし PASS にしない。`overall` は FAIL/UNKNOWN を 1 件でも含めば `BLOCKED`（BR-12）。判定不能を成功扱いする経路を評価器に作らない
- 段階的削除は認めない（BR-1）。六条件すべてが PASS で `overall = "GREEN"` の場合に限り削除を開始する
- 同一入力（同一 HEAD・同一 fixture・同一 report）に対し六 checker すべてが同一 verdict を返す。時刻・乱数・環境差分に依存する判定を持たない。同一 fixture 2 回実行で report の verdict 一致を検証する

## 判定器の双方向検証設計

- 条件 (a)(d)(e) の各判定器は「未達状態で FAIL・達成状態で PASS」の両状態を fixture 差替えで確認してから評価器に組み込む（BR-15、テスト先行の同一コミット red-green）
- 条件 (d) の「同等以上」は劣化なし＋改善許容と解釈し、新側が旧側より劣る指標が 1 つでもあれば FAIL（BR-9）

## 削除後検証と rollback の設計

- 削除後検証として canonical 経路（`emitEvent` → AuditLogExporter）テスト＋ゲート再評価を実行し GREEN を確認する。FAIL 時は git revert で復元し、fail となった条件を再検証するまで再削除を試みない（BR-13、business-logic-model.md § 旧 writer 削除フロー 4-5）
- rollback 手段は git revert＋変換前 backup のみ（BR-3）。部分復元・手動修復を復旧経路に含めない
- v1 reader 削除後も doctor/recovery/presence/grant/merge/runtime graph/learnings が共通 reader 経由で v2-only Journal 上に動作することを出口不変条件とする（BR-5、FR-JRN-4）
- retention 判定は `intents.json` と既存 Intent の状態のみから決定的に導き、人手判断でスキップしない。retention 未達が 1 件でも残る間は v1 reader を維持する（BR-4、FR-MIG-5）
