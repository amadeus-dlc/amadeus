# Code Generation Plan — unit prc-finalization(Bolt 3 / FR-3 / #3149)

方式 = decisions.md ADR-3(attestation ベース束縛 + in-place finalisation、ユーザー裁定 A)+ ADR-4(human-presence 付き override、ユーザー裁定 B)。本計画は両 ADR の実装契約の機械的射影。テスト戦略 = Comprehensive。TDD 必須 — 各受け入れ面は Red 実測 → 最小実装 → Green。

トレーサビリティ: 全ステップ → FR-3(#3149)。Step 1 は ADR-4 契約1(現存性再実測)。

- [x] Step 1: クラスB 3件(#3128 66dc18b4 / #3130 46d8e8524 / #3134 df4c7489)の現存性・patch 等価を現行断面で再実測し記録(ADR-4 契約4 — 等価成立例が現れたら停止して報告)
- [x] Step 2: kind 分岐の全列挙 — センサー内で report kind により分岐する箇所を grep で列挙し(checkCheckoutBinding 冒頭コメント含む)、置換対象目録を作る(ADR-3 契約3)
- [x] Step 3: Red (A) — converged report mint → HEAD 前進 → センサー FAIL(`does not match the current checkout`)を統合テストで Red 実測(t450 系 seam)
- [x] Step 4: センサー束縛の attestation ベース化 — `checkAttestationEnvironment`(:294-301)の `kind === "landed" ? merge : checkout` を「receipt が merge facts(mergeCommit/mergedAt)を attest しているか」の分岐へ置換。kind 特例分岐は削除し全 kind 同一規則。センサー無ネットワーク維持(ADR-3 契約1-4)
- [x] Step 5: CLI merged arm の in-place finalisation — PR が MERGED の converged report に対し、attested prHead == merged headRefOid または `verifyMergedEpochAncestry` proof 成立を条件に merge facts を実測・attest し直して kind: converged のまま record 更新 + canonical audit attestation 行 append。`transitionAllowed` 無改変(ADR-3 契約2)
- [x] Step 6: Red (B) — 孤児 epoch への現行拒否(`not an ancestor of the merged head`)を Red 実測(t3110 系 seam、合成孤児 epoch fixture)
- [x] Step 7: human-presence 付き override 最終化 — report merged arm に追加。live checkout 前提は `verifyLandedPrerequisites`(git-runner :169-176)同等の緩和。既存 presence 機構(HUMAN_TURN 由来)必須、新 kind なし、reason に祖先証明失敗の実測逐語、merge facts を実測して attest(ADR-4 契約2-4)。override 提示面に祖先検査の実測結果を表示
- [x] Step 8: 負例 pin — (i) attestation を伴わない手書き merge facts の report が FAIL のまま (ii) presence 不在の override が拒否(ADR-3 契約4 / ADR-4 契約5)
- [x] Step 9: 非退行 — 単一 unit 従来フロー(created → landed、#3113 経路 = t3062 / t3110)と OPEN PR の live 束縛検査が無変更で green
- [x] Step 10: 台帳 resync — 新規テストファイルの coverage-registry regen。plugin ツールは model-map 対象外だが、`bun run build`(plugin 投影再生成)+ typecheck / lint / 対象テスト(t450 / t481 / t482 / t534 / t3062 / t3110 系)をローカル green 確認。フルスイートは push 後 CI

除外(スコープ外): rfc-autonomy-modes の実 unit 回復操作(着地後の別作業)。override の新 CLI verb 追加が必要な場合はユーザー可視契約テストを同梱(services.md 契約)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-17T05:39:03Z
- **Iteration:** 1
- **Scope decision:** none

3成果物はステージ契約・ADR-3/ADR-4の実装契約(transitionAllowed無改変・証拠水準非緩和・無ネットワーク・override新kind不使用・祖先成立時override拒否)と整合しBLOCKERなし。Red証跡の逐語不一致とunit境界の未開示差分を含む4件をFOLLOW-UP、センサー結果記載の粒度を1件NITとして指摘。

### Findings

- FOLLOW-UP | FR-3(b)/plan Step 6が要求するClass Bの逐語Redメッセージ「landed finalisation refused: ... not an ancestor」がcode-summary.mdのどこにも引用されていない。「Redの逐語(代表)」表のクラスB行は代わりに「delivery prerequisite failed: checked-out branch main is not the PR head branch bolt/3149」という別種のメッセージ(live checkout前提チェックに近い文言)を示しており、要件が明示的にpinした祖先失敗メッセージとの対応が読み取れない。「代表」(非網羅)である旨は示されているが、指定の受け入れ文言が実際に固定されたのか、あるいは実装過程で失敗様式そのものが変わったのかが不明。該当逐語の追記、または対応関係の明記を推奨する。
- FOLLOW-UP | plan Step 3が想定するClass A(HEAD前進)のRed証跡「センサーFAIL(does not match the current checkout)」と、code-summaryが実際に報告するRed証跡(「報告書が - kind: landed へ書き換わる」= CLI側の無音書換)が一致しない。「副次的に閉じた穴」として主要判断節に説明はあるが、plan想定と異なる根本原因への到達を意味する場合、逸脱(deviation)として明示的に扱われていない。plan記載の期待証跡と実際証跡の差分を明記することを推奨する。
- FOLLOW-UP | unit-of-work.mdのU1境界記述は「pr-convergence-git-runner.tsの消費点追加」を明示するが、code-summaryの変更ファイル一覧(git diff --stat)に同ファイルは一件も現れない。override実装はgit-runner.tsのverifyLandedPrerequisitesを「同等の緩和」として参照するのみで同ファイル自体は変更していない。逸脱節はADR-3/ADR-4からの逸脱なしとし、この境界差分を報告していない。機能的な問題は見当たらないが、inception成果物が明示した境界からの差分は明示開示すべき(P3 / 無申告逸脱の禁止)。
- FOLLOW-UP | code-summary.md冒頭の「commit: 66b398a2e」と、同一unitのpr-convergence-report.mdが記すlocal/remote/pr head「6bdf0127240e89c7874bc2daee96d00107f95db2」が一致しない。record checkpoint同梱コミット等による後続コミットである可能性が高く(multiunit-pr-procedureの定型手順と整合)実害は薄いと見るが、code-summary側にその関係(どのコミットが最終PR headか)の明記がなく追跡性の観点で解消が望ましい。
- NIT | 検証節はtypecheck/lint/complexity/build/coverage-registryのexit codeを個別記載しているが、frontmatterが宣言するevent-registry-drift・self-scope-consistency・git-drift・pr-convergence-report-formatの各センサーの結果は明示的に言及されていない。実運用ではフック発火で自動評価されるため不記載自体が欠陥ではないが、記載があれば完全性がより明確になる。
