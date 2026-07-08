# Performance Requirements — upgrade-flow

> ステージ: nfr-requirements (3.2) / Unit: upgrade-flow / 作成: 2026-07-08
> 出典: `../functional-design/business-logic-model.md`(ワークフロー2: 対象側 md5)・`business-rules.md`、U1/U2 の performance-requirements(タイムアウト・計測区間の継承)

## upgrade 経路の予算(U2 と同構成+対象側 md5)

| 処理 | バジェット | 根拠 |
|------|-----------|------|
| プラン作成(配布物側 md5+**対象側 md5** の両方) | ≤ 15秒 | U2 の ≤10秒 に対象側ハッシュ(既存ファイル群)が加わる。逐次 I/O |
| 適用(退避+コピー) | ≤ 10秒 | U2 と同一 |
| マニフェスト更新+検証 | ≤ 5秒 | U2 と同一 |

- フィクスチャ E2E(計測区間: プロセス起動〜終了、ネットワーク項除外): **≤ 36秒**(U1 ローカル I/O 6秒+上記 30秒)。実ネットワークスモーク: ≤ 60秒(NFR-001 は install 指標だが upgrade も同水準を目標とする — 劣化理由がない)
- 検証: integration テストが「導入済みフィクスチャ+新バージョンフィクスチャ」でプラン+適用の経過時間をアサート
