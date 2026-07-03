# Construction Decisions：Amadeus skill 英語化実施計画

## 判断一覧

| ID | 判断 | 根拠 | 影響 |
|---|---|---|---|
| CD001 | Issue #399 の完了境界は、#395、#400、#401、#402 の完了証拠だけでなく、#391〜#394 と残り `SKILL.md` の全面英語化完了まで含める。 | ユーザー確認により、#399 は Amadeus skill の全面英語化を管理する親タスクであり、#402 の展開単位確定だけでは閉じないと補正した。 | #399 は B005〜B010 の完了まで閉じない。 |
| CD002 | ci-pipeline は追加成果物なしで skip する。 | `.github/workflows/ci.yaml` は pull_request と main push で `npm run test:all` を実行している。`package.json` の `test:all` は typecheck、lint、契約検査、integration、e2e mock、examples、diff check を含む。 | Issue #399 用に CI の新設または大きな変更を行わない。既存 CI と各 Bolt の検証記録を完了証拠に含める。 |
| CD003 | #401 配下の #391、#392、#393、#394 は、#401 の計画証拠だけで代替しない。 | #401 は対応順序と PR 境界を決める Issue であり、個別 Issue の完了を意味しない。 | #391〜#394 の個別完了または対象外判断を B005 で追跡する。 |
| CD004 | 残り skill の実際の英語化は Issue #399 の完了条件に含める。 | Issue #399 は「方針確定 → 小さい英語化 PR → 意味差分対応 → 残り skill の段階的英語化」を親タスクとして管理する。#402 は残り skill の英語化単位を決める Issue であり、実際の英語化完了を代替しない。 | #399 は段階的実施計画と直接子 Issue 完了追跡だけでは閉じない。 |
| CD005 | PR #414 は、直接子 Issue の計画・追跡完了を確定する PR として扱う。 | PR #414 は B001〜B004 の traceability を確定したが、#391〜#394 と残り `SKILL.md` の全面英語化は未完了である。 | PR #414 merge 後も、Construction phase verification、workflow completion、registry completed、Issue #399 close は記録しない。 |
| CD006 | PR #416 の完了記録は取り下げ済みとして扱う。 | PR #416 は #399 close を前提に作成されたが、完了境界が誤っていたため close した。 | #399 は open のまま維持し、B005 以降を継続する。 |
| CD007 | B006〜B009（RU002〜RU006）の英語化は、単一リカバリ PR（PR #417）で統合実行する。 | 2026-07-03 の人間指示（PR #417 のリカバリ依頼）により、rollout plan の「Bolt ごとに個別 PR」を今回に限り上書きした。#391〜#394（B005）は翻訳と独立の意味差分判断のため本 PR に含めない。 | B006〜B009 の approval evidence は PR #417 merge でまとめて確定する。rollout plan には統合実行の注記を追記する。 |
| CD008 | 英語化した skill の provenance は md5 を書き換えず staleReason で維持する。 | Artifact Rules に従い、real provider 再生成ができない場合は staleReason を残す。英語化は生成される日本語 snapshot の構造を変えない。 | real provider による example 再生成と staleReason 削除を後続 PR で実施する。 |
| CD009 | AI-DLC v2 の reviewer 指定（11 stage、`reviewer_max_iterations: 2`）は reviewer sub-agent として採用せず、stage gate の人間承認、phase PR と Bolt PR のレビューと CI、`amadeus-validator` の構造検証へ写像する。 | 本家でも reviewer は人間 gate を代替せず最終判断は人間に残るため、承認境界が変わらない。配布契約に agent 実行基盤を追加しない。反復上限は Request Changes 3 回連続で Accept as-is を提示する既存規則で満たす。 | 写像は docs/amadeus/aidlc-v2-reviewer-mapping.md と 11 skill の Gate 節に明記した。gate 差し戻し頻発などの運用実績が出た場合は別 Issue で再検討する（#391）。 |
| CD010 | AI-DLC v2 の sensor 実行機構と learnings ritual の決定論ツールは採用せず、sensor は `amadeus-validator`、`traceability.md`、Build and Test と CI へ、Learn は stage `memory.md`（同じ 4 観点）、`decisions.md`、Grilling Decision Trail、`amadeus-history-review` と `amadeus-learning-review` の分類へ写像する。 | 決定論的検査と知見定着の役割は既存契約が分担済みであり、配布契約に hook 実行基盤と決定論ツールを追加しない。定着は自動化せず人間 gate を経る原則を維持する。 | 写像は docs/amadeus/aidlc-v2-sensor-learn-mapping.md、lifecycle overview の構造差分表、22 stage skill の Gate 節に明記した（#393）。 |
