# Risk & Sequencing Rationale — opencode / Cursor harness 対応

intent: `260715-opencode-cursor-harness`。上流入力: unit-of-work-dependency.md(bolt_dag)、unit-of-work.md / unit-of-work-story-map.md(視点別価値)、requirements.md、team-practices.md(Testing Posture 変更なし)、application-design の components.md(AC-3d 実測記録)、feasibility の raid-log(R-1〜R-4)。

## シーケンシングの根拠(risk-first + walking-skeleton)

1. **Bolt 1 を opencode 最小スライスにする理由**: port 容易度最高(feasibility 実測)で「manifest 1組で dist が増える」open-set 仮説を最速で end-to-end 検証できる。AC-2b 最小疎通をゲート前に含めることで最大の統合未知数(command → orchestrator 起動)を先に潰す(units-generation reviewer Major #1 反映)
2. **U3(cursor-port)を batch 2 に置く理由**: 残る最大リスク = tool_name 語彙(E-OC9 ノルム化された「語彙実測」)を Bolt 3 冒頭で実測し、写像不能なら出荷せず降格 — 後続 U4 の文書が確定情報を受け取れる
3. **U4 を最後に置く理由**: 機能単位表・README は U2/U3 の実測結果が入力(推測記載を排除)

## リスクと緩和(raid-log からの更新)

| リスク | 状態 | 緩和 |
| --- | --- | --- |
| R-1 Cursor hook seam | **解消方向へ更新** — seam 実在を実測(AC-3d 記録)。残リスクは語彙不一致 → Bolt 3 で実測+降格ルール(E-OC9) | 設計済み(tool_name 正規化写像表) |
| R-2 外部仕様変動 | 継続 | 成果物に照会日記録、Bolt 3 で版付き再実測 |
| R-3 registry/CI 宇宙の変化 | 継続 | U1/U4 で drift 自動編入を実測、integration-registry-regen 準拠 |
| R-4 opencode 権限既定 | 継続 | U2 の permission 例+U4 の README 明記 |
| (新)AC-2b 疎通が opencode 側制約で不成立 | 新規認識 | Bolt 1 ゲートで露見する設計 — 不成立なら halt-and-ask(選挙/エスカレーション)で方式再裁定 |

## 依存とクリティカルパス

クリティカルパス: Bolt 1 → Bolt 3(L)→ Bolt 4。Bolt 2 は Bolt 3 と並行のためパス外。ゲート待ち(ユーザー承認)は merge-approval-latency により正常系として扱い、非依存作業を継続する。
