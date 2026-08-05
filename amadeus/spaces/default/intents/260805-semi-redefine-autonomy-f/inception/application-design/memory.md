# Stage Memory — application-design

## Interpretations

- 2026-08-05T07:20:00Z — 5成果物は相互依存が強い(components → component-methods → services → dependency → decisions)ため、1エージェント=1成果物パスの原則(`cid:functional-design:c4-subagent-structural-guard` (2))ではなく、書込 scope を application-design ディレクトリに限定した単一の architect サブエージェントで一括起草した。RE ステージの Architect synthesis と同じ形。分割すると成果物間の名前・責務・依存が分裂するため。
- 2026-08-05T07:20:00Z — OQ-ADV-K(advisory の occurrence 写像)は質問ではなく ADR-6 として裁定した。scope 認可は整合する(`SEMI_ROUTINE_INTERACTIONS` / `ALL_INTERACTIONS` とも `question` を含む)が、selector に advisory instance を含める帰結として confirmed-policy 段と history 段が一致せず **advisory 裁定は実効3段へ縮退する**ことを Consequences に明記した。

## Deviations

- 2026-08-05T07:20:00Z — ステージは質問ファイルを produces に持たないため作成していない。未決点は ADR として裁定し、残余は decisions.md の未確定事項へ送った。`answer-evidence` センサーは対象ファイル不在のため非適用。

## Tradeoffs

- 2026-08-05T07:30:00Z — §12a reviewer の FOLLOW-UP 指摘のうち、実装を左右する F1〜F8 は iteration を消費せず conductor 主導で是正した(reviewer verdict は READY で BLOCKER 0 のため差し戻し不要)。F1 は conductor が `amadeus-utility.ts:4635` を実測して**実害を確定**させたうえで是正方針(判別子を `modeProvenance` へ)を与えた。

## Open questions

- 2026-08-05T07:30:00Z — §12a reviewer(iteration 1)は READY(BLOCKER 0 / FOLLOW-UP 9 / NIT 2)。F1〜F10 は是正済み。**reviewer 指摘1件は誤帰属**(`decisions.md:225` は当初から `semiPoliciesOf` 経由で直読ではなかった)。
- 2026-08-05T07:30:00Z — 是正で新たに判明した未確定4件を functional-design / code-generation へ申し送る: (1) `resolveAutoDecision` 入口ガードの落ちる実証は `decide` 経由では到達不能で直接呼び出しテストが要る (2) `quality-waiver` の `PROHIBITED_EFFECTS` 収載を assert するテストが不在で、崩れると FR-ADV-4 の fail-closed が無音で空文化する (3) C18 の docs 22 ファイルの改訂行数が未実測(コード面 662 行 + 非コード 29 行は確定) (4) `readLaunchAutonomyContext` の `unreadable` 経路の実頻度は実装時実測が確定条件。
- 2026-08-05T07:30:00Z — §13 学習候補: conductor が reviewer の未検証前提(「暗黙前提だが実測されていない」)を実測して**実害を確定させてから**是正方針を与える運用。reviewer は scope 外のコードを読めないため未検証前提を FOLLOW-UP 止まりにするしかなく、conductor の実測が BLOCKER 相当かを分ける。一般化価値は §13 選挙で裁定する。
