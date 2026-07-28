# Business Logic Model — u1-project-sync-skeleton

上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

U1 のスコープは unit-of-work の定義(最小 end-to-end: 単一の設定済み Project・既定マッピング)に従い、unit-of-work-story-map のジャーニー1(「intent 開始でボードに Ideation が現れる」)を成立させる。ロジックは components の割付(gateway/policy/executor/config/codec 最小形)と component-methods のシグネチャに接地する。

## 同期ステップの制御フロー(executor 内部ステップ — ADR-1)

処理は create / sync 実行の Issue 本文 mutation 成功後に、同一チェーン内で実行する:

1. **設定解決**: config の `mirror-projects`(U1 は単一要素のみ対応 — requirements FR-2d: 設定なしなら本ステップ全体を skip し従来挙動)。
2. **所属照会**: `listProjectItems(issue)` 1回(services の GraphQL 依存)。失敗時は当該 boundary の Project 同期を中断し、**unsynchronized 警告のみ**残して Issue 面の成果を保持(FR-7e の loud-fail+継続。台帳へは書かない — pending 台帳と冪等 reconcile は U2 責務)。
3. **Status/Project 解決**: `resolveProjectStatusField(project)` 1回 → `MirrorProjectStatusField`(projectId を含む)。フィールド不在 → **safety-blocked の観測**: 当該 Project を skip し診断ログを出す(FR-6b の U1 範囲 — 台帳への safety-blocked 記録は U2)。
4. **追加(冪等)**: 対象 Project が未所属なら `addProjectItem`(projectId は手順3、issueNodeId は手順2の一括照会から)— 既所属はスキップ(FR-2a)。取得した itemId は成功時の台帳 entry(手順8)に含める。
5. **期待 Status 導出**: `expectedProjectStatus(snapshot, boundaryKind, statusNames)`(component-methods C2、canonical 1定義)。`keep` なら以降 skip(U1 では parked 経路はテストのみ — 本格対応は U3)。
6. **exact match 照合**: 期待名と options の完全一致(FR-6a)。不一致 → safety-blocked の観測(手順4と同じ扱い: skip+診断(期待名 vs 実在一覧))。
7. **適用(冪等)**: 現在 Status が期待と一致なら mutation 省略(FR-3e)。不一致なら `updateProjectItemStatus`。
8. **台帳更新(synced のみ)**: 追加〜適用が成功した場合にのみ projectSync entry(state: `synced`)を upsert する(ADR-3 最小形 — unit-of-work U1 の「台帳の最小形(synced のみ)」境界。pending / safety-blocked の台帳状態と収束遷移は U2 で導入)。

<!-- Text fallback: 直線8ステップ。分岐は (a) 設定なし→全 skip (b) 照会失敗→警告のみで中断(台帳非書込) (c) 既所属→追加 skip (d) フィールド/選択肢未解決→skip+診断(台帳非書込) (e) keep→適用 skip (f) 既一致→mutation 省略。台帳へ書くのは成功時の synced のみ。 -->

## 落ちる実証と mutation 実証(unit-of-work U1 の検証欄より)

- 実 Project #5 で add/update の成立を実測する(A-4 の状態次第で safety-blocked の正観測でも検収可)。
- 落ちる実証は「存在しない選択肢名」を status-names に注入し、safety-blocked 化+診断内容の赤→検出を確認(injection-surface-verify: テストが読む面 = policy への入力)。

## エラー分類の写像(U1 で実測確定する面)

GraphQL body `errors` → MirrorFailureClass の写像表(FR-7d)は、実 gh 応答の実測で確定して business-rules の BR-U1-7 に固定する(external-seam-vocab-measurement — 未実測段階で確約を書かない)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-27T07:28:27Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の4是正(pending 台帳の U2 先取り除去=synced のみへ縮約 / domain-entities の consumes 実参照化 / G8 引用訂正 / bolt-plan 引用差替)が verbatim 実在・有効で新規矛盾なし

### Findings

- None

## 実装時裁定(E-U1CG 2026-07-27T11:50:05Z — builder 停止報告の一次証拠裁定・申告付き設計是正)

- builder が実装前停止で検出したギャップ(addProjectItem の projectId / issueNodeId の供給元不在)を、read-only GraphQL 実測で裁定: (a) `listProjectItems` の戻りを `{ issueNodeId, items }` へ拡張(repository→issue 単一クエリが issue node id と projectItems を同時返却 — 実測確認、追加呼び出しゼロ) (b) `MirrorProjectStatusField` へ `projectId` を追加し手順3/4 を入替(Status/Project 解決 → 追加)。NFR-3 予算(照会1+mutation≤2)を満たす一意解のため執行採用(B 案 = 予算超過、C 案 = projectId 未解決)。
- owner 種別は **organization 固定**(実測: `organization(login:"amadeus-dlc")` で Project #5 = PVT_kwDOEcw2nM4BeiIO 解決成功)。user フォールバックは追加照会で NFR-3 超過のため不採用 — user-owned Project 対応が必要になった場合は将来 intent の設定拡張で扱う。
