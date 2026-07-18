# Unit of Work — 260717-state-mirror-fixes

上流入力(consumes 全数): components.md、component-methods.md、services.md、component-dependency.md、decisions.md、requirements.md

## Unit 分割

component-dependency.md の非交差判定(#1170=core+dist 面 / #1172=scripts 面、ファイル単位で完全非交差)に従い、Issue 単位の 2 unit に分割する。各 unit が独立の Bolt=PR となる(Bolt 単位 PR 規範)。

## U1: fix-1170-retreat-guard

- **対象**: Issue #1170 — set-status の後退書き込み抑止
- **実装面**(components.md C1/C2、decisions.md ADR-1/2/4/5): `packages/framework/core/tools/amadeus-utility.ts` の handleSetStatus を export+withAuditLock ラップ+ロック内 parseCheckboxes 判定(completed/awaiting-approval → no-op+stderr advisory+exit 0)。dist 6ツリー+self-install 再生成(NFR-2)
- **テスト**(FR-4a/4c): in-process unit(export した handleSetStatus で後退抑止・前進非抑止の両側)+ integration(t145 様式の set-status ∥ advance 並列 spawn)+ 落ちる実証(実行時消費行への注入)
- **概算規模**: 実装 30-40行+テスト 160-190行(components.md 合算 180-230 から U2 分 20-40 を控除した機械再計算: 180−20=160 〜 230−40=190)
- **完了条件**: FR-1a〜1e 充足、typecheck/lint/dist:check/promote:self:check/tests green、push 前ローカル lcov 未カバー 0

## U2: fix-1172-skip-denominator

- **対象**: Issue #1172 — countStageProgress の SKIP 分母除外
- **実装面**(components.md C3、component-methods.md C3): `scripts/amadeus-mirror.ts` へ `— SKIP` サフィックス行の分母除外を追加(既存 `[S]` 除外は維持)
- **テスト**(FR-2b/2c、FR-4b): t232 の捏造 `[S]`+`— SKIP` fixture を実様式へ是正+「`[S]`+`— EXECUTE`」「`[ ]`+`— SKIP`」両様式 fixture+18/18 assert
- **概算規模**: 実装 3-5行+テスト 20-40行(components.md の unit 層 80-100 のうち C3 相当分の再配分 — 独自見積り)
- **完了条件**: FR-2a〜2c 充足、typecheck/lint/tests green(配布面なし)

## Unit 外の conductor 執行(コード作業ではない)

- **C4: state 修復**(FR-3、ADR-3): mirror-issue-tool record の復元は record チェックポイントコミットとして conductor が執行(実装 PR 非同梱 — E-SMF-AD Q2=A)。U2 の live 検証(A-3 の 18/18 実測)はこの修復後に行う順序制約(検証面のみの依存 — 実装の依存ではない)
