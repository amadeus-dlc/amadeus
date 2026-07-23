# Code Generation Plan — gh-optional-runtime-norm

## Scope

U1はapplication codeを所有せず、FR-23と承認済みFunctional/NFR Designに従い、project normの既存CIDを同位置・同CIDで置換する。独立norm変更の検証証跡だけを生成し、U2/U4/U6のruntime実装を先取りしない。

## Plan

- [x] **Step 1 — Existing norm baseline**: `amadeus/spaces/default/memory/project.md`のCID `practices-discovery:gh-scripts-boundary`が一件であることを確認する。Trace: FR-23 / BR-U1-08。
- [x] **Step 2 — Canonical norm replacement**: 既存bulletを承認済みcanonical clauseへ置換し、CIDを維持する。Trace: FR-23 / BR-U1-01〜10。
- [x] **Step 3 — Mechanical norm tests**: CID count、legacy clause absence、正規化全文一致、application source diff 0を検査するtest/checkを追加または既存testへ統合する。Trace: AR-U1-01〜05。
- [x] **Step 4 — Security verification**: credential委譲、secret非保持、argument array、mirror限定scope、人間承認の必須文言を検証する。Trace: NFR-05/06。
- [x] **Step 5 — Test configuration**: 既存`bun:test`/repository test runnerを再利用し、新規test framework設定を追加しないことを確認する。Trace: NFR-07。
- [x] **Step 6 — Focused validation**: 対象test、`git diff --check`、必要なlint/typecheckを実行し結果を記録する。Trace: FR-23 / U1 acceptance。
- [x] **Step 7 — Summary and evidence**: 変更file、test結果、review/approval/merge待ち状態を`code-summary.md`へ記録する。Trace: NormChange lifecycle。

## Non-goals

runtime `gh` gateway、status、Coordinator、phase routing、distribution、application sourceの変更は行わない。
