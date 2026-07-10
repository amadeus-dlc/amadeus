# Reverse-Engineering 合成サマリ — 260710-delegate-answer-consume(#736)

Architect 合成担当。Developer スキャン(`developer-scan.md`)を codekb へ差分リフレッシュ合成した結果の要約。手法は diff-refresh(project.md 是正 cid:reverse-engineering:c1)。正本は `packages/framework/core/tools/`、行番号は core 側で確定。

## スキャンメタデータ

- **base**: `24197d755a51712c1bfd6fa405f709c070c61f0d`(前 intent `260709-dynamic-test-size` の re-scan 記録 observed)
- **observed**: `5e9040cdabd72034f9bd704c5d22ca7dde247a6e`(現 HEAD、`git rev-parse HEAD` 実測)
- **focus**: #736 委任機構の presence 境界 / #685 verb-scoped provenance 既実装状況 / 回帰テスト(t112・t188)/ dist 同期要件

## 核心所見(Architect 合成での確定)

差分区間 `24197d755..5e9040cda` の実体は **#685(verb-scoped provenance + `DELEGATED_REJECTION`)** の実装であり、#736 修正方式 B が要求する verb スコープの足場は HEAD に既存。ただし #736 の根本機構は verb スコープと**直交**する:

1. **[根本原因候補]** 委任**発行**側 grounding gate `handleDelegateApproval`(`amadeus-state.ts:1625`)/`handleDelegateRejection`(`:1719`)は **verb 無し** `humanActedSinceGate(pd)` を呼ぶ。リーダー ledger 上で `HUMAN_TURN → QUESTION_ANSWERED`(interview 応答)の順になると、QUESTION_ANSWERED が `GATE_RESOLUTION_EVENTS`(`amadeus-lib.ts:1506`)の resolution 要素として `lastResolution > lastHuman` を作り、`humanActedSinceGate` が `false` を返して**委任発行を誤拒否**する(実コードで検証済み: `amadeus-lib.ts:1544` `return lastHuman > lastResolution`)。
2. **verb では解けない**: QUESTION_ANSWERED は委任 type ではないため `humanActedSinceGate` の verb 分岐(`:1519-1524`)の影響を受けない。修正は境界イベント集合 or answer/delegate 経路の境界セマンティクスに触れる公算が高い(確定は functional-design 以降)。
3. **両立要件**: `t188-human-presence-gate.test.ts:325-348` が answer 経路の 1-answer/turn(consume-once)契約を pin。修正はこの契約を壊さずに delegate 発行の先食いを解く必要がある。
4. **回帰テスト未整備**: t112 に QUESTION_ANSWERED×委任 の交差ケース無し(`grep QUESTION_ANSWERED` ヒット0、実測)。新規テスト追加が必要。
5. **dist 同期**: フォーカス3ファイル(lib/state/audit)は `.claude/tools/`・`.codex/tools/` に生成コピーを持つ。core 改変時は package/dist:check + promote:self/check + typecheck + lint、audit を触るなら t28 sync を green 維持し core+dist+self-install を同一コミットで揃える(team.md Mandated)。

## 更新した成果物(2件)

- `codekb/amadeus/code-quality-assessment.md` — 先頭に「本 intent(delegate-answer-consume)の観測面」節を追加(#736-O1 発行 grounding の QUESTION_ANSWERED 先食い / O2 回帰テスト未整備と t188 両立要件 / O3 #685 verb 足場既実装と dist 同期義務)。ヘッダ注記も最新 intent へ更新。
- `codekb/amadeus/architecture.md` — 「委任 presence 機構の verb-scoped 構造(#685 実装後)」節を追加(境界述語 / 消費側 verb-scoped / 発行側 verb 無し の3層と非対称、#736 交差点、audit event 正本レジストリ)。

## メタデータ更新(2件)

- `codekb/amadeus/reverse-engineering-timestamp.md` — 最新 intent メタデータ・分析範囲・合成方針を prepend(前 intent 節は温存)。
- `codekb/amadeus/re-scans/260710-delegate-answer-consume.md` — per-intent base/observed/focus/差分焦点影響を新規記録(#707 契約)。

## 温存した成果物(7件)と理由

`api-documentation.md` / `business-overview.md` / `component-inventory.md` / `dependencies.md` / `technology-stack.md` / `code-structure.md` は温存。理由: 本 intent は presence 境界機構の観測に限局し、#685 は既存ファイル内の関数追加・シグネチャ拡張(新規モジュール/依存/公開 API 契約なし)であるため、API 契約・ビジネス面・コンポーネント目録・依存マニフェスト・技術スタック・コード構造がいずれも不変。
