# Reliability Requirements — U8: legacy-writer-removal

上流入力（consumes 全数）: business-logic-model.md、business-rules.md、requirements.md、technology-stack.md（すべて参照済み）

本 Unit の信頼性の中核は「ゲート評価が決して false-green にならないこと」と「削除後もスイートが green を維持すること」「retention 判定が機械的に再現可能であること」の三点である。

## 目標

| 項目 | 目標 | 測定方法 |
|---|---|---|
| 判定不能の fail-closed | 実行不能な条件（fixture 欠損・report 未到達等）は verdict を `UNKNOWN` とし PASS にしない。`overall` は FAIL/UNKNOWN を 1 件でも含めば `BLOCKED`（BR-12） | 評価器の異常系単体テスト（checker 未実行・入力欠損の各経路） |
| 判定の再現性 | 同一入力（同一 HEAD・同一 fixture・同一 report）に対し、六 checker すべてが同一 verdict を返す。時刻・乱数・環境差分に依存する判定を持たない | 同一 fixture 2 回実行で report の verdict 一致を検証 |
| 条件 (a)(d)(e) の双方向検証 | 各判定器は「未達状態で FAIL・達成状態で PASS」の両状態を fixture 差替えで確認してから評価器に組み込む（BR-15、テスト先行） | 判定器ごとの FAIL→PASS ペアテスト（同一コミット red-green） |
| 削除後スイートの green 維持 | 削除後検証として canonical 経路テスト＋ゲート再評価を実行し GREEN を確認。FAIL 時は git revert で復元し、再検証まで再削除を試みない（BR-13） | 削除フローの統合テスト |
| v2-only 動作の出口不変条件 | v1 reader 削除後も doctor/recovery/presence/grant/merge/runtime graph/learnings が共通 reader 経由で v2-only Journal 上に動作する（BR-5、FR-JRN-4 完了条件） | v2-only fixture 上の対象ツール実行テスト |
| retention 判定の機械再現性 | retention 判定は `intents.json` と既存 Intent の状態のみから決定的に導かれ、人手判断でスキップしない。retention 未達が 1 件でも残る間は v1 reader を維持する（BR-4、FR-MIG-5） | 判定器の fixture テスト（達成／未達混在ケース） |

## 制約

- rollback 手段は git revert＋変換前 backup のみ（BR-3）。部分復元・手動修復を復旧経路に含めない
- 段階的削除は認めない（BR-1）。六条件すべてが PASS で `overall = "GREEN"` の場合に限り削除を開始する

## 検証

- 全 reliability 目標は `--ci` 層（smoke+unit+integration）で検証可能とし、e2e 層・live model・ネットワークに依存しない
