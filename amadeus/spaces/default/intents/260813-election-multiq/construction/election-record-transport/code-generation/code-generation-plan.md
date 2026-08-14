# コード生成計画 — election-record-transport

## 方針

U4 は既存コミット `993a15a0db feat(election): add multi-question record transport` で実装済みである。既存の record/transport surface を再実装せず、承認済み設計との照合で実証できた欠落だけをテスト先行で補正する。対象は `packages/framework/core/tools/amadeus-election-record.ts` と U4 の unit test に限定し、store mutation、CLI state transition、他 Unit の未コミット変更には触れない。

深度とテスト戦略は Standard。Bun の既存 `bun:test` / `fast-check` 構成をそのまま使い、新しい test configuration は追加しない。

## 実装手順

- [x] **Step 1: 設計・既存実装・影響範囲の照合** — U4 の functional design 3成果物、security design、unit-of-work、requirements とコミット `993a15a0db` の source/test 差分を確認し、既存実装の重複を避ける。
- [x] **Step 2: 現行 U4 テストのベースライン取得** — U4 unit/PBT/integration test 15件が修正前に成功することを確認した。
- [x] **Step 3: 独立 tally 再計算の失敗テスト追加** — ballot からは established になる question を current/history/record が hold と偽装した場合、現行 verifier が誤って成功する Red を確認した。
- [x] **Step 4: latest reservation provenance の失敗テスト追加** — ballot 配列順と `receivedAt` 順が異なる場合、現行 renderer が古い reservation を転記する Red を確認した。
- [x] **Step 5: 最小実装** — U2 の正準 `resolveResponses` / `tallyQuestions` を再利用し、latest response 選択と current tally/lifecycle の独立再導出を追加した。新しい互換レイヤーや fallback は追加していない。
- [x] **Step 6: focused 検証** — U4 unit/PBT/integration test 17件が成功し、追加した2件の Red が Green へ変わることを確認した。
- [x] **Step 7: 横断品質検証** — `bun run typecheck`、`bun run lint`、`bun run build`、`bun run source-only:check` はすべて exit 0。lint は既存 warning を報告したが、U4 変更箇所に新規 error はない。
- [x] **Step 8: 差分監査と成果物作成** — U4 source/test だけの diff と state file 不変を確認し、code summary と PR convergence report を作成した。共有作業ツリーの他 Unit 差分には触れていない。

## トレーサビリティ

| Step | 要件・設計 | 検証 |
|---|---|---|
| 1, 8 | U4 ownership / Constraints | commit・path・diff の実測 |
| 2, 6 | NFR-5、Standard test strategy | U4 unit/PBT/integration |
| 3, 5 | FR-TAL-6、BR-V1/V2/V4/V6、NFR-3/4 | 偽装 hold の fail-closed test |
| 4, 5 | FR-TAL-3/4、FR-OBS-1、BR-R4/R5 | out-of-order ballot の latest reservation test |
| 7 | NFR-5、project Testing Posture | typecheck/lint/build/source-only |

## 影響範囲

- **変更候補:** `packages/framework/core/tools/amadeus-election-record.ts`
- **テスト候補:** `tests/unit/t551-election-record-transport-v2.test.ts`
- **変更しない面:** codec、question tally、store、CLI、transport、generated `dist/` / self-install surface
- **リスク:** 低〜中。record verification の拒否条件を強化するため、既存の不整合データは新たに fail-closed となるが、これは承認済み設計上の期待動作である。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T17:37:00Z
- **Iteration:** 1
- **Scope decision:** none

変更はU4のrecord render/verifyおよびdelivery provenance責務内に閉じている。正準U2 APIを呼び出すことで集計policyをU4へ複製せず、store mutationやU5 state transitionも追加していない。reservation provenanceはU2のresolveResponsesによるvoter×question単位のreceivedAt semanticsを利用し、renderer側のdefinition/question/voter順で出力するため、入力配列順への依存を除去しつつ決定性を維持する。verifierはrecord/current tallyのkindを正解として再利用せず、materialized ballots・current target・previous historyから正準tallyQuestionsでresultとlifecycleを再導出して比較するため、BR-V1/V2、FR-TAL-6、FR-OBS-1に整合する。既存のhistory/current fold、preserved digest、question completeness、section/summary検査を置換または緩和した証拠はない。追加2テストは古いreservation転記と偽装hold受理を修正前に独立再現しており、要求外shim、fallback、二重実装、具体的な循環依存も認められない。

### Findings

- FOLLOW-UP | pr-convergence-report-formatのpass:falseはU4コード品質のBLOCKERではない。正規PR identity、head、CLI attestation、audit receiptは本レビューで許可されていないcommit・push・PR・audit操作を必要とするため、後続PR convergenceが所有して解消すべき配送証拠の未充足である。
