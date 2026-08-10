# Units Generation Memory

## Interpretations

- 2026-08-10T14:09:54Z — User Stories stage は非実行のため、requirements の FR/NFR を delivery story として story map に割り当てた。
- 2026-08-10T14:09:54Z — 当初U4（amendment後のU5）は runtime を持つ実装ではなく repository 内で消費される executable acceptance contract なので canonical kind を `spec` とした。
- 2026-08-10T14:14:00Z — Architecture Review Iteration 1を受け、behavior changeを持たない当初U4（amendment後のU5）はRed→Green対象外とし、既存suiteがRedなら自身で直さずowner Unitへ差し戻す検証Unitとして明確化した。

## Deviations

- 2026-08-10T14:09:54Z — 新規質問は0件とした。分解方針、並行性、PR境界、共有 entrypoint owner はユーザー指示と承認済み ADR-3 で確定しており、再質問は既決事項を反復するため。
- 2026-08-10T14:20:00Z — Delivery Planningで旧U3が複数Issueを1 PRへ束ねる規範衝突を検出したため、ユーザー裁定「Issue別に直列分割」を受けて4 Unitから5 Unitへ改訂した。
- 2026-08-10T14:24:00Z — Amendment Reviewが5 Unit案も1 Issue複数Unitと横断PRによりNOT-READYと判定した。ユーザー最終裁定「並行実装＋#2833先行ゲート」により2 vertical Unitへ統合した。

## Tradeoffs

- 2026-08-10T14:09:54Z — 4 Unit に分離した。U1/U2 の pure seam が並行性を作り、U3 が共有 entrypoint conflict を直列化し、U4 が cross-unit acceptance を独立 PR に閉じる。1巨大Unitはswarm/PR分離を失い、U3をU1/U2へ重複させる案は共有file conflictを作るため採用しない。
- 2026-08-10T14:14:00Z — U1/U2は専用module/testだけを排他的所有し、barrel/export・runner・共通fixture・coverage台帳をU3へ遅延する。並行PRのshared-file conflictを防ぐための最小制約である。
- 2026-08-10T14:20:00Z — 共有file ownerをU3(#2833)→U4(#2834)へ直列移譲する。parallelismはU1/U2で維持し、PR粒度ではIssue分離を優先した。U5はcross-unit acceptanceを所有する。
- 2026-08-10T14:24:00Z — #2833/#2834を各1 vertical Unit・各1 PRへ統合し、共有entrypointはsemantic region別ownershipとした。実装は同一swarm batch、PR収束とgateはP1の#2833を先行する。cross-unit acceptanceはPRを持たないBuild and Test工程へ戻した。

## Open questions

- なし。
