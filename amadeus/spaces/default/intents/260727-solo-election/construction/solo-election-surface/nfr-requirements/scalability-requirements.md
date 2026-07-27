# Scalability Requirements — solo-election-surface (U2)

上流入力(consumes 全数): business-logic-model.md(ソロ手順・降格・ノルム改定の論理)、business-rules.md(BR-U2-1〜8 の検証列)、requirements.md(FR-02/04/08〜13・NFR-01〜03 の正本)、technology-stack.md(SKILL/dist 投影の実行環境)。

## スケーラビリティ要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U2-SCALE-01 | 手順は選挙単位で自己完結し、並行選挙・選挙数の増加に対して SKILL 手順の変更を要しない(ストア構造・registry は U1 同様不変) | 内挿文が特定選挙 id・特定日時に依存しない(テンプレ変数以外の固有値ゼロ — grep) | business-logic-model.md |
| U2-SCALE-02 | 投影面の拡大(将来の SKILL 対応ハーネス追加)は既存 packaging 経路の再生成で吸収し、U2 は面数をハードコードした検査を足さない | テンプレ検査テストが投影面数に依存しない(canonical 1面のみ検査) | requirements.md FR-13、technology-stack.md |

## 明示的に設けない検査

並行選挙の負荷試験なし — ソロ選挙は conductor 1セッション内で直列運用され、並行度要件が存在しない(cid:build-and-test:bt-proportional-selection)。
