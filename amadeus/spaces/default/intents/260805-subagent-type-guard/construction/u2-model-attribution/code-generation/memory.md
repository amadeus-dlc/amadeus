# Memory — U2 model-attribution / code-generation ステージ日誌

## Interpretations(解釈)

- 2026-08-06T02:31:00Z — C-6 の割付は unit-of-work 字面上 U1/U2 両読みが成り立つため、BR-U2-4 の留保どおり実装着手前に `event-registry.ts` を実測した。U1 は COMPLETED の `Type Verdict` のみ着地、STARTED は `["Agent ID","Purpose"]` のまま — よって U2 の差分は STARTED +3 / COMPLETED +2 と確定し、二重登録は発生しない
- 2026-08-06T02:33:00Z — FR-3a の「セッション継承」段は取得不能実測により本 intent では解決不能(欠落明示の段)と読んだ。実装では `ModelResolutionInput` に継承入力を持たせず、3入力(harness/request/pin)全欠落 = `unresolved` がその型表現になる
- 2026-08-06T02:41:00Z — completed payload に `tool_input` が無い件は「暗黙の undefined」ではなく BR-U2-5 の明示契約と読み、`requestedModel: undefined` をリテラルで書きコメントで契約を可視化した
- 2026-08-06T02:50:00Z — 「空白のみは undefined 同義」の trim 規約は presence 判定のみで、記録値は逐語保持と解釈した(`normalizeAgentType` が `raw?.trim() ? raw : "unknown"` で値を書き換えない既習に一致)。t453 に verbatim 保持のピンを置いた

## Deviations(逸脱)

- 2026-08-06T03:12:00Z — 選択コピー型 fixture 4件(t131 / t91 / t07 / harness-lib-fixture 共用の t144/t269)が amadeus-lib.ts の新規静的依存 `./amadeus-subagent-observability.ts` を解決できず t131 で 4 件の赤。ベースソース + クリーン dist で 16/16 緑を確認し自変更要因と特定のうえ、設計は変えず各 fixture の sibling リストへ追記して修正(詳細は code-summary Deviations 1)
- 2026-08-06T02:55:00Z — `subagentStartFields` の第2引数 `agentsDir` は optional とした(component-methods は引数追加を未明示。既存の単一引数呼出しを非破壊に保つため)
- 2026-08-06T03:05:00Z — t454 の coverage 機械判定が `none` に落ちたため(spawn argv の静的解決不能)、hook 別 wrapper へ分割して `cli` 判定に揃えた。テスト内容自体は不変

## Tradeoffs(トレードオフ)

- 2026-08-06T02:45:00Z — `subagentStartFields` は元々純関数だったが、設計(BR-U2-4)が同関数への差し込みを指定するため、agentsDir 供給時に限り FS 走査 + stderr 出力を持つ形を採った。代替案(hook 側で富化)は t385 の fields literal 静的読取と二重のフィールド合成を複雑にするため非採用。agentsDir 省略時は純関数のままという段階的契約で既存テストを無改変に抑えた
- 2026-08-06T02:38:00Z — pin 引き当てで1発火あたり FS 走査が最大2回(C-1 許可集合 + pin)になるが、BR-U2-3 申告済みの意図的差分(変更理由の分離 — C-1 に model の関心を混ぜない)を優先した
- 2026-08-06T02:58:00Z — 重複 `name:` は検出時点で走査を打ち切る(break)実装とした。全件洗い出しも可能だが、warnings の目的は「環境差の兆候を1件示す」ことであり、重複の全列挙は集計(U3)の責務ではない今は過剰と判断

## Open questions(未解決)

- 2026-08-06T03:20:00Z — Codex fixture は CLI 0.137.0 捕捉で現行 0.146.0 live は未実測(AS-1)。fixture 断片の存在 assert で契約 drift は検知できるが、live 差異が出た場合の欠落明示への退化は実装済みでも live 実測は残件
- 2026-08-06T03:20:00Z — started 面の Claude Code での発火は #2303/#2297 修正待ち(CON-2)。本 Unit のテストは payload 形状駆動で、kimi role-start 経路の live 発火も e2e では未検証(U3 の集計と修正後実測に委譲 — nfr-design の検証面の書き分けどおり)
- 2026-08-06T03:20:00Z — Cursor / OpenCode / Kiro / Pi の payload の model 有無は未実測(AS-3)。FR-3a は供給があれば拾い無ければ欠落明示に落ちるためブロッカーではないが、ハーネス別の実測タリーは将来の RE 候補
