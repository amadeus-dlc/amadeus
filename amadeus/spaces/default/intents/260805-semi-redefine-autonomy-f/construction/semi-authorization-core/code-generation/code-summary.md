# Code Summary — `semi-authorization-core`(#2253、swarm batch 1 事後作成)

上流入力(consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, security-design.md, logical-components.md

## 着地

- ブランチ: `bolt-semi-authorization-core`(ff 採用、最終 HEAD `fffc8d5d8edd141d53cd2fa0e93d5feb8c62a288`)。conductor ブランチへ --no-ff 回収マージ済み(`7bf599939`、ls-files -u 0)。
- コミット: `27ba9415b` feat(autonomy): replace the semi mode gate with a semi authorization basis / `43b01211d`・`5e7e0e35a`・`fffc8d5d8`(test 3 コミット — ピン分割・呼び出し面同期・waiver 削除)。

## 変更ファイル

`amadeus-intent-autonomy.ts` / `-runtime.ts` / `-production.ts`(3 層置換 — FR-AUTH-1〜3 / FR-LAD-1〜6)。`-replay.ts` は**無改変**(既存 `assertLegalAutonomyProjection` 経由で新不変条件が効く — t452 実証)。新規 t451/t452/t453、同期 t431/t432、`.coverage-patch-allowlist.json`(shrink-only 1 件削除)、`.coverage-registry.json`(再生成)。

## 検証(builder 実測 + conductor 統合再実測)

builder: build 0(drift なし)/ typecheck 0 / lint 0 / t431+t451+t452+t453 0(63 pass)/ t432・t435 系 0(71 pass)/ t121 無改変 green(76 pass)/ registry --check 0 / run-tests --unit PASS(367 files/0 fail)。機械確認: throw ガード・イベント列 diff 非出現 0 hit / `resolveAutoDecision` 本体 `mode !== "full"` 0 hit(FR-AUTH-2 AC)/ `semi-mode-gate` repo 全域残渣 0。落ちる実証 5 点の記録あり。integration 一括実行の 4 fail は全て環境起因(node_modules 不在の TOOL_MISSING / 負荷起因 pi-timeout — solo green)と一次証拠付きで切り分け済み。
conductor(マージ後統合): typecheck 0 / lint OK / registry fresh / complexity 0 / unit 88 pass / integration(t453 含む)84 pass。referee check converged / finalize converged。

## 申告(canon からの機械的帰結 — レビュー要、diary 引き継ぎ)

A1: t431(13 呼び出し)/t432(1 呼び出し)の呼び出し面同期(`authority` 必須化の compile 帰結 — assert 無改変・独立コミット隔離)/ A2: full-grant payload への `authorityFingerprint` 供給(`autonomyDigest(grant)` — 現行とバイト同一)/ A3: `applySemiDecision` 第 3 引数は `SemiAuthority`(canon 内型不整合の唯一配線)/ A4: `authorizeEffect` 第 1 引数未使用(`_authority` 命名)/ A5: `commitProductionStageGateDecision` への semiScope 供給(D3 fail-closed の帰結 — t435 green で閉包)/ A6: `AUTHORITY_BOUNDARY` 削除(生成・消費 0 件の死型)。**t453 の TDD Red 先行なし**(落ちる実証 #5 で非空虚性を代替実証 — レビュー判断へ委任)。
