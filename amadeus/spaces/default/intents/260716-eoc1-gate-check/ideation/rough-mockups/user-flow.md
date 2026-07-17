# User Flow — eoc1-gate-check

## 上流入力(consumes 全数)

`../intent-capture/intent-statement.md`、`../scope-definition/scope-document.md`、`../scope-definition/intent-backlog.md`(単一ユニット)、`../feasibility/feasibility-assessment.md`、wireframes.md。

## フロー(conductor 視点)

1. 正常: 判定申告 → 承認 → questions 冒頭へ ts 記載 →(必要なら [Answer] 記入)→ gate-start → 無音通過(従来と同一体験)
2. 先記入 slip: [Answer] 記入(証跡なし)→ gate-start → **即時拒否+是正手順つき文言** → 証跡記載 or [Answer] 差し戻し → 再 gate-start → 通過
3. questions 無しステージ: gate-start → 検査スキップ(従来どおり)
