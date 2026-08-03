# Requirements Analysis 質問票 — 260802-source-only-dist

上流入力(consumes 全数): intent-statement(裁定 G1〜G13 — 既決判定の根拠)、scope-document(In/Out 境界 — 質問空間の絞り込み)、business-overview(業務影響が導入経路の一点に限られる判断)、architecture(配布境界の患部機序 — Q1 の背景)、code-structure(B10 の面間乖離実測 — Q1 の直接出典)。team-practices は optional consume 不存在(memory 層を直接参照)。

> E-OC1 判定: 6次元の完全性分析のうち、機能・NFR・ビジネス文脈・技術文脈は Issue #2043(凍結済み)+ grilling 裁定 G1〜G13 + RE 実測(codekb 現在節、observed `63e69d922`)で充足。RE の新事実から**真に未決の要件判断1件**のみを質問化(cid:intent-capture:c1 の絞り込み)。設計細部(manifest 形式・ALLOWED_HOSTS 具体値・release.yml ジョブ構成・ノルム PR 文面)は後続設計ステージの管轄として Open Questions へ送る。

## 質問

### Q1. installer-distribution scope の面間乖離の扱い(ステップ0 正本昇格の対象範囲)

RE 実測: `amadeus-installer-distribution.md` は6面中 `.claude` / `.kimi-code` の2面のみに存在(面間乖離が現存)。昇格後は正本1箇所から機械投影されるため、扱いの確定が必要。

- A. 昇格時に全 dogfood 面へ揃える(乖離解消)(推奨)
- B. 2面のまま昇格(面別例外を投影器に実装)
- C. installer-distribution scope を廃止
- X. Other

[Answer]: A — 全面へ揃える。正本1箇所からの対称投影とし、面別例外機構は新設しない。self-scope-consistency センサーの5ハーネス間パリティ期待と整合し、scope-grid の root 15キーを全面で同一にする。

## 裁定の記録

- Q1 ユーザー承認: 2026-08-02T17:45:00Z(AskUserQuestion「全面へ揃える」を選択)
- 既決事項の出典: Issue #2043(凍結済み・裁定 G1〜G13)、intent-statement.md 裁定表、scope-document.md、codekb 現在節(observed `63e69d922`)
