# Code Summary — delegate-consume-fix(#736)

> 実装: developer subagent(Bolt worktree `bolt/delegate-answer-consume`、base: main 6f1d7ab2a、コミット `1a7d2ee44`)+ conductor 裏取り・deslop 検分。

## 変更(8ファイル、+1132/-343 — 大半は dist×4+self-install×2 の生成同期)

- **`packages/framework/core/tools/amadeus-lib.ts`**(正本、+133 行相当): `humanActedSinceGate` を共有ヘルパ `scanPresenceLedger`(1回スキャン+検証+時系列ソート、`PresenceEvent { human, delegVerb?, res? }`)+ per-kind 閉形式評価に再設計。
  - gate 述語(verb 指定): HUMAN_TURN は任意 resolution で消費(ローカル意味論不変)/ verb 一致検証済み delegation は **GATE 枠**(GATE_APPROVED/REJECTED のみが消費 — QUESTION_ANSWERED は消費しない = #736 修正点)
  - answer 述語 `humanActedSinceLastAnswer`: thin alias 廃止・専用実装。delegation は **ANSWER 枠**(QUESTION_ANSWERED のみ消費)
  - verb 無し(発行側 grounding :1625/:1719 用): 旧 uniform 境界を完全維持(Q3=A、回帰なし)
  - `verifyDelegatedProvenance` 不変(偽造拒否)。新規オンディスク状態なし(ledger スキャン導出 — requirements 推奨どおり)
- **`tests/unit/t-delegate-answer-consume.test.ts`**(新規、11 tests): FR-3 の (a)〜(d) 全分岐+非退行(ローカル意味論/偽造/verb 混合/verb 無し現行維持)
- dist×4 + `.claude/tools/`・`.codex/tools/`(package.ts + promote:self、同一コミット — NFR-1)

## 落ちる実証(Mandated)

修正前 dist に対して新テストを実行 → **7 pass / 4 fail**(fail = 主要件 delegate→QA→approve、reject ミラー、answer 枠の GATE 誤消費、gate 枠の QA 誤消費 = #736 本体)。非退行系は修正前でも pass = テストの判別性を確認。修正後 **11 pass / 0 fail**。

## 検証(実測 exit code)

package.ts 0 / promote:self 0 / typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / `--unit --filter "t112|t188|t-delegate"` 0 / `--ci` 0(278 files / 4037 assertions / 0 fail、t28 含む)。
conductor 裏取り: typecheck 0・新テスト 11 pass を worktree で再実測。deslop 検分: 残存なし(共有ヘルパーで因子化済み、2述語の意味差はコメントで判別可能)。

## 実装判断(subagent 報告より)

1. delegation 検証はスキャン時に両 type 一括(verifyDelegatedProvenance は純 read で副作用ゼロ、評価時 verb フィルタ — 観測可能な挙動差なし)
2. HUMAN_TURN(任意 resolution で消費)と delegation(per-kind 枠)の非対称は仕様どおり — t112 AC-1c(発行側 HUMAN_TURN は issuer ledger 側)と両立
3. 閉形式(kind 別 last index 比較)で O(n²) 回避・可読性優先
