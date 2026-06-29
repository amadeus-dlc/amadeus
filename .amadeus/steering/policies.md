# Policies

## 方針

- target workspace の root `.amadeus/` を、Amadeus 本体開発用の steering layer として扱う。
- Intent ごとに対応する GitHub Issue を持つ。
- Issue 本文は要約設計を持ち、詳細な Requirement、Acceptance、Traceability、Decision は `.amadeus/` に置く。
- skill 変更、validator 変更、example 更新、語彙追加、docs 更新を変更種別として扱う。
- build workspace、host environment、target workspace、target artifacts を分けて記録する。

## 禁止事項

- `git submodule` で同じ Amadeus リポジトリを入れ子にしない。
- `.target-amadeus/` のような別名ディレクトリを作らない。
- `host` を workspace 名として使わない。
- stage2 を次回作業の stage0 に自動昇格しない。

## 判断基準

- stage2 を次回 stage0 として扱うには、対象 PR が現在の基準 branch に merge 済みであり、人間が採用を承認している必要がある。
- example snapshot の provenance は、実際に使った source skill と検証結果から追跡できる形で記録する。
- 初回導入では、skill、validator、example snapshot、ハーネスの実装変更を後続 Intent に分ける。
