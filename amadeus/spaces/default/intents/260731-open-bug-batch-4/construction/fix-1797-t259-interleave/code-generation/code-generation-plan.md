# Code Generation Plan — fix-1797-t259-interleave

上流入力(consumes 全数): requirements.md — FR-3(#1797、方式・数値は実測導出)を実装対象とし、受け入れ基準1〜3をテスト計画の導出元とした。

## 計画(実施順)

1. 実装前 RE: `t259-guard-corpus.test.ts:108-109` の比 assert・`guard-corpus-benchmark-child.ts` の計測構造・helper の消費者(t259 のみ)を実読で確定。
2. ブランチ `bolt/fix-1797-t259-interleave` を worktree 隔離で作成。
3. **負荷スイープ(現行設計の欠陥再現)**: repo 外 scratch で 16 並列の busy/idle バースト負荷(CI fan-out 模擬)を自己生成し、現行の逐次2プロセス設計で比の分布を実測 — burst 下で **max 2.5179 > 閾値 2.5** の欠陥を再現(Issue 報告値 2.5065 と同型)。steady 負荷では超えない = 原因は負荷量でなく**窓間の負荷変化**と確定。
4. **実装(交互計測)**: child を単一プロセス内で 1コピー/2コピーを交互(A,B,A,B…)に測る形へ変更し時間窓を共有。RSS は単一プロセス内比較が成立しない(retain 注入で向きが反転する実測: two/one 0.663〜0.885)ため **per-process 計測を維持**し child が自分自身を probe spawn する形に。呼び出し側 spawn は1回。
5. **新設計スイープ → 閾値確定**: burst 下のレンジ幅 0.748 → **0.087** に縮小 — FR-3b の「分散が十分縮まれば閾値 2.5 維持」分岐を採用(引上げ・可変化なし = FR-3c 充足)。
6. **落ちる実証(両 assert)**: 時間比 = 2コピー側のみ parse 追加注入 → 3.9785 で赤(走査注入 2.2857 では赤にならず注入面を parse 側へ変更した過程も記録)/ RSS 比 = 40×64MiB retain 注入 → 12.37(probe 短縮後 4.14)で赤 → revert 後 2.0265/1.2508 で緑。
7. CI 1回目の赤(t258 / t-plugin-stage-discovery-performance — いずれも t259 非依存)を帰属: t258 は base 再現の既知 flake として別 Issue #1830 起票(closed #1511 との dup 確認込み)。初版の RSS probe が CPU 消費2倍(10s→20.8s)で隣接テストを悪化させうる実在リスクは probe 短縮(11.7s)で潰した(fanout-load-settle 系の自己是正)。
8. deslop → 検証 → コミット → push → PR #1822 → 収束ループ(CLEAN・全 green・thread 0)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-31T07:09:22Z
- **Iteration:** 1
- **Scope decision:** none

PR #1822 は FR-3a〜3c に忠実 — RSS per-process 維持は実測裏付きの申告済み精密化、閾値 2.5 維持はスイープ数表から機械的に導出、落ちる実証は正しい注入面で成立。

### Findings

- None
