# D003: Unit と Bolt の粒度

## 背景

- stage 判定と workspace 対応記録は密接に関係するが、Construction で更新する記録先と検証観点が異なる。
- User Story は Maintainer の stage0 採用判断を扱う。

## 判断

- Unit は `U001 stage 採用判断` と `U002 workspace provenance 記録` に分ける。
- Bolt は `B001 stage 方針記録` と `B002 workspace provenance 記録` に分ける。
- User Story は `S001 stage0 採用判断` として作成する。

## 理由

- stage 採用判断は語彙と人間判断が中心である。
- workspace provenance 記録は、workspace、tool、validator、検証証拠の対応が中心である。
- それぞれ Construction で更新する成果物と完了条件が異なるため、Unit と Bolt を分けるほうが Task 化しやすい。

## 影響

- B002 は B001 に依存する。
- Requirement、Use Case、Unit、Bolt の対応は `traceability.md` で双方向に追跡する。
