# Tech Stack Decisions: solo-gate-transaction

## Inputs

`business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`を確認した。

## Decisions

| Concern | Selection | Rationale |
|---|---|---|
| Runtime | Bun 1.3.x compatible | 現行CLI subprocessとtest runnerを維持 |
| Language | strict TypeScript ESM | directive/result discriminated unionとexact validation |
| Transport | existing CLI argv + single JSON stdout + fallback-only opaque `target_intent_id` | 認可源をhumanへ戻しつつtransaction targetをactive cursor/pathから分離 |
| Presence routing | existing `.amadeus-sessions/` runtime + trusted UserPromptSubmit writer | 同一host sessionの実human turnだけをreceipt owner auditへmint |
| Lock hierarchy | existing workspace-level intent registry outer lock → owner intent audit/state inner lock | cross-intent receipt TOCTOUとowner transactionを直列化 |
| Persistence | existing Markdown state + append-only audit | standing grantを設定modelへ移さない |
| Tests | `bun:test`、existing integration harness、fast-check | wire matrix、state/audit invariant、concurrency順序を固定 |
| Formatting/type | Biome + existing strict typecheck | repository規約と生成物を維持 |

## Compatibility Decisions

carrier pair、workspace outer lock、strict state result parserはgrant-backed solo branchだけに置く。通常のhuman/team branchのargv、stdout/stderr、locking、leader/delegation、audit/state契約は変更しない。fallback continuationだけがopaque target UUIDとsession reservationを使用し、trusted hookがowner ledgerへmintしたturnをtarget intentの既存human guardで検証する。generated harness copyは直接編集せずcanonical coreを実装ownerとする。

## Rejected Additions

new service、database、standing-grant config、pseudo gate value、stderr text classifier、background retry、new runtime dependencyは導入しない。carrierへのIntent Id追加とRoute Id専用lockも、ADR-011および既存workspace lock再利用より契約面が広いため採用しない。

## Traceability and Ownership

| Decision | Upstream | Transaction rules | Verification |
|---|---|---|---|
| strict typed CLI wire | FR-08, FR-10, FR-15–18, NFR-03–04 | TR-08–14e, TR-25 | directive/report unit suites |
| existing lock hierarchy | FR-12–17, NFR-01–02 | TR-15–23 | concurrency integration |
| existing audit/state | NFR-01, NFR-06 | TR-04–05, TR-19–20 | audit/state integration |
| branch compatibility | FR-19, NFR-05 | TR-02, TR-14, TR-21 | team/human golden |
| canonical generation | FR-24–26, NFR-08 | harness contract | drift checks |
