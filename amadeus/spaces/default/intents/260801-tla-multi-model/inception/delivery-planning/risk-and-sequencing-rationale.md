# Risk and Sequencing Rationale — 260801-tla-multi-model

上流入力(consumes 全数): `bolt-plan.md`、`team-allocation.md`、`../feasibility/raid-log.md`

## リスクと順序づけ

| リスク | 対応 | 順序への反映 |
|---|---|---|
| R1: u5 の CI 完全探索が 30 分 timeout(ci.yml:513)超過 | まず実測(FE Q1=A)、超過時は time-box 再裁定エスカレーション | u5 を最終 Bolt に配置(実測待ちを最後に) |
| R2: 推移解決の偽赤(コメント中構文誤検出) | u1 のリゾルバに抽出規則 + 偽赤/偽緑テスト(t402)を同梱 | 基盤の u1 を最初に |
| R3: 語彙切替で実走系テストが赤 | u3 で「維持」群の実走テストを条件付き再仕分け(unit-of-work.md 記載) | u3 を u2 と並行化して早期発見 |
| R4: FormalElection receipt 変化(成功 iii 破壊) | u2 AC3 / u3 AC1 で不変 pin、receipt 入力列挙(frozen bytes + publicContractIdentity)の不変を検証 | 各 Bolt の AC として固定 |
| R5: model-map.json の u3/u4 共有 | 別エントリ・行競合なしの共通契約、entries sha256 更新は u4 単独所有 | DAG に u3→u4 エッジなし(byte 非競合の裏付け済み) |

## 直列化の根拠

最大直列鎖は u1→u2→u4→u5(長4)。u3 は u1 のみに依存し u2 と並行可能。u5 は全 unit の成果に依存するため最終。
