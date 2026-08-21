# Unit Story Map — 260821-fmc-retirement

上流入力: `unit-of-work.md`、`requirements-analysis/requirements.md`。

## ストーリー(アクター・アクション・価値)

| ストーリー | アクター | 価値 | unit |
|---|---|---|---|
| 次の intent を開始すると FMC の 2 ステージが現れない | AI-DLC conductor / ユーザー | 毎 intent の無駄なステージ実行と混乱の消滅(0-plugin baseline) | U1 |
| CI が FMC job なしで green になる | 開発フロー全体 | risk-tier 発火・JDK セットアップ・TLC 実行のコスト消滅 | U1 |
| plugin-conformance / advisory のコア検査は引き続き green | フレームワーク品質 | 削除がコア機構の検証を巻き添えにしない(合成 fixture) | U1 |
| 再設計時に旧実装・モデルへ git 履歴から到達できる | 将来の再設計 intent | アーカイブ不要の可逆性 | U1(削除方式に内包) |
| ノルム・Issue が実態と矛盾しない | チーム | 失効 cid 整理とゴミ Issue クローズ | N/A(post-landing — unit 外、conductor 所有。unit-of-work.md「着地後アクション」参照) |

## 受け入れの対応

各ストーリーの受け入れは requirements.md の FR 受け入れ基準(FR-DEL-3 = graph 不在、FR-CI-1 = CI Success green、FR-TEST-2/3 = 温存テスト green、FR-DEL-1/2 = 0-hit/ls-tree 述語、FR-NORM-1/FR-ISS-1)へ 1:1 で trace する。Given/When/Then の個別展開は user-stories ステージ SKIP(scope)のため本表の trace で代替(SKIP 由来 fallback)。
