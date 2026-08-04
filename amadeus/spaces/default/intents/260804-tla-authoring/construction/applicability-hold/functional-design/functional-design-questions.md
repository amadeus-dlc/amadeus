# Functional Design Questions: U2 applicability-hold

## 回答方法

- モード: Guide me
- 質問予算: 最大2件。上流(`unit-of-work.md` の U2 定義と `unit-of-work-story-map.md` の FR-001/003/004/005/007 主担当行、`requirements.md`、`components.md` §C1/§C9、`component-methods.md` §C1/§C9、`services.md` §S1/§S7、`decisions.md` ADR-6/ADR-7)で確定済みの事項は再質問しない。
- U2 の functional-design 冒頭タスク(§11a checkpoint の fail-closed 機械強制の実読確認 — application-design レビュー iteration 2 FOLLOW-UP-1)の結果が ADR-6 の前提を一部否定したため、`unit-of-work.md` U2 実装注意の指示どおり ADR-6 再裁定を人間へ返した。本ファイルはその裁定の記録を兼ねる。

## 質問

### Q1. ADR-6 の再裁定: C9 の checkpoint 結線に engine 変更が必要と実読で確定した。どう改訂するか？

実読確認の結果(詳細は `decisions.md` ADR-6 改訂注記): (1) §11a checkpoint の fail-closed・人間相関必須は現行 HEAD で機械強制 = 肯定。(2) plugin.json 宣言だけでの新 advisory code + formal_checks 結線 = 否定(advisory code 語彙・formal_checks コマンドとも engine 側ハードコード)。

- A. engine の advisory 供給面を plugin.json 宣言読取へ一般化する小さな engine 変更を ADR-6 に含める。C9 は宣言で結線し、同類の第 2 ハードコードを避ける(推奨)
- B. 既存 formal-model-check と同型の C9 用分岐を engine 側 2 module へ直接追記する(最小変更だがハードコードが 2 個目になる)
- C. checkpoint 結線を諦め、hold 強制をセンサー等の別機構へ退避する(ADR-6 の設計意図を失う)
- X. Other (please specify)

[Answer]: A. engine の advisory 供給面を plugin.json 宣言読取へ一般化する小さな engine 変更を ADR-6 に含める(推奨)

- 人間承認: 2026-08-04T18:29:01Z

## 裁定の記録

- Q1 裁定: 案 A(宣言駆動化)。`decisions.md` ADR-6 へ改訂注記を追記済み(2026-08-04T18:29:01Z)。checkpoint 機構の発火点・directive 契約・解除規則は無変更、executor/verdict 保護境界(FR-013)は不侵。宣言 schema と engine 側一般化点の設計は本 unit の functional-design が所有する。
- 曖昧さ分析: 単独の明確な選択で矛盾なし。追質問ラウンドは不要。

## 上流トレーサビリティ

- `inception/units-generation/unit-of-work.md`(U2 定義・実装注意)、`unit-of-work-story-map.md`(FR-001/003/004/005/007 主担当行)
- `inception/requirements-analysis/requirements.md`(FR-001、FR-003〜FR-005、FR-007)
- `inception/application-design/components.md`(§C1/§C9)、`component-methods.md`(§C1/§C9)、`services.md`(§S1/§S7)、`decisions.md`(ADR-6 とその改訂注記、ADR-7)
