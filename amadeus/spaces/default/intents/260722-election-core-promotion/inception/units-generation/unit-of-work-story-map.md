# Unit Story Map — チーム機能のコア昇格

> 上流入力(consumes 全数): components、component-methods、services、component-dependency、decisions、requirements

user-stories ステージは本スコープで SKIP のため、ストーリーの捏造はせず **FR/NFR 全数 → Unit の対応トレース**で代替する(approval-handoff:c4 同型の N/A 代替。既習: 260722-space-record-catalog UG の E-SRCUGS13 裁定済み様式)。

## FR → Unit 全数トレース

| FR | 内容(要約) | Unit |
|---|---|---|
| FR-1a〜1e | 選挙エンジン移動・import 収束・全6面投影・テスト追随・ADR | U2 |
| FR-2a〜2d | スキル移動・参照書き換え・2面配線・compatibility 更新 | U2 |
| FR-3a〜3e | team 3ファイル bash 配布・パス修正・loud エラー・OS 検査・Should 面維持 | U3 |
| FR-4a〜4b | doctor advisory 行 | U3 |
| FR-5a〜5c | 境界ガード新設・落ちる実証・corpus sweep | U1(live 有効化は U2 同 Bolt) |
| FR-6a〜6c | クリーン環境 E2E・fake seam・分岐検証 | U4 |
| FR-7a〜7d | Team Mode 章 en/ja・3層規約・prerequisite 節・テンプレ不変 | U5 |
| FR-8a〜8c | メッセージング統合面の配布整合・backend 契約・fake seam 検証 | U3(検証面は U4) |

## NFR → Unit 全数トレース

| NFR | Unit / 担保 |
|---|---|
| NFR-1(既存 CI green) | 全 Unit の完了条件+build-and-test で横断再実行 |
| NFR-2(挙動不変) | U2(import 1行以外不変)・U3(追加のみ、既存テストが契約固定) |
| NFR-3(カバレッジ規律) | U1(unit 純関数)・U3(doctor 検査の in-process seam)・U4(e2e 層) |
| NFR-4(リリース面不変) | 全 Unit の変更対象一覧にリリース面なし(実装時 diff で確認 — components.md NFR トレース) |

## 利用者価値の到達経路(value stream の Unit 面)

外部利用者の体験順: prerequisite 確認(U5 docs+U3 doctor)→ チーム起動(U3)→ メッセージ疎通(U3)→ 選挙完走(U2)。この経路全体の機械保証が U4。境界ガード(U1)は体験を陰で支える構造保証(自己開発の混乱防止 — intent-statement の払拭済み懸念の恒久化)。
