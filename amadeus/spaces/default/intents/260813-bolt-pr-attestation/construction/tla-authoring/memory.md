<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-08-14T01:23:48Z — `revise-model` を選択した。既存モデルはPR/head/attestation/completionを扱うが、今回追加された正規member Unit集合、owner-bound投影、partial/foreign evidence拒否を状態として表現しておらず、到達可能な安全条件が変化するため。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-08-14T01:31:00Z — 独立レビュー Iteration 1 は NOT-READY。owner証跡非共用、receipt冪等性、full autonomy候補一意性が初版縮約から失われていたため、専用状態と3 invariantを追加した。
- 2026-08-14T01:40:00Z — 独立レビュー Iteration 2 は NOT-READY。同一report retryと、createdからconverged/overrideへ変わる別report digestのreceipt再発行を区別するため、report identityとreceipt head/identity束縛を追加した。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-08-14T01:23:48Z — Unit slug・PR番号・SHAの具体値ではなく、2要素のmember集合、head epoch、membership/tuple整合性へ縮約した。partial evidenceとforeign/replayの安全上の差を保ちながら状態爆発を抑えるため。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
