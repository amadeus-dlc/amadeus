# Unit Story Map — formal-verif-value-chain

上流入力(consumes 全数): components, component-methods, services, component-dependency, decisions, requirements

利用者ジャーニー(intent-statement の Target Customer 2 種)に沿って Unit を配置する。

## ジャーニー1: プラグイン配布先ユーザー(外部)

| 体験 | Unit | 到達価値 |
|---|---|---|
| compose した plugin が配布先で自立実行できる | u1 → u4 | stage 指示コマンドが解決し、検証が回る |
| 配布物が repo-only 依存を持たないことが機械保証される | u3 | 再発防止(t377) |

## ジャーニー2: 本 repo の conductor / builder(内部)

| 体験 | Unit | 到達価値 |
|---|---|---|
| spec 変更が要件・設計段で advisory として届く | u5 | 是正コスト最小の時点で形式検証が催促される |
| 実装のみ変更時に SOURCE_DRIFT から正規復旧できる | u6 | #1510 の詰み解消 |
| 新規プロトコル(mirror)にモデルが供給され検証が回る | u7 | 二層検証ノルムの実行可能化 |
| 価値到達が audit で証明される | u8 | 「機構完成・価値不達」の再発防止 |
| 残骸のない実行器ツリー | u2 | 保守面の純減(54→24 ファイル) |

## リリース列(dependency+risk-first、scope 裁定準拠)

u1(walking skeleton)→ {u2, u3, u4, u6} → u7 → u8。各 Unit は独立 PR で main へスカッシュマージ。
