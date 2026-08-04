# Functional Design Memory

## Interpretations

- 2026-08-04T12:56:18Z — Functional Designの最初のdirectiveがKimiを選んだことで、runtime graphはDelivery Plan本文でなくunit-of-work-dependency.mdのtopological levelsを辞書順で実行することを実測した。
- 2026-08-04T13:01:28Z — Kiro TUIで承認済みのcleanup-complete retryと二重失敗safety overrideをKiro ACPにも適用し、transport固有のclosed retry codeとresourceだけを差し替える; 同じ共通lifecycle判断を再質問しない。
- 2026-08-04T13:14:50Z — Issue #1717とFR/NFRが全子孫reapと残存時PASS禁止を既に要求するため、boundary emptyと直接子wait/reapを別proofにする修正はユーザー選択でなく必須設計として適用する。
- 2026-08-04T13:31:00Z — KimiはIssue #1717と承認済み要件で必須接続と確定しており、Kiroのようなfollow-up分岐を持たせない; retryと二重失敗は同Intentで承認済みの共通lifecycle判断を再利用する。

## Deviations

- 2026-08-04T12:56:18Z — Kimi成果物を生成せず停止し、ユーザー裁定1によりmachine DAGをTUI→ACP→Kimi→Evidenceへ補正する; 承認済みWalking Skeletonとdirectiveの不整合を黙って進めないため。

## Tradeoffs

- 2026-08-04T12:56:18Z — transport間のcode dependencyは追加せず、runtime build admissionだけを直列edgeとして記録する; 現行runtime graphがlogical topologyとdelivery sequencingを単一DAGで表す制約下で、証拠継承を発生させず実行順を一致させるため。
- 2026-08-04T12:58:24Z — Kiro TUIはcleanup完了後のみclosed setの一時失敗を最大1回retryする; attempt間resource漏洩と二重receiptを防ぎながら、起動競合・一時負荷だけに限定して回復性を持たせる。
- 2026-08-04T12:58:24Z — 実行失敗とcleanup失敗の併発時は実行失敗をprimary、cleanup失敗をsecondaryとして保持し、canonical resultへcleanup-failed safety overrideを適用する; 原因の時系列を失わずPASS/green投影を禁止するため。
- 2026-08-04T13:31:00Z — Kimi credentialはコピーせずscratch側の短命bindingとして所有し、sourceはopaque・非所有にする; cleanup可能性とsecret/source path非露出を同時に満たすため。
- 2026-08-04T13:36:00Z — Kimi journey timeoutは既存driverの600秒を継承し、包含Bun testを660秒以上にする; 既存実測基準を維持しつつtimeout同値衝突を避けるため。
- 2026-08-04T13:36:00Z — Kimi retryはchild未生成のOS EAGAINだけを内部`kimi-startup-capacity`へ正規化する; print transportでprovider throttlingを安定識別する構造化契約がないため、stderr自由文をretry根拠にしない。
- 2026-08-04T13:44:00Z — per-unit coverage ledgerはrequired artifactの存在だけを見てReviewer verdictを見ないため、NOT-READY成果物をredoする際はARTIFACT_REUSEDを記録してrequired artifactを再生成対象へ戻す; 旧Review要約はunit内review-history.mdへ保持する。
- 2026-08-04T13:46:00Z — Kimiの直列化はpreflight後・scratch前に取得するprocess-wide FIFO leaseとし、retry・cleanup・ledger処理を通じて保持して全終了経路のfinallyで解放する; side effectの並行開始とattempt間割込みを型・testで禁止するため。
- 2026-08-04T13:46:00Z — executionとcleanupの二重失敗では外側Resultをcleanup-barrier-failedへ固定し、元execution outcomeはerror payload内だけに保持してledgerへ投影しない; 上流component-methodsと現行runLiveJourney契約へ一致させるため。
- 2026-08-04T13:51:00Z — preflight ready後・queue参加前に副作用なしのLiveRunRequestIdentityを発行し、queue key、lease owner token、lease取得後のKimiRunIdentityへ同じrequest IDを引き継ぐ; lease取得とowner identity生成の循環を除去し、non-owner releaseを決定的に拒否するため。
- 2026-08-04T13:55:00Z — Evidence UnitはKimi/ACP/TUIをexactly three independent rowsとして投影し、Kimiは自身のgreen必須、Kiroは自身のgreenまたはqualified Issueのdiscriminated unionとする; transport間の証拠継承とmeasured-only残存を型で禁止するため。
- 2026-08-04T13:55:00Z — ledgerにinvalid lineまたはidentity conflictが1件でもあればprojection全体をfail closedにする; 壊れた証跡を読み飛ばして過去greenを表示し続ける誤誘導を防ぐため。
- 2026-08-04T14:00:00Z — phase2-live-e2e-evidenceはkind=specのため、Functional Designのproduces_kindsによりbusiness-rulesとdomain-entitiesだけがengine-resolved必須成果物となる; projection algorithmはdomain-entitiesへ置き、kind非適用のbusiness-logic-modelを発明しない。
- 2026-08-04T14:05:00Z — final gate completion verificationでACPの修正済み成果物にvalidated READYがないことを検出し、旧Reviewをhistoryへ分離してredo review cycleへ移した; per-unit coverageのartifact存在判定だけで承認へ進まないため。
- 2026-08-04T14:05:00Z — ACPも共通runner契約どおりcleanup failureの外側Resultをcleanup-barrier-failedへ固定し、originalOutcomeはpayloadに保持してledgerへ投影しない; KimiとACPで二重失敗のcanonical結果を分岐させないため。

## Open questions

- 2026-08-04T12:56:18Z — 将来、Unitのcode-level dependencyとDelivery Planningの経済順序を別のmachine-readable projectionへ分離すべきかを検討する。
- 2026-08-04T13:05:02Z — Kiro ACP direct pathはstrong process containment portを必須とし、Darwinの通常process groupだけでは非適格とする; macOSで強い監督境界を実装・実測できない場合はqualified follow-upへ閉じる。
