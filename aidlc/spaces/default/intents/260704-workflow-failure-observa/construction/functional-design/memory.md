# Functional Design Memory

## Interpretations

- 2026-07-04T07:35:38Z: `functional-design` の directive には `unit` が含まれていないため、`bolt_dag` の 3 Unit すべてに質問ファイルを作成する。各 Unit の成果物は `construction/<unit>/functional-design/` に置く。
- 2026-07-04T07:35:38Z: OpenTelemetry は core 計装として扱い、collector、dashboard、cloud export は設計対象外にする。
- 2026-07-04T07:35:38Z: ユーザー回答 `1` は「すべてEで進める」と解釈し、3 Unit の全質問を推奨選択肢 `E` として確定した。

## Deviations

- 2026-07-04T07:35:38Z: `memory_path` は stage 直下を指すため、共通の stage memory は `construction/functional-design/memory.md` に置く。Unit 固有の判断が発生した場合は各 Unit の成果物本文にも反映する。
- 2026-07-04T07:35:38Z: reviewer は初回 NOT-READY で U002 の stdout JSON 検証、audit append failure 方針、trustworthy status allowlist を指摘した。U002 の成果物だけを修正し、再レビューで READY になった。
- 2026-07-04T07:35:38Z: audit には `inception → construction` の `PHASE_VERIFIED` と `PHASE_STARTED` が記録されていたが、`aidlc-state.md` の Phase Progress が同期されていなかったため、Inception を Verified、Construction を Active に補正した。

## Tradeoffs

- 2026-07-04T07:35:38Z: Construction phase では質問を増やしすぎると AI-DLC の負荷が上がるため、各 Unit 5 問に抑え、実装時に分岐が大きくなる判断だけを確認する。
- 2026-07-04T07:35:38Z: browser frontend は存在しないが、stage produces に `frontend-components` が含まれるため、CLI output component と checklist component として成果物を作成した。

## Open questions

- 2026-07-04T07:35:38Z: engine が per-unit directive を出さない状態を、全 Unit 一括設計として扱ってよいかは後続の state tool 改善候補である。
- 2026-07-04T07:35:38Z: 回答の曖昧さと矛盾は検出されなかった。
