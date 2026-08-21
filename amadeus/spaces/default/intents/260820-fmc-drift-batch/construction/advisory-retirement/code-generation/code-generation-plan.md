# Code Generation Plan — advisory-retirement(U3 / #3187)

上流入力: `construction/advisory-retirement/functional-design/business-logic-model.md`(撤去手順 1〜8 — 本 plan の正本)/ `business-rules.md`(BR-1〜7)/ `domain-entities.md` / `nfr-design/security-design.md` / `inception/units-generation/unit-of-work.md` U3 / `inception/requirements-analysis/requirements.md` FR-RET-1〜4。

## 実行形態

swarm batch 1(engine の invoke-swarm、autonomy full)で `amadeus-builder-agent` へ委譲。worktree `bolt-advisory-retirement`(base origin/main d21c86acc)。dispatch prompt は FD の撤去手順 1〜8 を逐次実行指示として運び、write scope・受け入れ基準・検証手順・source-only commit 規律を明記した。

## 実行した計画(FD 手順の写像)

1. baseline(BR-7): t528/t524 の削除前 green を実測してから削除
2. 宣言面: plugin.json advisories[] の authoring-hold 除去(spec-change 残存)
3. コード面: tla-authoring.ts の advisory 経路・subjects 書き手・型・failure kind・dispatch・USAGE の完全削除(互換レイヤーゼロ)
4. stage 契約: `subjects declare` 呼出の削除(存続契約 `applicability receipt --persist true` は保持 — 逸脱 D1、選挙 E-260820-FMC-CG-U3DEV で追認)
5. docs 2面 + RFC :249 の退役注記(pointer-update 裁定)
6. テスト処分: t528/t524 削除、t481/t527 部分更新(t527 は存続 verb への再配線 — 逸脱 D2、同選挙で追認)、期待値更新 7 本、t450 pin 追随、負テスト 1 本(未知 verb 拒否)
7. 生成台帳: coverage-registry regen 同梱
8. census: 9 キー × 対象集合 × 帰属除外(D3 の実測 fixture は同選挙裁定で除外リストへ追補済み)+ 対照リテラル、`bun run build` 後の投影面でも 0

## 配送

Bolt 1 PR(#3362)として record checkpoint 同梱で発行し、CI 収束(t146 系なし・Coverage base cancel の rerun 1 回・Review Thread 1 件の根拠付き却下)後、常任承認条件(必須 CI green ∧ converged:true 実測)で merge queue 経由スカッシュマージ。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T23:49:39Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の全指摘を追補で閉包確認: write scope 追補は裁定・上流 FOLLOW-UP 両参照と所有権非交差込みで正当、件数照合は算術一致(2+2+8+1=13、合計20、11=13−2)、残存3キーは FD 除外クラス (a)/(c)/(d) へ全写像。CLI mint の report は非編集・整合。残余は表記 NIT 2件のみ。

### Findings

- NIT | authoring-hold の残存2件の (c)+(d) 合算帰属にクラス別内訳(1+1)がない — 表記のみ
- NIT | plan の『期待値更新7+負テスト1』と summary の『期待値更新8』はラベリング差(BR-7 の相乗り許容どおり、合計一致)
