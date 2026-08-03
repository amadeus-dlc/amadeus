# Frontend Components — u1-asset-build

上流入力(consumes 全数): requirements(Out of Scope — UI 変更なし)、components(C1 = CLI/CI コンポーネントのみ)、component-methods / services / unit-of-work / unit-of-work-story-map(UI 要素の不存在確認)。

## 該当なし(N/A)の宣言と根拠

u1-asset-build は release CI のジョブと packaging スクリプト(`scripts/release-dist.ts`)のみで構成され、フロントエンド/UI コンポーネントを一切持たない。requirements の Out of Scope(ランタイム・ハーネス出力の変更なし)とも整合。本書は engine の produces 全件実在要件(project.md cid:nfr-design:c1-engine-produces-all-five の同型 — kind ゲートで省略せず根拠付き薄書を置く)を満たすための N/A 宣言である。

## 出力契約(UI 相当物)

UI は存在しないが、人間が読む出力面は次の2点(ui-less-mockups-as-output-contract の趣旨で文言を固定):

- self-check 失敗: `release-dist: self-check FAILED — <mismatch detail>`(exit 1)
- 再現性検査失敗: `release-dist: reproducibility FAILED — <差分ファイル数> file(s) differ`(exit 1)
