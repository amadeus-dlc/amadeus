# Ideation Phase Boundary Check — 260810-swarm-directive-fixes

## 検証結果

- **境界:** Ideation → Inception
- **結果:** **CONDITIONAL PASS**
- **検証時刻:** 2026-08-10T13:14:00Z

Intent Capture → Scope Definition → Intent Backlog の追跡に欠落・孤児・無申告の scope 縮小はない。Issue #2833 と #2834 は1 intent のまま、7つの scope 能力と8つの proto-capability に完全対応している。

条件は #2834 の pinned behavior ruling である。全 Unit 列挙要求と現行 `consumes_absent` 契約の衝突を Inception で裁定するまで、PU-B の実装を開始しない。本 PASS はその仕様衝突を承認済みとして扱わない。

## 対象 Stage

| Stage | 状態 | Boundary 上の扱い |
|---|---|---|
| intent-capture | 承認済み | 共有問題、対象者、成功指標7件、単一 intent 境界を確定 |
| market-research | SKIP | 内部 framework の既知 bug であり、市場評価を要求しない scope |
| feasibility | SKIP | 実現可能性を推測せず、reverse-engineering で現行 seam を実測する |
| scope-definition | READY | In / Out、能力7件、proto-capability 8件、依存と順序を確定 |
| team-formation | SKIP | Unit / Bolt / swarm 編成は units-generation と delivery-planning で確定 |
| rough-mockups | SKIP | UI 変更を含まない |
| approval-handoff | SKIP | scope-definition が Ideation の最終 in-scope gate |

## Source Inventory

| Artifact | 状態 | 検証用途 |
|---|---|---|
| [`intent-statement.md`](../ideation/intent-capture/intent-statement.md) | Present | 問題2件、成功指標7件、後続裁定と配送制約 |
| [`stakeholder-map.md`](../ideation/intent-capture/stakeholder-map.md) | Present | decision rights、no-AI-merge、leader 報告先 |
| [`intent-capture-questions.md`](../ideation/intent-capture/intent-capture-questions.md) | Present | 単一 intent、対象範囲、Unit / Bolt / PR 分離の回答証跡 |
| [`scope-document.md`](../ideation/scope-definition/scope-document.md) | Present | S1–S7、Out、成功基準、裁定待ち |
| [`intent-backlog.md`](../ideation/scope-definition/intent-backlog.md) | Present | P1–P8、risk-first、2つの proto-Unit 候補 |
| [`scope-definition-questions.md`](../ideation/scope-definition/scope-definition-questions.md) | Present | 依存・順序・期限の full autonomy ladder 証跡 |
| feasibility outputs | N/A | stage SKIP。Issue クロスレビューの実測を Inception でコード証拠へ再接続する |

## Intent → Scope → Backlog Traceability

| Intent outcome | Scope | Backlog | 状態 |
|---|---|---|---|
| 7 stage の未解決 placeholder を除去 | S1・S2 | P4・P6 | Traced |
| missing / optional input を合意済み契約で扱う | S3 | P5 | Traced / ruling required |
| reviewer read scope の入力脱落を防ぐ | S4 | P7 | Traced |
| Retry / Skip / Abort の engine-owned 遷移 | S5・S6 | P1–P3 | Traced |
| Abort 後の同一 batch 再提示を止める | S5・S6 | P2・P3 | Traced |
| autonomous の安全停止と証拠保持 | S6 | P2・P3 | Traced |
| TDD、横断検証、Bolt / PR 規律 | S7 | P1・P3・P8 | Traced |

## Coverage Metrics

| Check | Coverage | 結果 |
|---|---:|---|
| 共有問題から Scope 系列への対応 | 2 / 2 (100%) | PASS |
| Intent 成功指標から Scope 成功基準への対応 | 7 / 7 (100%) | PASS |
| Scope 能力から Backlog への対応 | 7 / 7 (100%) | PASS |
| Backlog item の出典・依存位置 | 8 / 8 (100%) | PASS |
| Required Ideation artifacts | 6 / 6 (100%) | PASS |
| Orphan artifacts | 0 | PASS |
| 未回答の operational questions | 0 / 3 | PASS |

## Consistency Checks

- PASS: `cid:intent-capture:c4-2` に従い intent は1つで、独立性は Unit / Bolt / PR にだけ表現されている。
- PASS: #2834 は build-and-test 単独でなく同根7 stage と reviewer scope を保持している。
- PASS: #2833 は Abort 単独でなく Retry / Skip / Abort、swarm / non-swarm、autonomous を保持している。
- PASS: Stop hook 改修、新規 state、upstream-coverage sensor 改修は一貫して Out of Scope である。
- PASS: `report --result failed` の拒否は exit 0 + error directive として backlog / scope に保持されている。
- PASS: Issue severity は #2833=P1/S2、#2834=P2/S3/origin:bootstrap で一致し、固定期限は捏造していない。
- PASS: TDD、Bolt ごとの PR、convergence loop、no-AI-merge、設計逸脱時の停止を downstream 制約へ送っている。
- PASS: optional feasibility artifacts を実在すると偽装していない。

## Warnings and Hard Stops

1. **Pinned contract ruling:** `amadeus-directive.ts` の placeholder / `consumes_absent` 契約と t116 test 16 を reverse-engineering で実測し、requirements-analysis で実装前に裁定する。
2. **Shared-file conflict:** 両 Unit 候補が `amadeus-orchestrate.ts` を共有する。units-generation で実編集面を比較し、並行可能性を静的な Issue 分類だけで決めない。
3. **No silent narrowing:** 7 stage、reviewer scope、3裁定、swarm / non-swarm のいずれかを落とす必要が判明した場合は実装せず change control へ戻す。
4. **Merge boundary:** 各 Bolt の PR は収束させるが、ユーザー承認前にマージしない。

## Approval Evidence

- [x] Intent autonomy `full` grant をユーザーが承認 — 2026-08-10T12:50:12Z、grant `intent-grant-f7feaa252c696f08f3a273e893bdc9f7`
- [x] Scope operational questions は同 grant 下の decision ladder で3件とも記録済み
- [x] Required sensors の最新 fire は全件 PASS。answer-evidence の初回表記不足は grant 承認時刻を追加して再検証済み

## 結論

条件付きで Inception へ進める。Reverse Engineering は Issue コメントの行番号を記憶転記せず current HEAD で再実測し、#2834 の契約衝突と #2833 の ledger reader 不在を Requirements Analysis が裁定可能な証拠へ変換する。
