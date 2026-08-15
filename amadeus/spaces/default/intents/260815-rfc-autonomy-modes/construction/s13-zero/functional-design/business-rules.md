# Business Rules — unit s13-zero

- R-1(FR-11・ADR-6): 0 件確定の唯一の根拠は `amadeus-learnings surface` の出力に束縛された digest とする。conductor の自己申告(「候補はありませんでした」という散文のみの主張)を 0 件確定の根拠にしてはならない。
- R-2(ADR-6): `confirmZeroCandidates` は `candidates.length === 0` かつ surface 実行結果由来の digest が一致する場合にのみ `ZeroReceipt` を発行する。
- R-3(ADR-6): `addConductorCandidate` は候補集合を増やす方向のみ操作可能 — 既存候補の削除・書き換えを提供しない。
- R-4(ADR-6): 追加候補は disk 上の記録(`diskEvidencePath`)から再導出可能であることを要件とし、パス不在・内容不一致は拒否する(fail-closed)。
- R-5(ADR-6): 0 件確定・追加候補集合はいずれも監査へ記録すること(surface digest 自体、および追加候補があった場合はその集合)。
- R-6(Q3): 選定裁定(構造化質問の提示・ソロ自動選挙フック)は `ZeroReceipt` が発行された回のみスキップする。1 件以上の候補(conductor 追加を含む)が残る限り既存フロー(stage-protocol.md §13 手順3)は無改変で走る。

## 落ちる実証(Red の期待)

- 現行: `SurfaceOutput`(`amadeus-learnings.ts:114-121`)に digest 相当のフィールドが存在せず、`candidates.length === 0` の JSON をそのまま渡しても機械的な 0 件確定手段が存在しない(呼び出せる API がない)ことを実測する。
- 導入後: `confirmZeroCandidates` が (a) candidates 空 + 正しい digest → `ZeroReceipt` を発行、(b) candidates 空 + 誤った digest(改変された surface 出力を模擬)→ 拒否、(c) candidates 非空 → `NotZero` を返すことを3ケースで pin する。
- `addConductorCandidate` の Red: 存在しない diskEvidencePath を渡した追加が現状のヘルパー不在により検証すらできないことを示した上で、導入後は同じ入力が `EvidenceRefusal` で拒否されることを pin する。
