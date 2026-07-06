# Unit of Work Story Map — Presence Evidence（260705-presence-evidence）

上流入力: [unit-of-work.md](unit-of-work.md)、[stories.md](../user-stories/stories.md)、[requirements.md](../requirements-analysis/requirements.md)

## 対応表

| Unit | ストーリー |
|---|---|
| u001-presence-evidence | US-1（検証範囲の明文）、US-2（防衛線と不採用理由）、US-3（mint 規律不変）、US-4（実装一致の信頼）。US-5 は Won't |

## カバレッジ検証

全 Must ストーリー（US-1〜4）が単一 Unit に属し、受け入れ条件は文書の節と code-summary の記録で検証できる（requirements.md FR-2.3）。

## Unit 内のストーリー実装順序

執筆順 = US-1 → US-2 → US-3（同一節内の要素順）→ US-4（執筆時の実装再読了記録）。parity-map reason 追補は US-2 の不採用理由と同時に書く（同じ根拠を参照するため）。
