# Business Rules — phase2-live-e2e-evidence

## 入力と適用範囲

本規則は [unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)、[requirements.md](../../../inception/requirements-analysis/requirements.md)、[components.md](../../../inception/application-design/components.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[services.md](../../../inception/application-design/services.md) に基づく。

対象はKimi print、Kiro ACP、Kiro TUIの完了結果を既存registry、JSONL ledger、capability matrix、保守者runbookへ決定的に投影するspec Unitである。adapter実装、transport probe、追加live journey、Issue #1717 Phase 3は扱わない。

## Artifact applicability

本Unitのkindは [unit-of-work.md](../../../inception/units-generation/unit-of-work.md) で`spec`に固定されている。Functional Design stage frontmatterの`produces_kinds`では、`business-logic-model`は`service|ui|library`だけ、`business-rules`と`domain-entities`は`spec`を含む。したがってengine-resolved `produces`の正規必須集合は本書と`domain-entities.md`の2件であり、`business-logic-model.md`は本Unitの必須・候補成果物ではない。

spec Unitに必要なprojection処理シーケンス、分岐、失敗停止点は、[domain-entities.md](domain-entities.md) の「Projection algorithm」「State transitions」「Aggregate boundaries」に置く。規則の判定表と組み合わせて、独立business-logic artifactを発明せず実装可能な契約を構成する。

## Evidence admission rules

- **BR-EVD-01:** transport keyは`kimi-print`、`kiro-acp`、`kiro-tui`の3行を必須とし、ACPとTUIを単一Kiro行へ統合しない。
- **BR-EVD-02:** `kimi-print`は`status=supported`かつKimi自身のvalidated local green receiptを必須とし、follow-up branchを許可しない。
- **BR-EVD-03:** `kiro-acp`と`kiro-tui`はtransportごとに、`supported`＋自身のvalidated green receipt、または`unsupported|unverified`＋qualified follow-up Issue URLのいずれか一方を必須とする。
- **BR-EVD-04:** 一方のKiro transport、Kimi、Codex、Claude、Piのgreen receiptを別transportへ代用しない。
- **BR-EVD-05:** green候補はoutcomeが`AMADEUS_LIVE_E2E:PASS:SUCCESS`、cleanup barrier closed、adapter ID一致、40桁lowercase revision SHA、CLI version、journey ID、timestampを満たすrecorded receiptだけである。
- **BR-EVD-06:** cleanup failure、ledger write failure、timeout、skip、execution/assertion failure、unknown code、欠落provenanceはlatest green候補にしない。
- **BR-EVD-07:** follow-up IssueはGitHub Issue URL、blocker、sanitized evidence、推奨seam、再開条件、検証可能AC、Issue #1717への参照を持つ場合だけqualifiedとする。
- **BR-EVD-08:** `measured-only`、URLなし自由文、PR URL、ローカルfile pathを完了evidenceとして受理しない。

## Deterministic projection rules

- **BR-EVD-09:** `latestGreenByAdapter`はvalidated receiptだけをadapter IDでgroup化し、`recordedAt`降順、同時刻なら`receiptId`辞書順で一意に選ぶ。
- **BR-EVD-10:** matrix rendererはregistryを正本の行集合・表示順とし、ledgerやdirectory listingから未知行を自動追加しない。
- **BR-EVD-11:** `supported`行は自身のlatest green SHA、CLI version、journey ID、timestamp、opt-in keyを表示する。
- **BR-EVD-12:** follow-up-linked行はstatus、Issue URL、再開条件のbounded summaryを表示し、green SHAを表示しない。
- **BR-EVD-13:** registry statusとevidenceが矛盾する場合はmatrix更新を拒否する。`supported`＋greenなし、非supported＋Issueなし、supported＋follow-upのみはいずれもinvalidである。
- **BR-EVD-14:** marker-fenced matrixはcanonical rendererで全体再生成し、手編集の部分行を正本にしない。同じ入力はbyte-identical outputを返す。
- **BR-EVD-15:** check modeは生成候補とtracked matrixをbyte比較し、drift、重複marker、欠落行、未知行を非zeroで報告する。

## Safety and privacy rules

- **BR-EVD-16:** matrix、ledger summary、runbook、diagnosticへraw credential、API key、source auth/config path、raw prompt、raw transcriptを保存しない。
- **BR-EVD-17:** evidence textは共通sanitizer通過後のbounded digestまたは定型summaryだけを利用する。
- **BR-EVD-18:** ledger parse errorは該当lineを無視してgreenを継続するのではなく、projection全体をfail closedにする。
- **BR-EVD-19:** duplicate receipt identity、同一identityの内容衝突、unknown adapter、future schemaを黙って採用しない。
- **BR-EVD-20:** `GITHUB_ACTIONS=true`でlive journeyを起動しない既存hard denyを維持し、Evidence Unitのcheckはlive processを起動しない。

## Regression and completion rules

- **BR-EVD-21:** Phase 2完了checkはKimi/ACP/TUIの3行を検証した後、既存Codex/Claude/Pi contract testsがgreenであることを要求する。
- **BR-EVD-22:** `bun run build`と`bun run source-only:check`を通し、生成`dist/`やself-install surfaceをGit境界へ混入させない。
- **BR-EVD-23:** 保守者runbookはtransportごとのexact opt-in、認証前提、課金注意、serial実行、SKIP診断、再実行条件を記載する。
- **BR-EVD-24:** Kimi配布面変更時はKimi live journey、Kiro ACP面変更時はACP、Kiro TUI面変更時はTUIをIntent完了前にlocal実行する。別transportの実行で代替しない。
- **BR-EVD-25:** final evidence snapshotは検証対象Git SHAへ結び、dirty treeやSHA不一致を正式greenとして投影しない。
- **BR-EVD-26:** qualified follow-up branchは許可された完了であるが、Issue URLとregistry/matrix反映が揃うまでUnit完了にしない。

## Decision table

| Registry status | Own green | Qualified Issue | Decision |
|---|---:|---:|---|
| `supported` | yes | no | connectedとして有効 |
| `supported` | no | any | invalid、green不足 |
| `unsupported` / `unverified` | no | yes | follow-up-linkedとして有効（Kiroのみ） |
| `unsupported` / `unverified` | yes | any | invalid、status/evidence矛盾 |
| any | no | no | incomplete |

## Upstream traceability

| Concern | Source |
|---|---|
| 3 transportのregistryとmatrix | FR-01、FR-21 |
| Kimi green、Kiro direct/follow-up独立判定 | FR-08、FR-13〜FR-15 |
| canonical taxonomy、cleanup-before-PASS | FR-18〜FR-20 |
| runbookと再実行契機 | FR-22 |
| secret非保存、既存回帰、bounded evidence、provenance | NFR-01、NFR-05、NFR-07、NFR-08 |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T13:53:55Z
- **Iteration:** 1
- **Scope decision:** none

3 transportの証跡独立性、Kimiのgreen必須、Kiro ACP/TUIごとのdirect／qualified follow-up分岐、latest green選択、invalid ledgerのfail-closed、matrix・runbook・revision・既存回帰を含む完了契約は、business-rules.mdとdomain-entities.mdで整合している。ただしFunctional Designの必須成果物が欠落しているため完了契約を満たさない。

### Findings

- BLOCKER | functional-design.mdのStep 5およびproducesはbusiness-logic-model.mdを必須成果物としているが、authoritative scopeにはbusiness-rules.mdとdomain-entities.mdしか存在せず、business-logic-model.mdが欠落している。projectionの処理シーケンス、分岐、失敗時の停止点を独立した必須成果物として提示するという明示的なstage contract違反であり、成果物を追加して再レビューする必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T13:55:42Z
- **Iteration:** 2
- **Scope decision:** none

engine-resolved directive.produces は business-rules.md と domain-entities.md の2件のみであり、Unit kind=spec に対する stage frontmatter の kind filtering と整合するため、第1回の business-logic-model.md 欠落指摘は非該当です。渡された上流契約および成果物内容を再評価した結果、独立したtransport証跡、Kimi自身のgreen必須条件、Kiroのqualified follow-up条件、cleanup-before-PASS、closed taxonomy、runbook、secret非保存、既存transport回帰、bounded evidence、SHA provenanceが規則・エンティティ契約として実装可能な粒度で定義され、projection処理もdomain-entities.mdのProjection algorithm、State transitions、Aggregate boundariesに配置されています。開発者の追加判断を必要とするBLOCKERはありません。

### Findings

- None
