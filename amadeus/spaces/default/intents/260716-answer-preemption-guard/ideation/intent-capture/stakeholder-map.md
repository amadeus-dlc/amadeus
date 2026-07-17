# Stakeholder Map — answer-preemption-guard(Issue #922)

上流入力(consumes 全数): なし(consumes 宣言は空。参照: Issue #922、leader ディスパッチ 2026-07-16T20:59:49Z)。

## ステークホルダー

| 役割 | 関心 | 関与 |
|------|------|------|
| conductor(全メンバー)| 先取り記入の即時 loud 検知 — コミット前の自己検知を注意力から機械へ移す | 一次利用者(sensor FAILED を是正) |
| leader | E-OC1 3段順序(判定申告→承認→記入)の執行が機械裏付けを得る | ゲート報告の検証材料 |
| reviewer | レビュー観点「先取り記入なし」の機械前倒し — 人的レビュー負荷の軽減 | 検知結果の消費者 |
| ユーザー(j5ik2o)| 規範遵守の構造化(手順ノルム→機械ガードの横展開方針 — PM 議題 (a) と同型)| 発案・ディスパッチ指示 |
| エンジン保守者 | sensor manifest 規約(`amadeus-<id>.md`)・advisory 契約との整合 | 実装様式の制約提供 |

## 影響面

- `.claude/sensors/`(新 manifest)+ stage frontmatter `sensors:` リスト(発火宣言)— 全ハーネス dist へ伝播(dist:check / promote:self:check 対象)
- 既存 gate-start ガード(#1106)との二層関係: sensor = advisory 早期検知、gate-start = fail-closed 最終防衛。二重実装ではなく同一述語の発火点2面(canonical 1定義 — construction ガードレール準拠)
