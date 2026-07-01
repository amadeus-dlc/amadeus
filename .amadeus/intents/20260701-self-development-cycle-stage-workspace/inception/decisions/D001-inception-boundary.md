# D001: Inception 境界

## 背景

- Issue #233 は、自己開発 cycle の stage 判定と workspace 対応記録を定義することを求めている。
- 先行 Intent の D002 は、Issue #233 の範囲を stage 判定と build workspace / target workspace の対応記録に限定している。
- skill 実装、validator 実装、example snapshot 再生成は対象外である。

## 判断

- Inception の対象を stage 判定、stage0 採用判断、workspace 対応記録、検証証拠の追跡に固定する。
- `CONTEXT.md` への stage 語彙追加、example snapshot provenance、assets 混入検出は対象外として後続判断に残す。

## 理由

- Issue #233 の受け入れ条件は、stage 判定と workspace 対応記録を決めることで満たせる。
- 実装変更を含めると、この Intent の焦点が stage 判定と provenance 記録から外れる。

## 影響

- Construction では、docs 更新または `.amadeus/` 更新に限定して Task 化する。
- validator 実装や example snapshot 再生成が必要になった場合は、後続 Issue と後続 Intent に分ける。
