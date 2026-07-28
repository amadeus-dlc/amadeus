# Requirements — Intent Mirror の GitHub Project Status 同期(lifecycle フェーズ写像+Amadeus 側 item 追加)

上流入力(consumes 全数): intent-statement, scope-document, business-overview, architecture, code-structure, team-practices

各上流の依拠箇所: 問題定義・成功指標は intent-statement(収束性主軸)から、In/Out 境界と受入条件18項目は scope-document から、mirror スタックの構造制約は RE codekb の architecture(設計分岐点4点)と code-structure(16ファイル地図)から、業務位置づけは business-overview(Project ボード面への拡張)から、同意境界の論点送付は team-practices(§ ギャップ検討)から引いた。

引用ラベルの規約(3種): 「architecture.md 設計分岐点」= 宣言 consumes の codekb 記載(observed cd937c991)。「実装直読」= RE 工程で本 intent の record(inception/reverse-engineering/scan-notes.md)と codekb/amadeus/re-scans/260727-mirror-project-status.md に記録した実測(同 observed、2026-07-27)。「decision-log D-n」= 本 intent record の裁定台帳(ideation/approval-handoff/decision-log.md)への参照。後2者は宣言 consumes 外のため出典を明示的に区別する。

## 承認系譜(approval-lineage-citation)

1. 当初 Issue #1560(作業進行状態マッピング)→ **2026-07-27 ユーザー訂正**: lifecycle フェーズ写像へ改訂(decision-log D-8、Issue 本文同時改訂)。
2. **仕様変更 B**(同日、decision-log D-10): 「Bだろ。auto-addは無効化しますので、Amadeus側がideationに追加してください。」— Amadeus 側での Project item 追加+即フェーズ Status 設定を In Scope 化(Issue 本文へユーザー許可のもと反映済み)。
3. 本ステージ Q1〜Q4 裁定(requirements-analysis-questions.md、ユーザー承認 2026-07-27T05:39:15Z)。

## 用語

- **対象 Project**: 設定(FR-5)で指定された GitHub ProjectV2(**item 追加(FR-2)の適用範囲はこれのみ**)。
- **同期対象 Project**: mirror Issue が所属し、参照・更新権限のあるすべての Project(対象 Project+手動追加分)。**Status 同期・completion ゲート・診断(FR-3/4/6/7/8/9)の適用範囲はこちら**(Issue #1560 同期対象欄・verbatim「Mirror Issueが所属し、参照・更新権限のあるすべてのGitHub Projectを対象とする」)。
- **期待 Status**: 現在の lifecycle フェーズ(または Intent 完了)からマッピング(FR-3)で導出される Status 選択肢名。

## FR-1 対象検出と no-op 契約

- FR-1a: mirror Issue が Project 未所属かつ対象 Project 設定が無い場合、既存の create/sync/close 挙動を一切変えない(no-op — Issue 受入条件1)。
- FR-1b: **同期のための**所属 Project 検出・mutation は、既存 eligible boundary / manual invocation の create/sync/close チェーン内でのみ行う。polling・daemon・GitHub Actions を導入しない(受入条件14)。例外の明文化: read-only の `repair status`(FR-9)は診断コマンドとしてチェーン外から所属・現在 Status を**読み取る**が、これはオンデマンドの単発照会であり polling ではなく、mutation を伴わないため本制約に抵触しない。
- 受入基準: Project 連携設定なしの既存テストスイート(t282 等)が無変更で green。所属検出の追加 API 呼び出しは boundary 実行内に限られることをテストで固定。

## FR-2 Project item 追加(仕様変更 B)

- FR-2a: 対象 Project 設定があり mirror Issue が未所属の場合、create/sync チェーン内で item を追加する(`addProjectV2ItemById` 相当)。追加は**冪等**: 既所属なら追加をスキップし失敗にしない。
- FR-2b: 追加直後、同一チェーン内で現在フェーズの期待 Status を設定する(create 時の典型は `Ideation`)。
- FR-2c: 追加失敗は Status 更新失敗と同じ失敗セマンティクス(FR-7)に従う。
- FR-2d: 対象 Project 設定が無い場合、追加は行わない(従来挙動 — Issue 同期対象欄の改訂どおり)。
- 受入基準: 未所属→追加+Status 設定 / 既所属→追加スキップ+Status 同期のみ / 設定なし→追加なし、の3分岐をテストで固定(受入条件2「設定済み対象Projectへ冪等に追加され、追加直後に現在フェーズのStatusが設定される」)。

## FR-3 フェーズ→Status 同期(既定マッピング)

- FR-3a: 既定マッピングは次のとおり(Issue #1560 改訂版・verbatim): `IDEATION`→`Ideation` / `INCEPTION`→`Inception` / `CONSTRUCTION`→`Construction` / `OPERATION`→`Operation` / Intent `Completed`→`Done`(終端 — completion 時のみ)。`Backlog / In Progress / Review` 等の一般作業ボード状態への写像は行わない。
- FR-3b: 現在フェーズの取得源は state file の `Lifecycle Phase` フィールド(既存 seam `lifecycleSnapshot()` — 実装直読: amadeus-mirror-lifecycle.ts:252 `lifecyclePhase: getField(target.stateContent, "Lifecycle Phase") ?? "?"`)。boundary の `phase-verified.phase` は**前フェーズ**であり期待 Status の導出に使わない(architecture.md 設計分岐点「phase seam は lifecycleSnapshot のみ」)。
- FR-3c: Intent 完了の判定は既存 landing 判定と同一(registryStatus =`complete` かつ Status=`Completed` — 実装直読: coordinator.ts:250-258 の landingEvidence)。完了時のみ `Done` へ遷移する。
- FR-3f(同期の対象範囲): Status 同期(FR-3/FR-4/FR-6〜FR-9)は「mirror Issue が**所属し、参照・更新権限のあるすべての Project**」(対象 Project+手動追加分)へ適用する — scope-document In Scope 6。**対象 Project 限定なのは FR-2 の item 追加のみ**(この非対称は仕様: 追加は設定で bounded、同期は所属実態に従う)。
- FR-3d: phase boundary(phase-verified)で発火した sync は遷移後の現在フェーズの期待 Status へ同期する(受入条件3〜5)。
- FR-3e: 同期は冪等 — 現在 Status が既に期待 Status なら mutation を発行しない(no-op を receipt に記録可)。
- 受入基準: 各フェーズ遷移 boundary→期待 Status 設定、完了→Done、既一致→mutation 0 回、をテストで固定。

## FR-4 parked 維持

- FR-4a: `parked` boundary で発火した同期、または registryStatus が `parked` の間は、Project Status を変更しない(park 前の Status を維持 — Q4 裁定 A、受入条件8)。parked 用の独立マッピング機構は持たない(Issue 改訂で廃止)。
- FR-4b: park 中の manual sync でも Status は変更しない(Q4 裁定 A の二重判定による — Issue 本文の同期は従来どおり)。
- 受入基準: parked boundary / park 中 manual sync の両経路で Status mutation 0 回をテストで固定。

## FR-5 設定(3層 config の closed-schema 拡張)

- FR-5a: 対象 Project の指定と Project 別フェーズ Status 名上書きは、既存 mirror config(3層 `config.json`: global/space/intent)への closed-schema 拡張として追加する(Q3 裁定 A)。
- FR-5b: 契約: (i) unknown key は従来どおり fail-closed で拒否 (ii) 新キーの有効値を持つ最後の層が勝ち、**層間マージはしない**(全置換) (iii) キーの正確な形状・命名は application-design で確定する(裁定済み委任 — 無申告逸脱ではない)。
- FR-5c: 上書きはフェーズ→選択肢名の対応のみを変更し、フェーズ遷移の意味は変更しない(Issue 状態マッピング欄)。
- 受入基準: unknown key 拒否 / 層置換(マージなし)/ 上書き適用の3面をテストで固定(受入条件9)。

## FR-6 照合規則と safety-blocked

- FR-6a: 期待 Status 名と実 Project の選択肢名の照合は **exact match(大文字小文字含む完全一致)のみ**(Q2 裁定 A)。正規化(case/trim)は行わない。
- FR-6b: Status フィールドまたは期待選択肢を解決できない場合、当該 Project の sync を `safety-blocked` とし(既存 MirrorReceiptStatus 語彙を再利用)、completion close へ進まない(受入条件10)。
- FR-6c: safety-blocked の診断出力には「期待した選択肢名」と「実在する選択肢名の一覧」を含め、解決手順(Project 側の選択肢再構成 or 上書き設定)へ誘導する。秘匿情報は含めない。
- 受入基準: 選択肢不在(実測済みの現 Project #5 状態が実例)で safety-blocked+診断内容、選択肢追加後の再 sync で収束、をテストで固定。落ちる実証は「存在しない選択肢名」注入で赤を確認。

## FR-7 失敗・再試行セマンティクス

- FR-7a: Issue 本文更新と Project 更新(追加・Status 設定)は別 mutation であり、部分成功を前提とする。一時的な Project 更新失敗は sync を `pending` として永続化する(受入条件11)。
- FR-7b: 次の eligible boundary または明示 manual sync で、成功済み更新を含めて**冪等に reconcile** する(再実行で重複追加・重複 mutation を発行しない)。
- FR-7c: Project ごとの更新結果を receipt で追跡し、どの Project が成功/未完了かを判別できる(per-Project receipt — 受入条件6の複数 Project 独立性を支える)。
- FR-7d: 失敗分類は既存 `MirrorFailureClass` の値集合(実装直読: amadeus-mirror-types.ts:45-59、14種)へ写像する。GraphQL 応答は HTTP 200 でも `errors` を持ちうるため、body 層での失敗検出を行う(実装時に実 gh 応答で実測確定する条件付き要件 — external-seam-vocab-measurement 準拠)。
- FR-7e: gh 不在・未認証・API 障害時は当該 mirror 呼び出しを loud fail し、workflow 全体は恒久停止しない(既存 Mandated — unsynchronized warning+retry state)。
- 受入基準: 部分成功(Issue 成功+Project 失敗)→pending→次回 boundary で収束 / 再実行での mutation 冪等性、を failure injection テストで固定。

## FR-8 completion ゲート

- FR-8a: completion では既存の `final sync → close` 順序を維持し、**全同期対象 Project の Status が `Done` へ同期できた後にのみ** close へ進む(受入条件7)。
- FR-8b: 同期対象 Project の Status 同期が未完了(pending / safety-blocked)の間は mirror Issue を close しない(受入条件10 後段)。
- 受入基準: Done 未達 Project が1つでもあれば close 不実行、全 Done 後に close、をテストで固定。

## FR-9 診断(repair status 拡張)

- FR-9a: read-only の `repair status` を拡張し、次を検出する(受入条件12): (i) record と Issue 本文の drift(既存) (ii) 各同期対象 Project の現在 Status と「現在フェーズから導出した期待 Status」の drift (iii) Status フィールド/選択肢の未解決 (iv) Project API の認証・権限不足 (v) 複数 Project の部分成功状態。
- FR-9b: `repair status` は remote mutation を行わない(既存不変条件の維持)。
- FR-9c: 期待 Status の導出は同期側(FR-3)と同一の canonical 定義を共有する — 診断用の複製導出を作らない(cid:code-generation:c1-drift-canonical-renderer)。
- 受入基準: drift あり/なし・未解決・権限不足の各ケースの診断出力をテストで固定し、診断実行中の gateway mutation 呼び出し 0 回を assert。

## FR-10 同意境界・認証

- FR-10a: Project 同期(item 追加+Status 設定)は create/sync 操作の **bounded な一部**と定義する(Q1 裁定 A)。`auto-mirror: auto` の standing consent はそのまま適用され、`prompt` モードでは既存の操作単位 ask に内包される。PR merge / release / publish / deploy / 無関係な外部操作への拡張は引き続き禁止(affirmed Forbidden 不変)。受入基準(negative assert): gateway の argv 生成に PR/release/deploy 系 API 経路が存在しないことをテストで固定し、`MIRROR_USER_CONTRACT.scopeExclusions`(実装直読: presentation.ts:127 = pull-request/release/deploy/daemon/polling)と docs の parity テスト(t291 系)を Project 同期追加後も維持する。
- FR-10b: 必要な GitHub 認証要件(GraphQL ProjectV2 への `project` scope 等)をドキュメント化する(受入条件15)。scope 不足・権限不足は対象と必要権限を秘匿情報なしで診断し、自動的な認証 scope 変更は行わない。
- 受入基準: ドキュメント(既存 mirror docs 4文書体系)に認証節が存在し docs contract を通過。権限不足注入で診断メッセージをテスト固定。

## FR-11 不変条件(Won't)

- Project からの item 削除・アーカイブを行わない(受入条件13。追加は FR-2 の対象 Project に限る — 設定されていない Project へは追加しない)。
- 一般作業進行状態(Backlog/In Progress/Review)への写像を行わない。
- 双方向同期(Project → record)を行わない。Project 側の手動変更は FR-9 の drift 診断でのみ可視化する。
- daemon / polling / GitHub Actions を必要としない(受入条件14)。
- 受入基準: gateway の argv 生成に削除/アーカイブ系 mutation が存在しないことをテストで固定(negative assert)。

## FR-12 テスト・配布同期

- FR-12a: Gateway / executor / state codec・reducer / lifecycle / CLI 診断の unit・integration テストを追加する(受入条件16)。既習様式(実装直読 — re-scans/260727-mirror-project-status.md と scan-notes.md §4.2 に記録): gateway=fake runner+実 gh envelope の od -c golden、executor/coordinator=FakeGateway(gateway interface 実装クラスは t279/t282/t284/t300 の4箇所 — application-design レビューの実測 grep で確定、t280 は型キャストのため手動確認)、lifecycle=runtime 注入。
- FR-12b: 正本(packages/framework/core)から全ハーネス projection(7面)を再生成し、distribution drift guard を通す(受入条件17)。閉じた台帳(MIRROR_TOOL_FILES / t285 件数 / docs TOPICS / MIRROR_USER_CONTRACT)をモジュール・文書追加と同一変更で同期する。
- FR-12c: 新設ガード・検査は「落ちる実証」+正当データで赤くならない両側実測を完成条件とする(org.md Mandated)。

## NFR(本 intent 固有)

- NFR-1(冪等性): FR-2a/FR-3e/FR-7b の冪等性は再実行テスト(同一 boundary の二重実行)で検証する。
- NFR-2(fail-closed): 設定・照合・状態 codec の全新規面は fail-closed(unknown key 拒否・exact match・parse 失敗は invalid)。
- NFR-3(リクエスト規模): 1 boundary あたりの Project API 呼び出し回数は所属 Project 数 N に対して線形で、**Project あたりの呼び出し回数の上限値は application-design の呼び出し設計から導出して数値固定し、テストで per-Project 呼び出し回数を assert する**(constants-from-code — 数値の確定は design へ明示委任)。rate-limit は既存 retryable 分類(429→rate-limit)で吸収し、新たな throttle 機構は導入しない。
- NFR-4(秘匿): 診断・警告・receipt に token 等の秘匿情報を含めない(実装直読: gateway の redactSummary(amadeus-mirror-gateway.ts:456-465)流儀 — 生 stdout/stderr を転記しない)。

## Assumptions(前提 — feasibility raid-log の A 系を要件断面へ転記)

- A-1: 運用者の gh token は `project` scope を保有する(現行環境は実測で保有確認済み。配布先環境は保有を仮定せず FR-10b の診断・ドキュメントで対応)。
- A-2: mirror Issue の所属 Project 数は少数(1〜数個)— NFR-3 の線形性が実用上問題にならない規模(推定: medium。上限の数値化は design 委任)。
- A-3: Project への追加経路は Amadeus のみ(仕様変更 B 前提 — GitHub 側 auto-add workflow は運用者が無効化。手動追加された Project も FR-3f により同期対象)。
- A-4: 実 Project #5 の期待選択肢(Ideation 等)は現状不存在(実測)— 運用開始前提として Project 側の選択肢再構成または上書き設定(FR-5)が必要。それまで safety-blocked(FR-6)が正しい挙動。

## トレーサビリティ(scope-document In Scope 18項目 ↔ FR)

| In Scope # | FR |
|---|---|
| 1 | FR-1a |
| 2(IDEATION→Ideation) | FR-3a/3d |
| 3〜5(遷移) | FR-3d |
| 6(複数 Project) | FR-7c(独立 receipt)+FR-2/3 の per-Project 適用 |
| 7(final sync→Done→close) | FR-8a |
| 8(parked 維持) | FR-4 |
| 9(上書き設定) | FR-5 |
| 10(safety-blocked) | FR-6b/FR-8b |
| 11(pending 冪等収束) | FR-7a/7b |
| 12(repair status) | FR-9 |
| 13(削除・アーカイブ禁止) | FR-11 |
| 14(daemon 等不要) | FR-1b/FR-11 |
| 15(認証ドキュメント) | FR-10b |
| 16(テスト) | FR-12a |
| 17(dist 再生成) | FR-12b |
| 18(冪等追加+即 Status) | FR-2 |

## design への委任事項(裁定済み・無申告逸脱ではない)

- Project 同期を第4 operation とするか sync/create 操作の内部ステップとするか(architecture.md 設計分岐点「MirrorOperation 3値の5面連動」を踏まえ application-design で ADR 化)。
- config 新キーの正確な形状・命名(FR-5b (iii))。
- state への永続化形(per-Project receipt の codec 表現 — ROOT_KEYS 拡張の3面同時更新前提)。
- GraphQL argv 族・envelope/errors 解釈層の設計(gateway 内に閉じる前提)。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-27T05:57:31Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の6件は全て閉じたが、是正で新設した FR-3f と FR-8/FR-9 の用語(狭義の対象 Project)が内部矛盾(Major 1)+承認系譜引用の種別未定義(Minor 1)。両指摘は機械検証可能クラスとして conductor が残余是正を適用済み(E-LSSADS13)

### Findings

- [Major] FR-8a/8b/9a が狭義の「対象 Project」を使用し FR-3f(所属全 Project へ同期)と矛盾 — 手動追加 Project の Done 未達でも close されうる/drift 診断が見逃す(requirements.md:17,39,75,76,81)
- [Minor] 承認系譜節の decision-log 引用が引用ラベル規約(2分類)に無い第3種別 — 規約への追加か consumes 外明示が必要
