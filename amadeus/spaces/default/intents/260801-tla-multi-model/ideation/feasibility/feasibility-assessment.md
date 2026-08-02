# Feasibility Assessment — 260801-tla-multi-model

上流入力(consumes 全数): `../intent-capture/intent-statement.md`(Q1=A / Q2=C / Q3=A)。参照: Issue #1921・#1920 のクロスレビュー実測

## 技術的実現性: 高い

- **TLC 実行基盤は既存**: CI の formal-model-check ジョブ(workflow_dispatch、ci.yml:511)は既に FormalElection の TLC run/verify を実行しており、docker + tla2tools の toolchain は実績済み。MirrorLifecycle AsIntended の完全探索(208628 states / 89099 distinct / depth 18 / no error)は u7 のローカル実測記録があり、同一 toolchain で再現可能。
- **変更面は限定**: `plugins/formal-model-check/tools/`(model-map、tlc-toolchain、tla-arm、loader)、CI port(`node-ci-model-check-port.ts`)、`scripts/formal-verif/`、stage md、tests。配布面の新設はない。
- **スキーマ変更の難所は既知**: Q2=C(明示宣言+推移解決の併用)は model-map.json のスキーマ拡張を伴うが、既存エントリ(FormalElection 2資産、MirrorLifecycle 2資産)の identity 算法を不変に保つことで receipt identity を維持できる(成功3点の (iii) と両立)。
- **静的推移解決の実装コスト**: TLA+ の EXTENDS/INSTANCE 宣言は行頭キーワードの単純構文で、フルパーサは不要(行ベース抽出で足りる)。`INSTANCE MirrorLifecycleCore WITH ...` 形(MirrorLifecycle.tla:31-32)をクロスレビューで確認済み。

## リスクと緩和

| リスク | 評価 | 緩和 |
|---|---|---|
| CI での完全探索の所要時間(208k states)がジョブタイムアウトに触れる | 中 | workflow_dispatch ジョブの実測タイムアウトを設計段で確認し、必要なら time-box / states 制御を裁定(FE Q1) |
| 推移解決の誤検出(コメント中の EXTENDS らしき文字列)で偽赤 | 低〜中 | 行ベース抽出でもコメント除去規則を設計段で固定し、偽赤の落ちる実証を入れる |
| 宣言漏れ検出の赤化で既存の正しい運用が壊れる | 低 | 現行の登録4資産は宣言追加で全て整合するため、移行時の赤は出ない設計とする(FE Q2 で確認) |
| FormalElection 側 receipt identity の変化 | 低 | 成功3点 (iii) を AC に固定し、不変の検証をテストで pin |

## 法規制・コンプライアンス

該当なし(社内開発ツールチェーンの拡張。外部データ・個人情報・ライセンス変更不要 — tla2tools は既存導入済み)。

## 結論

実現可能。制約・RAID は constraint-register.md / raid-log.md に記録。設計段(units-generation 以降)で CI タイムアウトとスキーマ移行の2点を確定する。
