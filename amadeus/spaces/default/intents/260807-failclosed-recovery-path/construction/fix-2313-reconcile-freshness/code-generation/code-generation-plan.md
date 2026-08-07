# Code Generation Plan — Bolt 1: fix-2313-reconcile-freshness

上流入力(consumes 全数): `requirements`(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-1 全項と AC-1a〜1e、NFR-1〜NFR-5、C-1〜C-5 を本計画の唯一の要件正本として使用)。

## 目的

#2313 の回復経路2面(freshness path 集合の canonical 化 + 第2段 tree 証明の精密化)を**同一 PR**で実装し、main の `No Silent Drop Evidence Reconcile` 恒久赤を解消する。実装拘束は requirements.md FR-1(裁定系譜: #2385 Q1 + #2385 Q2-A + 本ステージ Q5-A)。

## 鮮度再実測(着手時、C-5)

- reconcile 最新2 run = failure(31135902843 / 31135860614)— RE 時点から不変
- `gh pr list --state open --search "2313 in:title,body"` = 0 件
- #2359 = OPEN(FR-3.3 の hook 制約は有効のまま)
- base: `git rev-list --left-right --count origin/main...HEAD` = `0 0`、origin/main = `b8e3e664f08185e0bd3e3b6d9b7f2dfb60c0ad7d`

## 変更面(NFR-4: repo-only — `scripts/` / `tests/` / `docs/`。dist 再生成なし)

| ファイル | 変更 |
|---|---|
| `tests/no-silent-drop/evidence-rebind.ts` | canonical freshness path 集合の export 追加(FR-1.1) |
| `scripts/no-silent-drop-evidence-adapter.ts` | `:226-240` freshness 述語の path 集合を canonical import へ / `:316-324` 第2段証明の置換(FR-1.2) |
| `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | `:187-193` の inline パス列を canonical import へ(FR-1.1) |
| `tests/integration/t427-no-silent-drop-evidence-reconcile.integration.test.ts` | `:473` 付近の期待書き換え(FR-1.3) |
| 新規テスト(t466 以降 — C-4) | canonical 単一定義・第2段新証明・残存ホール (b) 赤ケースの固定 |
| `docs/reference/11-contributing.md` + `.ja.md` | rebind 手順節(FR-1.5) |
| `tests/no-silent-drop/adoption-evidence*.json` / `evidence/adoption-runs.json` | branch 内 rebind(自己マッチの帰結 — 意図的受容) |

## 実装ステップ(TDD — NFR-1。AC 述語は requirements から逐語で写す)

1. **Red**: canonical export の単一定義テスト — 「freshness path 集合を `tests/no-silent-drop/evidence-rebind.ts` に export し、t413 と adapter の**両方が import する**。集合の中身は **`:(glob)tests/no-silent-drop/**/*.ts` + `tests/no-silent-drop-gate.ts` の2要素**」(FR-1.1 逐語)を assert する新規テストを書き、export 不在で Red を実測。
2. **Green**: `evidence-rebind.ts` に export を追加、adapter `:226-240` と t413 `:187-193` を import 消費へ置換。
3. **Red**: 第2段証明の新契約テスト — 「**canonical freshness パス集合(FR-1.1 の export)+ `EVIDENCE_BUNDLE_PATHS` 3ファイル(配列定義 `:27-31`、定数 `:24-26`)の面で PR head と landing が一致すること**。それ以外の差分は base 前進として許容する」(FR-1.2 逐語)。赤ケースには「**残存ホール (b) の形(gate 実装パスの PR head↔landing 差分)を必ず含める**」(FR-1.4 逐語)。
4. **Green**: adapter `:316-324` の root tree 完全一致を新証明へ置換。
5. FR-1.3: t427 期待の書き換え(CLI ソース文字列 pin は不変に保つ)。
6. FR-1.5: docs 2面へ rebind 手順節(コマンド逐語: `bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head>`)。
7. **branch 内 rebind**: 本 PR は pin glob に自己マッチするため `bun scripts/no-silent-drop-evidence.ts rebind --target-revision <head SHA>` を実行し証拠3ファイルをコミット(head 変更ごとに再実行)。
8. **落ちる実証(FR-1.4)**: 「注入コミット→赤実測→復元→残渣ゼロの1セット」(逐語)。drift 検査と第2段証明の両方。別ブランチで実施(承認待ち PR 保護)。
9. 検証(NFR-2/NFR-3): `bun run typecheck` / `bun run lint` / 対象テスト(t413・t427 系・no-silent-drop 系・新規)/ `bun tests/no-silent-drop-gate.ts check --base-revision <HEAD の厳密祖先の完全 SHA>` / `bash tests/run-tests.sh --ci`。coverage 台帳へ波及したら NFR-5(機械 remap + 直読照合 + span 検査、census は最終 base)。
10. PR 発行 → 収束ループ(`j5ik2o-gh-pr-converge-loop`)→ ユーザー承認マージ → **AC-1c: 着地後の main reconcile run success 実測は FR-1 完了の必須条件**(逐語 — 赤なら再帰属→同一 intent 内追加修正)。

## AC(requirements FR-1 の AC-1a〜AC-1e を合否面とする — 逐語参照)

- AC-1a: observed 相当の再現(binding=`fe8c701ba`、event=`b8e3e664f`)で freshness 述語が `true` を返し `REBIND_NOOP`(fixture 機械再現)
- AC-1b: 主分岐・副分岐の両方が同一 PR 内で実測で閉包
- AC-1c: 着地後 main reconcile run success = FR-1 完了の必須条件
- AC-1d: t427 系2ファイル green + CLI 文字列 pin 不変
- AC-1e: docs 2面に手順節実在、コマンド逐語一致

## 逸脱規律

実装が FR-1 から逸脱する必要に気づいたら**実装前に停止**して conductor へ報告(既存様式への準拠と判断する場合も停止対象)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T05:30:55Z
- **Iteration:** 1
- **Scope decision:** none

plan は AC-1a〜1e を縮小なく写し、TDD Red/Green 2サイクルと落ちる実証(残存ホール(b)形含む)の証跡あり。FOLLOW-UP 5件(実証の SHA 粒度 / AC-1a テスト名指し / complexity・再現性検査の N/A 明示 / 台帳追記のみ確認 / エラーコード据え置きの分類)と NIT 1件。

### Findings

- FOLLOW-UP | FR-1.4 落ちる実証の注入コミット SHA・ブランチ名・実出力引用が summary に無い — 監査可能性のため追記推奨
- FOLLOW-UP | AC-1a(REBIND_NOOP fixture 再現)の対応テスト名が summary で名指しされていない
- FOLLOW-UP | NFR-2 のうち complexity gate と隔離2回ビルド再現性の言及欠落 — N/A なら明示
- FOLLOW-UP | NFR-5 台帳制約(events 追記のみ)への rebind 3ファイルの抵触有無を一文で確認
- FOLLOW-UP | REBIND_PR_LANDING_TREE_MISMATCH 据え置きは機械的帰結でなく P5 最小変更を根拠とする設計判断として区別記載
- NIT | 検証節に主要コマンドの実出力1行引用があるとよい
