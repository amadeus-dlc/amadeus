# Code Generation Plan — numeric-provenance-sensor-cli

## 実装方針

1. U1 の schema、承認 fixture、canonical sample identity を consumed-in-place で固定する。
2. 単一 tool module に design-time index/sweep、固定 predicate scanner、provenance resolver、runtime evaluator、secure CLI adapter を実装する。
3. 実コーパス sweep から Generated Mapping と enforcement stage 集合を生成し、Markdown authority と readonly TypeScript projection の一致を統合テストで固定する。
4. advisory manifest を登録し、enforcement policy を持つ stage だけへ配線する。
5. cutoff、機械除外、W/W+1、構造境界、measurement-only、relative link、mapping corruption、性能予算を検証する。

## TDD

- Red: tool module が存在せず、missing verdict の統合テストが失敗することを確認した。
- Green: missing fail-open、固定4 class scanner、lower/upper-bound classification、index/sweep、manifest/配線を最小実装し、各段階で focused test を通した。
- Contract repair: U1 の旧 identity 式に実コーパス衝突を検出したため停止し、U1 の `JSON.stringify` tuple 修正を取り込んでからラベルと mapping を再生成した。
- Refactor/verification: filesystem probe を evaluation-local に memoize し、authority drift、security boundary、性能予算の回帰テストを追加する。

## 変更対象

- `packages/framework/core/tools/amadeus-sensor-numeric-provenance.ts`
- `packages/framework/core/sensors/amadeus-numeric-provenance.md`
- `packages/framework/core/amadeus-common/stages/construction/code-generation.md`
- `tests/integration/t532-numeric-provenance-sensor.integration.test.ts`
- `tests/fixtures/numeric-provenance-sensor/code-summary-count-labels.json`
- `measurements/numeric-provenance-corpus-sweep.md`

## 完了条件

- U1 の canonical tuple identity と50件の承認ラベルが一意に対応する。
- 実測 authority、Generated Mapping、manifest、stage 配線が同じ意味集合を持つ。
- 通常の FAILED verdict は exit zero の JSON、起動不能だけは non-zero になる。
- focused test、typecheck、lint、CI test が実測 green になる。
