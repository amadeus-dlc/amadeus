# D001 Functional Design の対象と UI 構成を固定する

## 状態

active

## 背景

Inception では、stage 採用判断を U001、workspace provenance を U002 として分けた。
Construction では、両 Unit がそれぞれ B001、B002 の Task 生成根拠になる。

## 決定

U001 と U002 は Functional Design を必要とする。
どちらの Unit も UI 構成を持たないため、`frontendSurface` は `absent` とする。

## 根拠

- [U001 Unit Design Brief](../../inception/units/U001-stage-adoption/design.md)
- [U002 Unit Design Brief](../../inception/units/U002-workspace-provenance/design.md)
- [bolts.md](../../inception/bolts.md)

## 影響

Task 生成は、各 Unit の core 3 Functional Design、Unit Design Brief、対象 Bolt のモジュールファイルを根拠にする。
`frontend-components.md` は作らない。
