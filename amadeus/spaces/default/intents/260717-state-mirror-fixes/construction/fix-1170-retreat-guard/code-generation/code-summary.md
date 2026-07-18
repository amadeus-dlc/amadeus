# Code Summary — fix-1170-retreat-guard

上流入力(consumes 全数): business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、requirements.md、unit-of-work.md

## 変更概要(worktree コミット 108ac29c4 + d84244049)

| 面 | ファイル | 内容 |
|---|---|---|
| 正本 | packages/framework/core/tools/amadeus-utility.ts(+48) | handleSetStatus export 化+withAuditLock ラップ+ロック内再 read→parseCheckboxes 判定(completed/awaiting-approval → stderr advisory+no-op+exit 0、それ以外は既存書込不変)。.find は plain loop 化(complexity ordinal 回避) |
| 配布 | dist 6ツリー+self-install(各+48) | 再生成のみ(手編集なし) |
| テスト新設 | tests/integration/t233-set-status-retreat-guard.integration.test.ts(+303) | BR-1(byte-identical×2)/BR-2(stderr advisory+exit 0)/BR-4(pending/in-progress/revising 成功)/BR-8(skipped+行なし通過)/BR-6(audit 非追記)/BR-3(並列 spawn で巻き戻りなし)= 11 pass |
| テスト契約更新 | t147/t149/t209+payloads.json ×2(E-SMF-CG1 A 方式、宣言付き) | dispatch 対象を非 completed 前進 stage(user-stories)へ retarget — seam 意図(adapter state-sync 貫通)保存、共有 fixture 不変 |
| レジストリ | tests/unit/gen-coverage-registry.test.ts(+1) | none→cli ラチェット |

## 設計準拠と裁定

- FR-1a〜1e / BR-1〜8 / ADR-1/2/4/5 に逸脱なし(builder 宣言+検証実測)
- ロックドメイン実測: sync-statusline は --intent なし → workspace sentinel = engine 完了 writer(handleAdvance :1363 等)と同一ドメイン — LOCK==WRITE 成立
- E-SMF-CG1 裁定(2/3、e3 後着記録)による既存テスト契約更新は宣言付きコミット d84244049 に分離
- 閉包実測(ruling-premise-closure): retarget した assertion ケースは **6**(t147×2 / t149×1 / t209×3 — reviewer が user-stories grep で機械再計算、当初報告の「4」「4+1」は誤記)— すべて green、抑止面は t233 の落ちる実証で独立実証

## 残タスク(conductor)

Bolt ブランチ切り出し+PR 発行(bolt-pr-taskization)、deslop、push 前 lcov 再確認、レビュアー2名指名。

## 上流整合

requirements.md の FR-1a〜1e を BR 経由で全数実装(business-rules.md の写像表参照)。unit-of-work.md U1 の完了条件(typecheck/lint/dist:check/promote:self:check/tests green、lcov 未カバー 0)をすべて実測充足。

## Review

**Verdict**: READY(architecture-reviewer subagent、iteration 1、Minor 1 = 件数誤記 → 本ファイルで是正済み)。独立実測: 全10配布コピーの byte 一致・falling-proof 独立再実証(述語恒偽化→5 fail→revert→11 pass)・E-SMF-CG1 A 方式準拠(共有 fixture 不変・単一参照 payload キーのみ)・無申告逸脱なし・検証劇場なし(conductor 転記 — delegated-review-analysis-with-owned-verdict)。
