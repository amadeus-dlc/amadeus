# D001: Ideation 完了判断

## 背景

- Issue #233 は、自己開発 cycle で使う stage 判定、採用判断、workspace 対応記録を定義することを求めている。
- Discovery Brief は、この候補を最初に進める recommended 候補として選んでいる。
- 自己開発用 steering layer は [PR #232](https://github.com/amadeus-dlc/amadeus/pull/232) と [PR #234](https://github.com/amadeus-dlc/amadeus/pull/234) の merge 後に validator pass している。

## 判断

- Ideation gate passed として完了する。
- 実行スコープは `feature`、成果物深度は `standard`、検証戦略は `standard` とする。
- Inception では stage 判定語彙、stage2 採用条件、workspace 対応記録先を Requirement と Acceptance に落とす。

## 理由

- Issue #233 の対象と対象外は明確であり、Ideation で追加質問せずに範囲を切れる。
- skill 実装、validator 実装、example snapshot 再生成は対象外として分離済みである。
- stage 判定と workspace 対応記録は後続の自己開発 Intent に共通するため、先に契約として定義する必要がある。

## 影響

- Inception では、`CONTEXT.md` に stage 語彙を追加するかを判断する。
- Inception では、workspace 対応記録の置き場所を `traceability.md`、`decisions.md`、または steering layer のどれにするかを確定する。
- 後続の example provenance と混入検出の Intent は、この Intent の成果物を前提にできる。
