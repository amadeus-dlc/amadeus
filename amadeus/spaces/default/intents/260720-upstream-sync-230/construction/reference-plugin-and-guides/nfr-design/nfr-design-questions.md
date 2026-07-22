# NFR Design Questions — reference-plugin-and-guides

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順11/12 / 正本Unit U11 `reference-plugin-and-guides`。承認済みNFRを、既存U01/U09/U10 contractのreference fixture・E2E・guide境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU17ND1 recorded裁定 `2026-07-21T03:58:30Z`。

## 質問不要案の根拠

- Source: canonical `plugins/test-pro/`一件だけをauthoring正本とし、既決schema/seam/fragmentを実証する必要最小artifactに限定する。
- Lifecycle: authoring→U01 validation→U09 6面projection→U10 temp compose→compile/sensor→doctor→record-owned drop→再検証を一つのE2Eで閉じる。
- Matrix: packageはclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-installはclaude/codex/cursor/opencodeのclosed 4面を別々に全数検証する。
- Integrity: 宣言成果物だけを生成・検出・除去し、unrelated host bytesとsuccess/failure後のtracked treeを不変にする。
- Guide: Amadeus path/namespace、supported lifecycle、no-clobber、failure不変、record-owned drop、local/temp検証、6/4差を記載する。
- Deferred: marketplace、lockfile、agents/scopes/memory/knowledge、`when`評価を実装済みと表現しない。

新runtime API、第二parser/projector/plugin implementation、fixture fleet、具体slug/表示文言/pathの契約化、cleanup/failure policy、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可（推奨）— 既決契約から機械導出できる。E-USSU17ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票で裁定した（開票 `2026-07-21T03:58:30Z`）。承認範囲はtest-pro一件、単一E2E、U01/U09/U10再利用、6 packageと4 self-installの別matrix、宣言成果物限定、tracked一時物0、guide必須面とdeferred明示を既決契約から機械導出する範囲に限定する。新API、parser、projector、plugin、fixture fleet、具体値契約、cleanup policy、dependency、service、SLOは追加しない。
