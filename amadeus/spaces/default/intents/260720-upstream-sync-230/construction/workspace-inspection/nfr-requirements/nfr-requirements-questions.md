# NFR Requirements Questions — workspace-inspection

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U06 `workspace-inspection`。E-USSU06FD1=Aを含むdepth-1 nested root、submodule観測、classified/inconclusive projector契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T23:28:13Z`。

## 質問不要の根拠

- Performance/scalability: root signal発火時はfallback未実行、無信号時だけdepth-1をcanonical sortで走査し、depth>1探索・consumer別再走査・network I/Oを追加しない。
- Security: `.gitmodules` pathはsafe relativeだけをprobeし、absolute/drive absolute/`..`/空pathを拒否する。submodule initやfilesystem repairは実行しない。
- Reliability: read-only単一snapshot、`classified | inconclusive`判別union、birth/stateの全mutation前reject、detect/doctor/auditのpure projection、classified既定bytes不変が裁定済みである。
- Observability: path/reason/remedy付きadvisory、未初期化submoduleのsorted先頭5件+`(+N more)`、doctor advisoryを既存面へ投影し、新eventや保持期間を追加しない。
- Technology: Bun/TypeScript、既存workspace detector/formatter/generator/test stackを維持し、新dependency、service、database、network、UIを追加しない。

新しい探索depth、候補自動選択、language threshold、submodule mutation、inconclusive分類、failure policy、public APIを選ぶ余地はない。新たな読取失敗分類・安全path・projector判断が必要なら停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T23:28:13Z`）。承認範囲はBR-U06-01〜24、E-USSU06FD1、FR-3/C3/ADR-6、Requirements NFR-1〜8、technology-stackの機械導出に限定する。root signal時fallbackなし、無信号時depth-1限定、canonical sort、単一nestedRoot/複数候補非自動選択、安全relative submodule path、観測のみでmutationなし、未初期化表示先頭5件+残数、classified/inconclusive、birth/state mutation前reject、同一snapshot projection、classified既定bytes不変、Bun/TypeScript/既存stackを維持する。新探索depth、候補選択、language threshold、submodule init/repair、failure policy、public API、dependency、service、database、network、UI、保持期間、SLOは追加しない。新たな読取失敗分類・safe path・projector/failure判断が必要なら停止し再付議する。
