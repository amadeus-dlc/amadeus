# Design Decisions — standing-delegation-grant

上流入力(consumes 全数): `../requirements-analysis/requirements.md`(FR-1〜8・E-SDG-RA/RA2 裁定焼き込み)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 観測節)・`architecture.md`・`component-inventory.md`(いずれも本日 RE 現況)、`../practices-discovery/team-practices.md`(変更 0 件 — practices 制約なしの確認)

## ADR-1: グラントは発行者シャードの audit 行(E-SDG-RA Q1=A の実現)

- Context: Q1=A「issuer シャード audit 行方式・既存 checkpoint/cherry-pick 流路」。
- Decision: GRANT_ISSUED/GRANT_REVOKED は発行セッションの active intent シャードへ emit。受理側は全 intent シャード走査(findActiveStandingGrant)で発見 — グラントは intent 横断の standing 権限で、delegate のような --to-intent 宛先を持たないため(裁定文の「issuer シャード」の機械的帰結)。
- Alternatives Rejected: 宛先 intent ごとの行複製(delegate 同型)— per-intent 発行に戻り stall 解消効果が消える。専用ファイル/機械ローカル — Q1 裁定で棄却済み(e2 の C への 8: worktree 間配送実績は共有シャードのみ)。
- Consequences: 走査コストは intent 数×シャード数の grep 規模(数十ファイル・実測数百 KB)で許容。配送は per-grant 1回。
- セキュリティ影響: 行の偽造は (i) HUMAN_TURN 実在照合 (ii) PRESENCE_PROTECTED_EVENTS の mint 拒否(ADR-6)の2層で封鎖。

## ADR-2: 撤回は結果整合+TTL 上限(Q2=A)

- Context: GRANT_REVOKED 行は delegate と同じ checkpoint/cherry-pick 流路で配送されるため、取込前のツリーでは撤回が見えない時間差が構造的に生じる(E-SDG-RA Q2 の争点)。
- Decision: 伝播は結果整合。時間差は Expires At が上限を画す。即時性が要る撤回は leader の agmsg 通知+取込依頼の運用で補完(要 docs 明文)。
- Consequences: 受理検証はネットワーク非依存(オフライン耐性維持)。撤回の実効化は受理側の取込に依存 — 運用手順(通知→取込)を docs に載せる。
- Alternatives Rejected: 受理時 origin fetch 強制 — ネットワーク依存を検証パスへ持ち込みオフライン受理不能(Q2 裁定で棄却)。
- セキュリティ/コンプライアンス影響: 撤回遅延の露出窓は TTL(4h)で有界 — 無期限露出は構造的に生じない。

## ADR-3: session 終了失効は不採用(Q3=A)

- Context: #1125 提案4項の「session 終了失効(選択制)」。
- Decision: 採らない。失効は TTL と明示 revoke のみ。
- Consequences: 失効面は TTL と revoke の2種のみ — 判定は決定的入力(シャード行+現在時刻)に閉じる。TTL 4h(ADR-4)が実効上限。
- Alternatives Rejected: 発行セッション id 記録+受理時生存判定 — engine にセッション生存をシャード横断で判定する機構が不在(feasibility 実測)で、判定自体が新たな外部状態(プロセス表)依存を生み、fail-closed 検証の決定性を壊す。
- セキュリティ/コンプライアンス影響: セッション異常終了時もグラントは TTL まで有効に残る — 露出が問題になる場合は revoke を打つ運用(docs 明文)。

## ADR-4: TTL 既定 4時間の named constant(Q4=A)

- Context: TTL の意味論対照になる既存 named constant は不在(DEFAULT_LOCK_STALE_MS=10分 はロック鮮度で意味論が異なる)。値は E-SDG-RA Q4 選挙で決定。
- Decision: `export const DEFAULT_STANDING_GRANT_TTL_MS = 4 * 60 * 60 * 1000;`(amadeus-lib.ts、導出根拠コメントに E-SDG-RA Q4=A cite)。`--ttl-ms` で明示上書き可、parse は数値検証(型不正 loud refuse — 落ちる実証 (5))。env override は**設けない**(standing-approval-scope-limit — 常任権限の期限を env で無音延長できる面を作らない。DEFAULT_LOCK_STALE_MS の env 併設様式とは意図的相違: あちらはロック鮮度でセキュリティ境界でない — citation-semantics-check の明文照合)。
- Consequences: TTL 変更はコード変更(通常 PR+ユーザー承認)を要する — 無音の期限延長面が存在しない。
- Alternatives Rejected: env override 併設 — 常任権限の期限を env で無音延長できる面を作らない(DQ1/DQ2 裁定と verbatim 同文)。24h/1h — Q4 裁定で棄却。
- セキュリティ/コンプライアンス影響: 期限の改変経路がコードレビュー+ユーザー承認に限定される(standing-approval-scope-limit の実装面)。

## ADR-5: phase-boundary は既定除外+opt-in フラグ(E-SDG-RA2=C)— 機構確定

- Context: E-SDG-RA2 裁定 C(既定除外+opt-in)。除外判定は grant 受理点で自前計算する必要があり、既存の phase 比較実装(handleAdvance の state.ts:1332 / handleApprove の :1849-1852)はローカル計算で挿入点から到達不可(iteration 1 M-2 実測)。
- Decision: phase-boundary 性は **`findStageBySlug`(amadeus-lib.ts:5043)+`nextInScopeStage`(:5065)** で「解決対象 slug の phase ≠ 次 in-scope stage の phase」を導出する — state.ts:1332(`completedStage.phase !== nextStage.phase`)/ :1849-1852(`nextForPhaseGate.phase !== stage.phase`)の**独立2実装と意味論等価な第3の同型実装**(コード再利用ではない)。グラントの Includes Phase Boundary が true のときのみ受理。walking-skeleton(Skeleton Stance on の先頭 construction ゲート)と PR マージ(verb 不在=構造外)は opt-in 対象外の恒久除外。
- 留保転記の実装面: (e3) opt-in なしグラント×phase-boundary ゲート拒否は C-6 の赤側 (6) (e1) GRANT_ISSUED 行と verb 出力の両方に Includes Phase Boundary を常時明記 (e2) docs にフラグ名+「既定=除外」を明文。
- Consequences: phase-check ガード(PHASE_CHECK_REQUIRED_PHASES :135 — 成果物実在の機械検査)はグラントと独立に効き続ける(human-presence とは別系統 — RA reviewer 申し送りの機構確定)。第3実装の等価性はテスト(C-6)で既存2実装との一致ケースをピンする。
- Alternatives Rejected: :1332 のローカル変数の直接再利用 — 挿入点から到達不可(実測)。既存2実装の関数抽出リファクタ — 本 intent スコープ外(surgical・白側 sweep 面の温存)。恒久除外のみ/無除外 — E-SDG-RA2 で A/B 非採用。
- セキュリティ/コンプライアンス影響: opt-in は発行時の明示フラグ+GRANT 行への恒久記録で、無音の境界緩和面を作らない(e1 留保の実装面)。

## ADR-6: GRANT_* を PRESENCE_PROTECTED_EVENTS へ追加

- Context: 監査行はイベント名 allowlist 制で、presence 系イベントは CLI mint 拒否の保護集合(audit.ts:766)を持つ。
- Decision: PRESENCE_PROTECTED_EVENTS へ GRANT_ISSUED/GRANT_REVOKED を追加 — CLI append からの mint 拒否、書き込みは C-1 verb の in-process 経路のみ(HUMAN_TURN と同族の偽造耐性)。**EVENT_HEADINGS への正式エントリ2行も同時追加**(fallback 依存にしない — m-1 是正)+ audit-format.md taxonomy 追記。
- Consequences: audit-format.md・EVENT_HEADINGS・保護集合の3点同時更新が C-5 の棚卸し対象。
- Alternatives Rejected: 保護なし(通常イベント扱い)— 任意ツールから GRANT 行を鋳造でき偽造耐性が崩れる。検証側だけで防ぐ案 — HUMAN_TURN 実在照合は残るが、行自体の鋳造可能性を放置する理由がない(多層防御)。
- セキュリティ/コンプライアンス影響: グラント行の捏造経路を構造封鎖(ADR-1 の2層目)。**既知リスク(スコープ外委譲)**: presence ledger の HUMAN_TURN 自体が herdr 注入ターンと実ユーザーターンを区別できない面(Issue #1142、e3 観測)— グラント発行の接地根拠 HUMAN_TURN が注入で鋳造されうる。本 intent は HUMAN_TURN の真正性を**前提**として受け取り(既存 delegate 発行と同一の信頼境界 — グラントが新たに弱める面はない)、ledger 側の注入耐性は #1142 の別 intent へ委譲する(leader 推奨の整理、2026-07-17 04:55Z agmsg)。

## ADR-7: 受理分岐の挿入位置と対象 verb(AC-3b の実現)

- Context: human-presence 判定点は3箇所実在 — gate resolution(assertHumanPresentForGateResolution :1781)、delegate 発行接地(handleDelegateApproval :1975)、**delegate 拒否発行接地(handleDelegateRejection :2069 — :1975 の対称関数、コードコメント「Reject-side mirror」)**。
- Decision:
  1. グラント判定は humanActedSinceGate(lib:2479)が **false を返した後のフォールバック**として挿入。fail-open 分岐(lib:2484 `if (events === null) return true;`)は humanActedSinceGate 内部で true を返すためグラント判定に到達しない — グラントが既存 fail-open を広げも狭めもしない構造を「挿入位置」で保証。
  2. 対象 verb は **approve 側のみ**(gate resolution の approve 分岐+handleDelegateApproval)。**handleDelegateRejection(:2069)と reject 分岐は意図的除外** — ユーザーの standing authorization は「delegate は自動で**承認**してよ」(#1125 comment 4998659131 verbatim)で承認側に限定されており、拒否は是正的・例外的操作として per-gate の人間判断(HUMAN_TURN / DELEGATED_REJECTION)を維持する(C-2 是正: 非対称は列挙漏れでなく授権範囲の意図的反映。symmetric-pair-review 観点で検討済み)。
  3. **handleDelegateApproval 側の判定対象 state**: グラントの除外判定(phase-boundary 性)は **宛先(--to-intent)intent の state/scope** に対して行う — 現実装は targetRecord 解決(:2008)が接地ゲート(:1975)より後のため、**targetRecord 解決を接地ゲートより前へ移動**し、standingGrantSatisfiesGate へは宛先 state 由来の stateContent/scope を渡す(C-1 是正)。leader 自身の active intent state での判定は禁止(判定対象の取り違え)。
- Consequences: handleDelegateApproval の関数内順序変更(解決→接地→emit)が実装 diff に含まれる — 白側 sweep(既存 delegate フロー不変)のテスト対象に順序変更後の従来経路を含める。
- Alternatives Rejected: humanActedSinceGate 内部への統合 — fail-open 分岐との合流リスク(AC-3b 違反)と verb-scoped 意味論の複雑化。reject 側も対象化 — 授権文言の範囲外(拡大にはユーザーの追加 standing authorization が必要 — 将来 Issue)。
- セキュリティ/コンプライアンス影響: 承認のみの片側開放は「拒否はいつでも人間ができる」性質を保存 — グラント下でも人間の拒否権は per-gate で完全に残る。
