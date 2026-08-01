# Code Generation Plan — fix-1863-1864-drift(Bolt 4)

上流入力(consumes 全数): requirements.md

- 本 unit の実装対象は `requirements.md` の FR-7(#1863 lossy drop→compose の是正+CI へ repo 断面 compile --check)と FR-8(#1864 allowlist :1838 転位エントリの削除のみ)。共通契約 CR-1〜CR-6 と AC-7a〜7c / AC-8a〜8b を検収基準とする。functional-design 系 consumes は degrade スコープにより不在。

## 方針

1. **FR-7 欠陥1 = 「セルを保存する」方式を採用**(要件が design 確定とした二択の選定)。決め手は実測: `amadeus-plugin.ts` の `spawnRecompile` が compile を `stdio: "ignore"` で起動するため、「loud 警告+復旧手順」方式は破壊が起きる当の瞬間に構造的に不可視で、要件「復旧不能な無音破壊を残さない」を満たせない。保存の安全根拠: grid の `.stages` の全消費点(9箇所、file:line で棚卸し)がグラフ由来 slug で index するため dangling セルは実行時 inert。#1630 の clobber 修正は `applyPluginScopeOptIns` 側であり `knownSlugs` GC は副次的整頓 — 撤去しても clobber は再発しない(clobber 側テスト5件無改訂で確認)。
2. **FR-7 欠陥2**: 既存 `drift-check` ジョブへ `bun .claude/tools/amadeus-graph.ts compile --check` を1ステップ追加(ci-success の needs 不変 → t222 pin 改訂不要)。
3. **FR-8**: allowlist の `:1838` エントリ削除のみ(双子 `:1861` の実在を直読確認のうえ再ピンしない)。
4. **TDD**: AC-7a は t397 新設(drop→compose→compile ラウンドトリップの lossless 実証)+t355 の宣言つき改訂(GC 前提の describe を保存前提へ反転 — 仕様反転の理由をテスト冒頭コメントへ)。AC-7b は注入→赤→revert の1セット(ブランチへ注入コミットを残さない)。

## テスト計画

- t397(新設): mergeComposedScopes の verbatim 保存(純関数 in-process)+「無音が正しい」ことの pin。
- t355 unit / integration: 宣言つき改訂(GC → preserve)。clobber 側5件は無改訂。
- 落ちる実証: 派生セル注入と stage-graph フィールド削除(#1758 同クラス)の2種で exit 1、revert 後 exit 0。

## リスクと対処

- 当初 plan の stderr advisory は、出荷 grid が opt-in セルを設計どおり保持する正常状態で恒久ノイズになると判明した場合は撤去する(要件は「保存する」単独を許容 — 逸脱ではなく plan 内自己是正として記録)。
- 自分の行シフトに対する allowlist 機械 remap(c1-allowlist-mechanical-remap)。既知転位(#1622 射程)には踏み込まない。
- core(amadeus-graph.ts)変更のため dist 7面+self-install 再生成。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T03:52:13Z
- **Iteration:** 1
- **Scope decision:** none

FR-7 保存方式の裁量内選定と実測根拠、advisory 撤去の自己是正の整合、FR-8 削除+remap 正当性、t355 宣言改訂、シムなしを diff 実読で確認。指摘 0 件。

### Findings

- None
