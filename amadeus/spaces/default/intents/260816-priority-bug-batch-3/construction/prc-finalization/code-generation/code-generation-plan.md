# Code Generation Plan — unit prc-finalization(Bolt 3 / FR-3 / #3149)

方式 = decisions.md ADR-3(attestation ベース束縛 + in-place finalisation、ユーザー裁定 A)+ ADR-4(human-presence 付き override、ユーザー裁定 B)。本計画は両 ADR の実装契約の機械的射影。テスト戦略 = Comprehensive。TDD 必須 — 各受け入れ面は Red 実測 → 最小実装 → Green。

トレーサビリティ: 全ステップ → FR-3(#3149)。Step 1 は ADR-4 契約1(現存性再実測)。

- [ ] Step 1: クラスB 3件(#3128 66dc18b4 / #3130 46d8e8524 / #3134 df4c7489)の現存性・patch 等価を現行断面で再実測し記録(ADR-4 契約4 — 等価成立例が現れたら停止して報告)
- [ ] Step 2: kind 分岐の全列挙 — センサー内で report kind により分岐する箇所を grep で列挙し(checkCheckoutBinding 冒頭コメント含む)、置換対象目録を作る(ADR-3 契約3)
- [ ] Step 3: Red (A) — converged report mint → HEAD 前進 → センサー FAIL(`does not match the current checkout`)を統合テストで Red 実測(t450 系 seam)
- [ ] Step 4: センサー束縛の attestation ベース化 — `checkAttestationEnvironment`(:294-301)の `kind === "landed" ? merge : checkout` を「receipt が merge facts(mergeCommit/mergedAt)を attest しているか」の分岐へ置換。kind 特例分岐は削除し全 kind 同一規則。センサー無ネットワーク維持(ADR-3 契約1-4)
- [ ] Step 5: CLI merged arm の in-place finalisation — PR が MERGED の converged report に対し、attested prHead == merged headRefOid または `verifyMergedEpochAncestry` proof 成立を条件に merge facts を実測・attest し直して kind: converged のまま record 更新 + canonical audit attestation 行 append。`transitionAllowed` 無改変(ADR-3 契約2)
- [ ] Step 6: Red (B) — 孤児 epoch への現行拒否(`not an ancestor of the merged head`)を Red 実測(t3110 系 seam、合成孤児 epoch fixture)
- [ ] Step 7: human-presence 付き override 最終化 — report merged arm に追加。live checkout 前提は `verifyLandedPrerequisites`(git-runner :169-176)同等の緩和。既存 presence 機構(HUMAN_TURN 由来)必須、新 kind なし、reason に祖先証明失敗の実測逐語、merge facts を実測して attest(ADR-4 契約2-4)。override 提示面に祖先検査の実測結果を表示
- [ ] Step 8: 負例 pin — (i) attestation を伴わない手書き merge facts の report が FAIL のまま (ii) presence 不在の override が拒否(ADR-3 契約4 / ADR-4 契約5)
- [ ] Step 9: 非退行 — 単一 unit 従来フロー(created → landed、#3113 経路 = t3062 / t3110)と OPEN PR の live 束縛検査が無変更で green
- [ ] Step 10: 台帳 resync — 新規テストファイルの coverage-registry regen。plugin ツールは model-map 対象外だが、`bun run build`(plugin 投影再生成)+ typecheck / lint / 対象テスト(t450 / t481 / t482 / t534 / t3062 / t3110 系)をローカル green 確認。フルスイートは push 後 CI

除外(スコープ外): rfc-autonomy-modes の実 unit 回復操作(着地後の別作業)。override の新 CLI verb 追加が必要な場合はユーザー可視契約テストを同梱(services.md 契約)。
