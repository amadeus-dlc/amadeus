# Functional Design Questions — plugin-projection

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1承認: 質問0件で進行可。承認TS=`2026-07-20T14:03:05Z`。

## 既決事項

U09のfunctional designは、以下の承認済み契約から機械導出でき、新しいdesign judgmentを必要としない。

- C5の公開seamは`discoverPluginSources`、`buildPluginProjection`、`buildHarnessTree`、`checkHarnessTree`である。
- `plugins/<name>/`をauthoring正本とし、6 harnessと`dist/plugins/`へgenerator経由で投影する。
- package対象はmanifest discoveryされる6面、self-install対象は既存closed listのclaude/codex/cursor/opencode 4面である。
- discovery順、projection path、manifest serializationはcanonical sortで決定的にする。
- plugin 0件では既存buildおよび6 harness出力をbyte-identicalに保つ。
- byte、orphan、unreferenced driftを検出し、`dist/`の手編集を正本として受理しない。
- U09はprojection ownerであり、compose/doctor/dropはU10、reference `test-pro`とguideはU11、全体ledger closureはU12へ残す。

[Answer]: 質問0件。leaderのE-OC1承認（`2026-07-20T14:03:05Z`）により、上記既決事項から機械導出できる範囲で成果物化する。新規design judgment、既決事項間の矛盾、未決ownership/error policyを検出した場合は単独決定せず停止し、E-OC1再確認または選挙へ付議する。

## E-OC1再裁定

Iteration 1で、`unit-of-work.md`が明示する4つのpublic seamと、`component-methods.md`が同じC5節に置く`buildSelfInstallProjection`の関係、および成果物が公開関数へ導入した未承認型の差が検出された。

[Answer]: A。leaderのE-OC1再裁定（`2026-07-20T14:09:08Z`）により、public seamは`unit-of-work.md`の4関数を正本とし、`buildSelfInstallProjection`はC5内部helperとして扱う。全公開関数の引数・返却型は`component-methods.md`の正準シグネチャへ完全復帰し、`ValidPluginSource`等の未承認具体化を撤回する。これは責務別の正本整合であり、新規design judgmentではないため追加選挙は行わない。

## Ambiguity analysis

- 曖昧回答: なし。
- 回答間の矛盾: なし。
- 成果物生成に必要な欠落情報: なし。
- 承認範囲外の判断: 成果物へ追加しない。
