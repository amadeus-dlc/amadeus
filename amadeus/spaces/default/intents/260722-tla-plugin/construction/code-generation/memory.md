# Code Generation Memory

## Interpretations

- なし。

## Deviations

- なし。

## Tradeoffs

- 2026-07-24T06:09:56Z — 性能要件の変更前に非受入診断を1回実行した。300秒上限で完全探索の実時間と状態数を測定し、Docker/TLC 168,319.3693 ms、5,203,730 generated states、529,692 distinct states、探索深度9、queue 0を得たため、120秒要件の再裁定を推測ではなく一次証拠に基づいて行える。
- 2026-07-24T06:57:56Z — ユーザーは診断実測に基づく選択肢1を承認した。BR-U4-7のspawn上限を180秒未満へ改訂し、診断スクリプトは手動調査用として残しつつCI経路から外し、正式なwarm-up 1回+計測5回を再実行する。
- 2026-07-24T07:06:27Z — 正式受入`30074187032`のwarm-upはspawn約161.67秒、TLC内部161,085 msで完全探索したが、標準モジュールの実報告パス`<scratch>`と期待値`<scratch>/.tlc-stdlib`の不一致により`GRAMMAR`へ誤分類された。artifactで実パスなら`COMPLETE`、旧期待値なら`unframed output at line 11`を再現し、ユーザー承認によりplanned runtimeの正規化入力をrealpath済みscratch rootへ束縛する。

## Open questions

- なし。
