# Code Generation Plan — u5-measurement-report

上流入力(consumes 全数): functional-design/business-rules.md(BR-U5-1〜6)、functional-design/domain-entities.md(レポートのデータモデル・節構成・スクリプト規律)、nfr-design/security-design.md(読取のみの境界)。補助参照: inception/requirements-analysis/requirements.md(FR-4a〜4c)。

本 plan は invoke-swarm 経路のディスパッチに対する conductor 事後作成である(cid:code-generation:swarm-unit-artifact-backfill)。本 unit は **record 内レポート1本のみ**でコード変更を伴わないため、builder へ委譲せず conductor が実施した(builder は record への書込を禁止されているため — 委譲すると成果物を書けない)。

## 受け入れ基準(requirements.md FR-4 逐語)

- **FR-4a**: 測定述語は `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(`amadeus-intent-autonomy-replay.ts:24` が正準定数)を用いる。`AUTONOMY_MODE_SET` は legacy(発行点ゼロ)であり新規計測に使わない
- **FR-4b**: ベースラインは第三者再現可能な C1(508/178/686、13 intents)・C3(tx/question.answered/human.turn の3 intent 対照)とする。C2(231件/63 intents)はクロスレビュー2名が再現不能と判定済みのため使わない
- **FR-4c**: 計測レポートは計測 ref(clone/SHA/述語/測定時刻)を明記する。適用後の新規 intent で「mode 設定前 human.turn = 0」を確認する(完了条件1 の受け入れ)

## 実施手順

1. **BR-U5-5 の依存確認**: u1・u2・u3 の着地面を `origin/main` の実 grep で確認してから計測する。未着地面の計測は PENDING(閉包条件併記)として分離し PASS と代用しない
2. **BR-U5-6**: 計測スクリプトは repo 外 scratch に置き、audit/record を汚染しない読取のみとする
3. **BR-U5-4**: 集計述語は `(.attributes.Event // .event)` 正規化を必須とし、スクリプト全文をレポートへ逐語掲載する
4. **BR-U5-3**: すべての数値はコマンド出力からの転記のみ。派生値は算出式を併記する

## 検証

コード変更が無いため typecheck / lint / テストの新規実行は本 unit の検証面ではない(NFR-5: 既存 green の維持は他 unit の検証で担保)。本 unit の検証は **レポート実体の実読**と**スクリプトの第三者再実行可能性**である(BR-U5 の写像表どおり)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-08T10:43:15Z
- **Iteration:** 1
- **Scope decision:** none

レビュアーが全数値主張(コーパス全体4値・per-record 内訳16セル・依存着地確認4面・時系列3点)を独立に再導出して完全一致を確認し、BR-U5-1〜6 の充足と PENDING/N-A 分類の妥当性、AUTONOMY_MODE_SET の発行点ゼロ、v1/v2 二段 fallback の必要性も裏取りした。FOLLOW-UP 1件(records 146 が孤立 audit ディレクトリを1件含む)は 145 へ再計数し是正済みで、コア主張と FR/BR 判定には無影響。

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260807-autonomy-reachability/construction/u5-measurement-report/code-generation/code-summary.md:20 — コーパス記述 records 146 は intent ではない孤立ディレクトリ amadeus/spaces/default/intents/audit/ を1件含む。intent record の実数 145(audit 保有 143)へ訂正し、影響範囲(§4 集計と §8.1 per-record ループは不変)と孤立ディレクトリ自体の申し送りを追記して是正済み。
- NIT | amadeus/spaces/default/intents/260807-autonomy-reachability/construction/u5-measurement-report/code-generation/code-summary.md:15 — §2 の依存確認は git show origin/main 基準と明記されているが、reviewer は Bash 不在のため worktree 現行ファイルで再確認した(結果は 2/3/3/1 で完全一致)。乖離の証拠は無いが、reviewer 側で origin/main 断面を直接照合できていない点を記録する。
