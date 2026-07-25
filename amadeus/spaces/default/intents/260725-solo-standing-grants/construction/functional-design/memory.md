<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-25T06:16:10Z — grant-authorization-domainをaudit projectionとpure valueだけで設計した; standing grantを新しい永続modelにしない制約を保つ
- 2026-07-25T06:16:10Z — receipt不一致とissue cardinality不一致をtyped human fallbackへ統一した; 攻撃をfail-closedにしつつERROR_LOGGEDを発生させない上位契約に合わせる
- 2026-07-25T06:22:16Z — await-approvalをprompt-only reentryとして設計した; quality-complete成果物を保持し認可だけhumanへ切り替える
- 2026-07-25T06:22:16Z — active cursor switchとgrant issuer-intent mismatchを分離した; 前者は誤intent操作を防ぐ既存state mismatch fatal、後者は同じgateへのtyped fallbackとする
- 2026-07-25T06:28:40Z — harness同一意味論をdirective/state/audit/fallback契約の一致と定義した; renderingの差までbyte一致させない
- 2026-07-25T06:28:40Z — U3 projection schemaをU2のroute-intent binding決定へ依存させた; 未解決contractをharness側で先取り・補完しない
- 2026-07-25T06:37:48Z — Route Idをspace全intentからexact lookupしてreceipt所有intentへtransactionをpinする案が承認された; 2-field carrierを維持しnon-target intentの全mutationを0にする

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-25T06:16:10Z — frontend-components.mdを生成しなかった; 対象UnitはCLI/library domainでUIを含まない
- 2026-07-25T06:22:16Z — solo-gate-transactionでもfrontend-components.mdを生成しなかった; process境界とstate transactionだけを扱う
- 2026-07-25T06:28:40Z — harness-contract-and-regressionでもfrontend-components.mdを生成しなかった; projection、test、documentationだけを扱う

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-25T06:16:10Z — receiptをconsumed stateにせずimmutable factとして扱った; exact Route Id照合により追加stateなしでsubstitutionを防ぐ
- 2026-07-25T06:22:16Z — grant-backed approveだけstrict JSON wireにした; human/teamの既存CLI出力を変えずtyped fallbackを追加する
- 2026-07-25T06:28:40Z — doctorをfeature一覧へ拡張せず既存責務との適合で更新要否を決める; 公開contractの整合とtoolの焦点を両立する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-25T06:16:10Z — 未解決事項なし; process wireとtransaction side effectは次Unitで詳細化する
- 2026-07-25T06:28:40Z — U2のroute-intent binding方式が未解決; Functional Design正式gateで推奨案を承認してから実装する
- 2026-07-25T06:37:48Z — route-intent bindingは重要設計ゲートで解決済み; 未解決事項なし
