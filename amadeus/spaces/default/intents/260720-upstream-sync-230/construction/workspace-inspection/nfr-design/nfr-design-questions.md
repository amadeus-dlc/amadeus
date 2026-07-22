# NFR Design Questions — workspace-inspection

> 上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。
>
> 対象: engine順U12 / 正本Unit U06 `workspace-inspection`。承認済みNFRと正準3 public seamを既存workspace detector、birth/detect/doctor/audit projector、package/test境界へ機械配置する。
>
> E-OC1 判定: **質問0問**。E-USSU12ND1 recorded裁定 `2026-07-21T02:59:18Z`。

## 質問不要の根拠

- Scan: root一回、root signal/submoduleでfallback停止、root無信号時だけdepth-1 canonical候補、depth>1なしが既決である。
- Security: safe relative submodule path、symlink/hidden/excluded/non-dir除外、read-only、unsafe/unreadable/parse0はinconclusiveで全mutation前rejectする。
- Projection: `classified | inconclusive` unionの単一snapshotをbirth/detect/doctor/audit4面へpure projectionし、無観測classified bytesを保持する。
- Capacity: depth1、表示5、consumer4、package6/self-install4のclosed contractである。
- Components: inspector、depth-one detector、submodule parser、result classifier、4 projectors、package/test境界へ閉じる。

新public API、scan depth/limit、failure policy、candidate auto-select、submodule mutation、language threshold、consumer/projector、dependency、service、SLOを選ぶ余地はない。新判断は確定前にleaderへ再付議する。

## [Answer]

[Answer]: 質問0問で可 — 既決契約からの機械導出。E-USSU12ND1はchoice 1を3票、choice 2/3を0票、GoA 1を3票、留保なしで裁定した（開票 `2026-07-21T02:59:18Z`）。承認範囲は正準3 seam、root一回・signal時fallback停止、root無信号時のみdepth-1 canonical scan、safe submodule、classified/inconclusive fail-closed、birth/detect/doctor/audit同一snapshot、無観測bytes互換を既決契約から機械導出する範囲に限定する。新public API、新depth/limit/failure policy、auto-select、submodule mutation、threshold、consumer、dependency、service、SLOは追加しない。
