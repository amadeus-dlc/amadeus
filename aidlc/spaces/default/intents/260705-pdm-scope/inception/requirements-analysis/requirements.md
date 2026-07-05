# Requirements — PdM 用 scope の追加（260705-pdm-scope）

対象 Issue: [#429](https://github.com/amadeus-dlc/amadeus/issues/429)

## 意図分析

PdM の Intent（企画、調査、要求定義で完結する活動）は既存の Ideation / Inception ステージの produces（実質 PRD 一式）で表現できるが、Construction を終点に持たない scope が無い。
Issue の確定判断に従い、新ステージ（Artifact Generation 等）は作らず、Construction 以降を SKIP する scope の追加だけで実現する。

## 機能要求

- R001: scope `pdm` を追加する（questions Q1 = A）。定義は既存 scope と同形の `.agents/amadeus/scopes/amadeus-pdm.md`（frontmatter: name / depth: Standard / keywords: pdm, prd, product-discovery / description + 本文の Why / Membership 節）。
- R002: EXECUTE 集合は計 12 ステージとする（questions Q2 = A）: Initialization 3、Ideation の intent-capture / market-research / feasibility / scope-definition / rough-mockups / approval-handoff、Inception の requirements-analysis / user-stories / refined-mockups。他はすべて SKIP（Construction / Operation 全 SKIP を含む）。membership は各 stage frontmatter の `scopes:` リストへ `pdm` を追記して表現する。
- R003: `bun .agents/amadeus/tools/amadeus-graph.ts compile` で scope-grid.json を再生成し、`bun .agents/amadeus/tools/amadeus-utility.ts scope-table` で SKILL.md の scope 表を再生成する（定型手順。手編集しない）。
- R004: skills/ 側の正準ソース（scope 表を含む skills/amadeus/SKILL.md）を同期し、`promote-skill.ts --replace` で昇格する。
- R005: validator（`lifecycle-v2.ts`）の scope 語彙（`scopeValues`）と、pdm の EXECUTE 9 post-init ステージの `scopes` 配列へ `pdm` を追加する（調査の結果、validator のステージ scope はハードコード配列であり grid から自動追従しない。reviewer Major 指摘で仮説を訂正し、スコープ外から要求へ昇格）。skill 変更のため粒度制約に従い別 PR とする。
- R006: `docs/amadeus/lifecycle/scopes.md` を更新する（「9 scope をそのまま採用」の文言を「+ Amadeus 独自の pdm で計 10」へ、表に pdm 行を追加、上流パリティ例外である旨を明記。reviewer Major 指摘）。

## 非機能要求

- N1: eval は隔離 workspace で実 CLI を駆動する。`intent-birth --scope pdm` が成功し、state の Construction / Operation 全ステージが `[S]`、Ideation の EXECUTE 12 ステージ構成であることを検証する。RED 先行（pdm 追加前は Unknown scope で拒否されることを確認する）。
- N2: 既存検証の退行なし（`npm run test:all` 全件。scope-table --check / contracts:check を含む）。
- N3: `npm run parity:check` が pass する（Issue AC）。新規 scope ファイルと stage frontmatter の `pdm` タグが上流に無い適応となる場合は、parity-map の例外へ根拠付きで宣言する（上流ドリフト追跡 #428 から追える形）。

## 受け入れ条件（Issue AC と対応）

| AC | 内容 | 担保する要求 |
|---|---|---|
| 1 | scope 追加の判断（追加する）と、名前 / EXECUTE・SKIP 全割り当て / depth / testStrategy 相当 / keyword の定義が記録されている | R001 / R002 / Q3 |
| 2 | scope-grid.json、scopes/、SKILL.md scope 表、skills 同期の影響範囲が本 record で分解されている | R003 / R004 |
| 3 | parity:check が pass する | N3 |
| 4 | pdm scope の workflow が実 CLI で成立する（birth → Construction 全 [S]） | N1 |
| 5 | 既存検証に退行がない | N2 |
| 6 | pdm の completed ステージが validator の検査対象になる（produces 欠落を fail 検出できる） | R005 |

## スコープ外

新ステージの追加（Issue の確定判断）、既存 scope の変更、example snapshot の追加、amadeus-outcomes-pack の流用案内（Q4）、横断共有 product-design 情報の置き場設計（Q5。必要になったら #300 系の別 Issue）。
