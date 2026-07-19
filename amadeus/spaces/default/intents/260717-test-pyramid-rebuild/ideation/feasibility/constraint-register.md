# Constraint Register — test-pyramid-rebuild(#684)

上流入力(consumes 全数): `../intent-capture/intent-statement.md`

## 制約(実測根拠付き)

| # | 制約 | 根拠 |
|---|---|---|
| C-1 | 分類・比率・実行時間予算はすべて計測から導出(ハードコード禁止=検証劇場 Forbidden) | Issue #684 制約+org.md Forbidden |
| C-2 | 既存スイートのグリーン維持(移設は本 intent 範囲外、分類・設計・計画のみ) | team.md Testing Posture |
| C-3 | 分類基盤は既存 classifyTestSize(tests/lib/test-size.ts:23)を正とし新分類器を作らない | feasibility 実測(既存実在) |
| C-4 | size ドリフトゲートの既存挙動(declared<measured で赤)を壊さない | 既存ゲート実測 |
| C-5 | #683(Codecov ゲート)との層別カバレッジ整合を計画に含める | Issue 実装スコープ4 |
| C-6 | 大型のため units-generation で分割(実測棚卸し/層設計/再編計画を独立 Unit)— 単一 Bolt 非押込み | leader ディスパッチ明示 |
| C-7 | サブエージェント fan-out 運用: rubric 1本化→層別 Task/D-W fan-out(effort low・境界 high)、同期回収、result 送付明示 | leader 実行指針(ユーザー承認済み) |

## 規制的制約

該当なし(内部開発ツールのテスト整備)。
