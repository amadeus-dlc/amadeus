# Business Logic Model — U3 host-projection-all

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U3 行(C3 完全版)。story-map ジャーニー 2「変更を出荷する」と ジャーニー 3「配る」の実体。services.md どおりビルド時単発実行。

requirements FR-2 の合否 3 点との対応: 合否 1(期待位置生成+トークン置換)→ フロー 1、合否 2(0-plugin byte-identical+--check)→ フロー 1 末尾+フロー 2、合否 3(outDir 拒否集合)→ フロー 1 の安全検査。components.md C3 の責務行の完全版実装。

## フロー 1: 全面投影(package.ts 編入)

```
bun scripts/package.ts
  → discoverPluginSources(中立正本)
  → U1 マトリクスの確定面リスト(BR-U1-7 の機械可読列挙)から HarnessProjectionSpec[] を構成
  → 各面: outDir 安全検査(OutDirRefusal — plan 段で mutation 前拒否)
        → projectPluginForHarness(plugin, harness, dist/plugins/<name>/<harness>/)
        → トークン置換(既存 harness-transform 再利用)
  → 0-plugin 時は全セクション no-op(ProjectionResult{noop-zero-plugin})
```

U2 で新設済みの claude projector は変更せず、残面の layout 分岐を追加する(クラス別 3 分岐 — component-methods.md C3)。

## フロー 2: --check 編入(drift 検出)

```
bun scripts/package.ts --check(既存 dist:check 経路)
  → checkPluginProjections(): DriftEntry[]
      stale: 正本 hash と投影 hash の不一致
      orphan: dist/plugins/ 配下に対応正本なし
  → 1 件でもあれば既存 --check の失敗集約へ合流(exit 非 0)
```

## フロー 3: marketplace metadata(native-manifest 面のみ)

U1 マトリクスで native-manifest と確定した面に限り、ホスト規定の metadata(claude: marketplace 用 plugin.json 拡張フィールド等 — U1 の実測が形式の正)を投影へ同梱する。未実測形式への ✅ 確約はしない(U1 の deferred セルは投影対象から除外し degrade 契約へ)。

## エラー処理

- OutDirRefusal は生 stack を出さず 1 行 usage エラー(上流 #29/#31 の「no ENOTDIR/EEXIST stack」相当)
- 投影中の I/O 失敗は面単位で fail-loud(部分成功の無音継続禁止 — 失敗面を列挙して exit 非 0)

## 実行順(Bolt 内リスク制御)

拒否集合(フロー 1 の安全検査)を投影本体より先に実装・テストし、正当な既存データで赤くならないことも両側実測する(corpus-sweep-for-new-guards)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T16:12:07Z
- **Iteration:** 1
- **Scope decision:** none

FR-2 全基準を網羅、マトリクス駆動・claude projector 不変・write⇔check 対称・未実測面非確約・literal 逐語一致を確認。Minor 1(business-logic-model の requirements/components 実参照欠落)は指摘直後に FR-2 対応注記の追記で是正済み。

### Findings

- [Minor] business-logic-model.md の上流入力ヘッダーが装飾トークン気味 — FR-2 対応注記+components.md C3 参照の追記で是正
