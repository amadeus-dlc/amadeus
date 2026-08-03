# Scope Document — record-roundtrip-pbt

上流入力(consumes 全数): intent-statement.md（本書の問題定義・成功指標・裁定はすべて intent-statement.md から導出。feasibility-assessment / constraint-register は任意 consume で本 intent では不存在 — self-feature スコープは feasibility を SKIP）

## スコープ境界（In / Out）

### In（実施する）

intent-statement.md の Problem Statement が定める4要素＋ユーザー裁定3件（intent-capture）と本ステージ裁定2件を反映:

1. **election 境界**（Must・最優先）: 読み戻しの `JSON.parse as T` 無検査キャストを `Election.parse` 経由の fail-closed へ一本化。round-trip + fail-closed プロパティ、#1459 の shrink 最小反例固定（AC-2 第一候補 — 本ステージ Q2=A）
2. **state 境界**（Must）: `serializeMirrorBoundaryReceipts`/`parseMirrorBoundaryReceipts`・`setField`/`getField` の round-trip + fail-closed プロパティ
3. **静的ガード**（Must）: 共有バリデータ非経由の読み戻し経路を検出する callsite-guard 同型 allowlist ratchet（落ちる実証必須）
4. **深掘り実行の最小形**（Must）: workflow_dispatch の手動トリガ＋失敗 seed ログ化（intent-capture Q3=C。schedule 化は Out）
5. **軽量台帳**（Must・文書）: 直接根拠9件＋射程判定の record 化（intent-capture Q1=C）
6. **mirror property 化**（Could）: t274 の render→parse property 版＋snapshot arbitrary（intent-capture Q2=B — 余力があれば同一 intent 内）

### Out（実施しない — intent-statement の非対象と同一）

- #688/#697 完了済み領域（setup manifest/semver、audit escape、journal codec）の再拡充
- 44件全量の分類台帳化（#1979 へ）/ 射程外バグ族: #1878→#1979、#1860・#1906→#1981、#1953→個別修正
- 深掘りジョブの schedule 化（別 Issue へ）/ crash-consistency プロパティ（将来課題）
- Amadeus ランタイム・ステージ挙動の変更、ハーネス出力の意図的変更

## 順序方針（本ステージ Q1=A: リスク先行）

Bolt 1（walking skeleton、self-feature の必須ゲート）= election の最小 end-to-end スライス: 読み戻し fail-closed 化（コア）→ fail-closed プロパティ1本（Dev）→ 既存ゲート全緑、を貫通させる。実害最大の穴（#1459 修正の素通り）を最初に閉じ、コア改修→dist 7面再生成→テストの全配線を最初のスライスで実証する。以降は state 境界 → 静的ガード → 深掘り最小形 →（余力）mirror property 化。

## Value Stream

コア一本化（fail-closed 化）→ dist/self-install 再生成 → PBT（round-trip / fail-closed）常駐 → 静的ガードで逆行防止 → 深掘りトリガで QA モード運用、の一方向。利用者価値は「破損記録のその場棄却（配布面）」と「非対称バグの実装前検出（開発面）」の2面で、前者は Bolt 1 で最初に出荷される。

## タイムライン制約

ハードデッドラインなし。既存ブロッキングゲート（coverage patch / dist:check / promote:self:check / t258 / complexity）全緑が各 Bolt の出荷条件。
