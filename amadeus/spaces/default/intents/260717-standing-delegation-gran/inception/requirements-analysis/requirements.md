# Requirements — standing-delegation-grant(Issue #1125)

上流入力(consumes 全数): `../../ideation/intent-capture/intent-statement.md`(成功基準1〜7)、`../../ideation/scope-definition/scope-document.md`(MoSCoW・Forbidden 照合)、`../../ideation/feasibility/constraint-register.md`(C-1〜C-10)、codekb `code-structure.md`(delegate provenance 機構の観測節 — 本日 RE 実測)・`architecture.md`(ツール層のランタイム構造 — 本日 RE で現況性確認済み、grant verb の配置面)・`business-overview.md`(ゲート運用の業務文脈 — 同現況確認済み)、`../practices-discovery/team-practices.md`(変更 0 件)。機構引用は RE scan-notes の現 HEAD(46f51091f)実測からの転記。

設計4論点は E-SDG-RA(2026-07-17T03:18:17Z 開票、全問 A — e1/e2 全問 GoA 1・e3 Q1-Q3 GoA 1(Q4 後着記録)+提案側、agmsg 一次記録)で確定済み: **Q1=A issuer シャード audit 行方式 / Q2=A 結果整合+TTL 上限 / Q3=A session 失効不採用(根拠を design で ADR 化) / Q4=A TTL 既定 4時間**。以下の FR はその裁定の焼き込みである。

## FR-1: グラント発行 verb(`grant-standing-delegation`)

- AC-1a: 発行は leader セッションの実 HUMAN_TURN を接地根拠とする — `handleDelegateApproval` の接地ゲート(amadeus-state.ts:1957 系、`humanActedSinceGate(pd)` 拒否様式)と同型。接地なしは loud refuse(状態未変更)
- AC-1b: **チームモード判定**: `process.env.AMADEUS_OPERATING_MODE === "team"` でないとき発行拒否(env 唯一判定 — intent 成功基準7、agmsg 等からの推測禁止)
- AC-1c: GRANT_ISSUED 監査行を**発行者シャード**へ記録(E-SDG-RA Q1=A — 保存・配送は issuer シャード audit 行方式、配送は既存 checkpoint/cherry-pick 流路。e2 の C 拒否根拠「worktree 間配送実績は共有シャードのみ」を対抗根拠として記録)。フィールドは DELEGATED_APPROVAL 様式(Issuer Space / Issuer Intent / Issuer Shard / Issuer Human Ts)+ Scope / TTL(失効時刻 ISO)/ Grant Id(相関子)
- AC-1d: scope の初期語彙は `stage-gates` のみ(将来拡張は列挙型で受ける — 未知 scope は発行拒否)
- AC-1e: TTL は named constant 既定 **4時間**(E-SDG-RA Q4=A。例 `DEFAULT_STANDING_GRANT_TTL_MS = 4 * 60 * 60 * 1000` — 導出根拠コメントに裁定 cite を併記)+コマンド引数で明示上書き可。値の parse は数値検証(verification-numeric-parse)— 型不正は loud refuse

## FR-2: 撤回 verb(`revoke-standing-delegation`)

- AC-2a: GRANT_REVOKED 監査行(Grant Id 参照)を発行者シャードへ記録。撤回は grant と同じ接地ゲート(実 HUMAN_TURN+チームモード)
- AC-2b: 撤回後の受理は拒否される(FR-3 の未撤回条件)— 落ちる実証対象。撤回の伝播は **delegate と同じ結果整合**(E-SDG-RA Q2=A)— 取込前ツリーの時間差は TTL が上限を画し、即時性は leader の撤回通知(agmsg)運用で補完する旨を design で明文化
- AC-2c: session 終了失効は**採らない**(E-SDG-RA Q3=A)— TTL+明示 revoke のみ。不採用根拠(生存判定の新規機構は増分価値に見合わない)を design の ADR に記録

## FR-3: 受理側第2経路(全条件 AND・fail-closed)

- AC-3a: `delegate-approval` 発行時および gate resolution の **approve 側のみ**の human-presence 判定に、per-gate HUMAN_TURN / DELEGATED_APPROVAL に加わる第3の受理根拠として「有効グラント」を追加する。**reject 側(gate resolution の reject 分岐・handleDelegateRejection)は対象外** — 拒否は例外的・是正的操作として per-gate 人間接地を維持。【遡及訂正 2026-07-17: E-SDG-AD2 ユーザー裁定 X(03:55Z 頃、agmsg 一次記録)— 当初文言「(approve/reject)」は design 段で authorization verbatim『delegate は自動で**承認**してよ』(#1125 comment 4998659131)との矛盾が顕在化し、AD reviewer iteration 2 の Critical 指摘 → 停止 → ユーザーエスカレーションで承認側限定へ縮小。reject 側拡大は将来の追加授権 Issue による】判定は **全条件 AND**: (i) GRANT_ISSUED 行が issuer シャードに実在 (ii) その Issuer Human Ts の HUMAN_TURN が同シャードに実在(verifyDelegatedProvenance :2528 同族の実在照合) (iii) scope 適合 (iv) 現在時刻 < TTL 失効時刻(parse 後比較) (v) 同 Grant Id の GRANT_REVOKED 行が不在 (vi) 受理側も `AMADEUS_OPERATING_MODE === "team"`
- AC-3b: **fail-open 非相乗り**: `humanActedSinceGate` の presence ledger 走査不能時 fail-open 分岐(amadeus-lib.ts:2484 `if (events === null) return true; // fail open`)にグラント判定を差し込まない — グラント経路は条件不成立時に必ず「無効」へ落ち、従来経路(per-gate HUMAN_TURN / delegate)の判定へフォールバックする(グラントが既存の fail-open を広げも狭めもしない)
- AC-3c: グラント根拠で通過した approve/delegate の監査行に Grant Id を記載(事後追跡 — 成功基準6)

## FR-4: 既定除外(P4 境界)

- AC-4a: phase-boundary ゲート(分類データ = `PHASE_CHECK_REQUIRED_PHASES`、amadeus-state.ts:135 `const PHASE_CHECK_REQUIRED_PHASES: ReadonlySet<string> = new Set([` — 存在検査の消費行は :158)で識別ではグラントを受理根拠に使わない(loud にその旨を出力し従来経路を要求)
- AC-4b: walking-skeleton ゲート(フィールド書込みは amadeus-state.ts set-skeleton-stance(:572 の `"Skeleton Stance",` は setter 引数 — 是正時の独立再実測で :568→:572 に精密化)、**ゲート消費は amadeus-orchestrate.ts:683 `const SKELETON_STANCE_FIELD = "Skeleton Stance";`+:711 の読取分岐**)も同様に除外
- AC-4c: PR マージは engine に verb 不在(構造外)— 実装対象なし、テストは「grant がゲート系 verb 以外に影響しない」ことの白側 sweep で担保
- AC-4d: 除外集合の変更はコード変更(=通常 PR+ユーザー承認)を要する定数列挙で表現し、設定・env で緩和できない
- AC-4e: **phase-boundary は既定除外+発行時 opt-in フラグ(E-SDG-RA2 裁定 C、2026-07-17T03:28:21Z 開票 3/4 — e3/e1/e2 各 GoA 2。起草者推奨 B は非採用・受容度内)**: 既定は除外(統制側)、発行時に `--include-phase-boundary` 相当の明示フラグで対象化できる。GRANT_ISSUED 行に opt-in の有無を必ず記録する
- AC-4f: 裁定留保の転記(citation-reservation-preservation、留保必須票3件=転記3件): (1) **opt-in なしグラントでの phase-boundary 拒否を落ちる実証 AC に必須**(e3)— AC-5a の赤側へ追加済み(6種目) (2) **既定除外の明文+発行時の出力文言に opt-in 有無が必ず現れる(無音の含み込み禁止)を design で固定**(e1) (3) **フラグ名と「既定=除外」を発行 UI(verb の出力)と docs の両方に明文**(e2)— FR-7 AC-7b の docs 棚卸しに含める

## FR-5: 落ちる実証+白側 sweep

- AC-5a: 赤側6種を実測: (1) scope 外 gate への適用拒否(除外ゲート) (2) TTL 切れ拒否 (3) 撤回後拒否 (4) ソロモード(env 未設定)での発行拒否・受理拒否 (5) TTL 型不正入力の loud refuse (6) **opt-in なしグラントでの phase-boundary 拒否**(E-SDG-RA2 留保(1))。注入は実行時消費される実データ(監査行 fixture)へ(inject-runtime-consumed-lines)
- AC-5b: 一時状態 fixture を明示的に含める(E-SDG-IC C1): TTL 境界直前/直後・撤回直後・GRANT 行のみで HUMAN_TURN 欠落のシャード
- AC-5c: 白側 sweep: グラント不在時の既存 delegate フロー(#671)の挙動不変 — 既存テスト(delegate/provenance/human-presence 系)全 green+新規リグレッションケース
- AC-5d: 検証列: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` 全 exit 0、push 前 local lcov で patch 未カバー 0(in-process seam — 既存 state/lib テスト前例に倣う)

## FR-6: doctor 可視化

- AC-6a: `amadeus-utility.ts doctor` に有効グラント行を追加(DoctorCheck 様式 utility.ts:912-932 対照): 有効グラントの有無・scope・残 TTL・発行 intent/shard。グラント不在時は「なし」を pass 表示(空文 advisory を出さない)

## FR-7: 監査 taxonomy・偽造耐性

- AC-7a: GRANT_ISSUED / GRANT_REVOKED を audit イベント taxonomy(knowledge/amadeus-shared/audit-format.md)へ追記し、`PRESENCE_PROTECTED_EVENTS`(amadeus-audit.ts:766)へ追加 — CLI `amadeus-audit append` からの mint を拒否し、書き込みは state verb の in-process 経路のみ
- AC-7b: ドキュメント同期: docs 参照面の棚卸し(delegate 運用を記述する docs/reference の該当節)を design で列挙し、同一 PR で更新

## FR-8: 配布・着地

- AC-8a: 正本編集 → `bun scripts/package.ts`+`bun run promote:self`、dist:check / promote:self:check exit 0
- AC-8b: Bolt PR(レビュアー先行指名+leader 報告)、マージはユーザー承認(no-AI-merge)。着地後 grep → Issue #1125 クローズ(close-after-landing-verification)

## トレーサビリティ

| FR | 由来 |
|----|------|
| FR-1/2 | #1125 提案1・4項+IC Q1 裁定+C-9+C-10(撤回の結果整合)+成功基準7(発行側)+ユーザー standing authorization(#1125 comment 4998659131 — 発行 UX は「ユーザー指示 → leader が grant verb 実行」) |
| FR-3 | #1125 提案2項+成功基準1/7+C-1/C-2+RE 発見(fail-open 非相乗り) |
| FR-4 | #1125 提案3項+成功基準2+C-3+C-8(no-AI-merge 等の不変)+standing-approval-scope-limit |
| FR-5 | 成功基準3/4+Mandated 落ちる実証+E-SDG-IC C1+C-5/C-6 |
| FR-6 | 成功基準5+#1125 提案4項 |
| FR-7 | 成功基準6+C-4/C-7+audit-format 正本規律 |
| FR-8 | project.md Mandated+FR-7(#922 前例) |
