# Performance Requirements — install-flow

> ステージ: nfr-requirements (3.2) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`・`business-rules.md`(BR-I 系)、`../../setup-foundation/nfr-requirements/performance-requirements.md`(U1 予算: 通常経路 ≤31秒)、requirements NFR-001

## NFR-001 の E2E 計測経路(U2 が所有)

- **計測対象は非対話経路**(`--yes --harness --target`): 対話ウィザードの人間応答時間は成功指標の対象外(指標は「コマンドの処理時間」)
- 全体予算 60秒(通常ネットワーク)= U1 分(解決+取得+展開 ≤31秒)+ **U2 分(プラン+md5+適用+マニフェスト+検証 ≤ 25秒)** + 余裕 4秒
- E2E テスト: フィクスチャアーカイブ(ネットワーク項除外)で全体 ≤25秒、実ネットワークのスモーク(リリース前 `--release` 層)で ≤60秒をアサート

## U2 内訳バジェット

| 処理 | バジェット | 根拠 |
|------|-----------|------|
| プラン作成(walk+md5 計算、dist 一式 ≈ 数百ファイル/数MB) | ≤ 10秒 | md5 はプラン時所有(U2 確定契約)。I/O バウンド・逐次で十分 |
| 適用(コピー+退避) | ≤ 10秒 | ローカル I/O |
| マニフェスト書き込み+検証(存在+doctor 相当) | ≤ 5秒 | 単一 JSON+stat 群 |

- 検証: integration テストが現行 dist フィクスチャでプラン+適用の経過時間をアサート
