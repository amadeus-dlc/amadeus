# Code Generation Plan — fix-t258-p95-flake(Issue #1511)

上流入力(consumes 全数): requirements.md(inception/requirements-analysis — FR-1〜FR-5 / NFR-1〜3 の導出元)。units-generation SKIP のため unit 系 consumes 不在(degrade 様式)。

## 実装環境

- 専用 worktree `.claude/worktrees/t258-p95-flake`、ブランチ `fix/1511-t258-p95-relative-gate`、base `origin/main`(cid:code-generation:solo-bolt-worktree-required)
- 変更面は tests/ のみ(dist/self-install 非対象 — 制約)

## Steps

1. **述語の分離(FR-2)**: `tests/lib/lifecycle-latency-gate.ts`(仮名)に純関数 — fail 条件 =「(modeP95 − noopP95) > 相対 floor」AND「modeP95 > 絶対予算」。named constants+fail-closed(baseline ≤0/非有限 → fail)。相対 floor は実測から導出し導出式コメント(plugin-discovery-overhead-gate 様式)
2. **述語 unit テスト(FR-2)**: ハッピーパス+エッジ(境界値・非有限・baseline 0)+退行ケース。#1511 実在集計値(recovery 767.446207 / archive 886.793806)+ラベル付き合成 noop の代表シナリオ(FR-1 基準1)— 旧述語(絶対単独)なら赤・新述語で green の対照を unit で固定
3. **t258 への配線(FR-1)**: :461-462 を述語呼びへ置換。noop の latency p95 を算出(既存 :444 の noop サンプル転用、ベンチ回数不変)。provenance へ `noopP95Ms` 追加(既存フィールド不変 — NFR-3)
4. **t257 の同方式是正(FR-3)**: :240-241 を同一述語へ。noop baseline の有無を実測し、無ければ最小追加。canonical 1定義の共有(独立再定義禁止)
5. **統合面の配線実証(FR-4)**: t258 統合テストで述語 fail が実際に伝播する注入1ケース(退行: noop 速いのに mode だけ予算超過)
6. **検証(NFR-1)**: typecheck / lint / run-tests.sh --ci / coverage:ci 全 exit 0、lcov patch 未カバー 0。dist:check / promote:self:check 無風確認
7. **code-summary.md** 作成(FR 対応表・実測 exit code・落ちる実証ログ・floor 導出式)

## 制約

- ベンチ構造(child spawn・100サンプル・warmup 10)不変。CI ワークフロー変更禁止。逸脱は実装前停止。検証は同期完遂

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T23:36:19Z
- **Iteration:** 1
- **Scope decision:** none

改訂裁定 Q1改=C(median 基準)への忠実な実装を全数検証 — 無申告逸脱なし、旧 p95 対照は verbatim 一致の真正、fail-closed・canonical 1定義・NFR-2/3 遵守。検証マトリクスを reviewer 自身で再実行し code-summary と一致。Minor 2件(測定 ref 表記・FR-4 の t257 解釈の明記)は conductor が是正済み。

### Findings

- [Minor/是正済み] code-summary の測定 ref 表記(fork base で同一集合)が誤り — rebase 後 base f8fe817c5..HEAD の転記へ是正
- [Minor/是正済み] FR-4 の統合配線が t258 のみである解釈(canonical 述語1回実証で敷衍)を code-summary へ明記
