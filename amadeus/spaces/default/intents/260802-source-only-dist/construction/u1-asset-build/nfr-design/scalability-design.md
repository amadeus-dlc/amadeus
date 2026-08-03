# Scalability Design — u1-asset-build

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は engine nfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。唯一存在する `business-logic-model` の単一 release job と全ハーネス asset 契約をfallback入力とする。

## スケール単位

スケール対象は同時利用者数ではなく、ハーネス数とファイル数である。単一 release につき単一 tar という ADR-A2 の公開契約を維持し、並列 upload や per-harness asset への分割は行わない。

- harness 集合は `discoverHarnessNames` から動的に導出し、新 harness 追加で生成コードの列挙変更を不要にする
- archive entry は streaming で書き、payload サイズ増加時も全内容をメモリへ載せない
- GitHub Actions の一時 disk 容量を超えた場合は分割へ暗黙退避せず、必要容量と実測サイズを出して失敗する
- manifest schema 1 の `harnesses` と `fileCount` により規模増加を観測可能にする

## 容量しきい値と拡張方針

現在の dist 実測サイズ(du -sh dist/ の実測値を実装時に転記 — 概数の断定を避ける)をbaselineとする。生成tarが1 GiB(2 GiB hard limitの50%)を超えたらloud warning、1.8 GiB(90%)を超えたら公開前にfail closedとする。実装時は `sizeBytes` をmanifestへ記録し、閾値変更やper-harness分割は別intentで人間裁定する。

| 状況 | 動作 |
|---|---|
| harness 追加 | discovery 結果へ自動反映し、集合 self-check |
| fileCount 増加 | streaming 処理を維持し、manifest へ実測記録 |
| runner disk 不足 | 非0終了。部分 asset は公開しない |
| asset 上限接近 | 警告ではなく設計変更候補として別 intent へ送る |
