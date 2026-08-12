# Security Design — U3 projection-sweep

**Intent**: 260810-grilling-frontier-resync / **Stage**: nfr-design / **Unit**: projection-sweep (packaging)

上流入力(consumes 全数): engine directive の解決済み consumes は空 — 本スコープ(self-feature)は nfr-requirements を SKIP するため、stage frontmatter 宣言の `security-requirements` / `tech-stack-decisions`(および performance/scalability/reliability-requirements・business-logic-model)は `consumes_absent`(`expected: true` = 設計上の不在)。fallback として `requirements.md`(FR-PROJ-2/3/4)と `unit-of-work.md` の U3 完了条件を設計出典として実参照する。欠落成果物の内容は発明しない。

## 脅威面の同定(packaging kind — 語彙同期と配布検証)

U3 は docs/prose の旧語彙(`one question at a time` / 対訳語彙 / hybrid 系)の置換と、配布検証コマンド列の実行のみを行う。実行体・新規配布面・新規データを持たないため、適用される脅威面は1つに限る。

1. **配布投影の完全性(supply chain)** — 正本(packages/framework/core/)と生成物(dist / self-install 面)の不整合は、旧規律の protocol が一部ハーネスへ残存する「規律の分裂」を作る。これは機能欠陥であると同時に、検査(U2 センサー)と規律(U1 protocol)の対応が崩れる完全性問題である。

## 設計(統制)

- **既存検証集合をそのまま使う**: `bun run build` 再生成 → `bun run source-only:check`(生成物の独立正本化の禁止)→ 隔離2回ビルドの再現性検査 → t199、の既存ブロッキング集合(requirements.md FR-PROJ-4)を U3 の完了条件として実行する。新規の検証機構・署名・配布経路は導入しない — 攻撃面の不拡大。
- **語彙 sweep の全数性**: 置換の完全性は `git grep -in` の 0 hit 照合(FR-PROJ-2/3 — 大小文字非区別既定・対訳キー併用は RA 段の裁定済み述語)で機械検証する。sweep は tracked ソースのみを対象とし、生成物は再生成で追従させる(dist を直接編集しない — project.md Forbidden)。

## 非適用の明示

- **認証・認可・暗号化・入力検証・CSRF/XSS・secrets 管理・audit logging(新規面として)**: 非適用 — U3 は実行体・入力受理面・データストアを持たない docs/生成物同期作業であり(unit-of-work.md「Deployment model: N/A — docs/prose の同期であり deployment 実体なし」)、対象が存在しない構造的非適用である。
- 宣言済み security requirement は存在しない(nfr-requirements SKIP)— requirements.md の FR 群が唯一の上流であり、独自の要件 id を発明しない。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T08:21:05Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2): packaging kind の実態(docs/prose 同期+配布検証実行、実行体・入力面・データストアなし)に即した脅威面同定・統制・非適用明示。H2 3節。上流ヘッダは consumes_absent(nfr-requirements SKIP)全数を正しく開示し FR-PROJ-2/3/4 + unit-of-work.md を fallback 出典として実参照。統制は既存ブロッキング検証集合(build 再生成→source-only:check→隔離2回→t199)への reuse のみで新規機構・新規配布面なし。sweep 完全性は git grep -in 0 hit の機械述語で定義され全称断定でない。id 発明なし。NIT 1件(cid:nfr-design:c1 の引用が主題непreciseness — conductor が同一ターンで unit-of-work.md の Deployment model 直接引用へ差し替え済み)。FOLLOW-UP 1件(t199 と既存検証集合の実在はスコープ外につき未検証 — build-and-test 段で確認)。

### Findings

- NIT | 非適用根拠の cid:nfr-design:c1 引用は主題が不正確(同 cid の主語は常駐サービスパターンの機械適用回避)— unit-of-work.md の Deployment model 直接引用へ差し替え — 反映済み
- FOLLOW-UP | 既存検証集合(build 再生成 / source-only:check / 隔離2回ビルド / t199)の実在・適用性はレビュースコープ外につき未検証 — build-and-test 段で確認
