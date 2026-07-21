# NFR Design Questions — plugin-projection

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順7/12 / 正本Unit U09 `plugin-projection`。承認済みNFRと正準4 public seamを、既存packager/promoter、6 package/4 self-install、決定的projection・drift境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU13ND1 recorded裁定 `2026-07-21T03:15:09Z`。

## 質問不要案の根拠

- Public seam: `discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`の正準4関数であり、self-installはC5内部helperへ閉じる。
- Security: C1検証済みsourceだけを使い、malformed、duplicate、unsafe path、output collisionは全write前にloud failureとする。
- Projection: repository rootの`plugins/<name>/`を正本とし、6 package面を同一snapshotからtemp生成後にcommitする。generated treeはsourceへ戻さない。
- Compatibility: plugin 0件では既存6 harnessのfile set、content、order、CLI resultをbyte-identicalに保ち、空index、directory、keyを追加しない。
- Distribution: packageはclaude/codex/cursor/kiro/kiro-ide/opencodeの6面、self-installはclaude/codex/cursor/opencodeのclosed 4面である。
- Drift: `MISSING`、`DIFFERS`、`ORPHAN`、`UNREFERENCED`を全件canonical sortし、check modeはwrite 0とする。

新public API、第二schema/parser、harness、self-install対象、partial commit、retry/cache/parallelism policy、network、dependency、service、SLO、thresholdを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約からの機械導出。E-USSU13ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票、留保なしで裁定した（開票 `2026-07-21T03:15:09Z`）。承認範囲は正準4 public seam、C1 validation-before-write、6 package/4 self-install、temp全生成後commit、plugin 0件byte互換、`MISSING`・`DIFFERS`・`ORPHAN`・`UNREFERENCED`のclosed drift分類を既決契約から機械導出する範囲に限定する。新API、schema、parser、harness、policy、dependency、service、SLOは追加しない。
