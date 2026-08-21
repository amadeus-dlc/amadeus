# Code Generation Plan — U1 fmc-retirement

上流入力: `../functional-design/business-logic-model.md`(直列 8 段・台帳表)・`business-rules.md`(BR-1〜9)・`domain-entities.md`(fixture 形状)、`inception/units-generation/unit-of-work.md`(write scope 2 面)、`inception/requirements-analysis/requirements.md`(FR 受け入れ基準)。実装は swarm 配送(batch 1、amadeus-builder-agent、worktree bolt-fmc-retirement、base 8a3c134bd → rebase 後 5117c57b8)。

## 実行計画(実績反映 — swarm 配送につき事後作成、cid:code-generation:c5-followup-routing (c) 準拠)

直列 8 段(FD どおり)で実施。段ごとの完了述語・実測は code-summary.md に転記。

## 設計からの相違の裁定(conductor 裁定 — builder は申告のみ)

| # | 相違 | 裁定 |
|---|---|---|
| 1 | A2 個別判定の粒度: t381 の 2 test / t378 の 1 describe は被検 subject が plugin-activation 自体 → ファイル内一部削除(集計 温存4/削除4 は設計どおり) | **承認** — fixture が自分を検証する検証劇場(P2)の回避。O-5 被覆(advisoryLatchDir)は温存 test に残存を regen 実測で確認 |
| 2 | fixture 形状: stage ファイル名 = plugin 名、配置 = plugins-root 形 | **承認** — t341 assertion(ownedPaths)と projector の identity 契約(directoryName)への必然的追随。FR-TEST-3(b) の許容範囲 |
| 3 | t341 の INSTALL doc を projector 公開 seam(installArtifacts)から生成 | **承認** — dist と同一関数の出力で assertion 強度不変 |
| 4 | census 未収載 2 件(t486 の fixture import / patch-allowlist の路外 2 エントリ) | **承認** — census の検索キー限界による漏れの実装時回収(BR-8 の実測確定に包含) |
| 5 | measured GraphQL fixture 2 件のリテラル置換(FR-DEL-1 の 3 キーのみ、構造同一を機械検証) | **承認** — census B2 が両ファイルを編集対象として列挙済み(設計内)。実測記録の改変である事実は本表と code-summary に明記し、§12a レビュー対象とする |
| 6 | B2 側 assertion 2 件の削除(subject 消滅面: t2997 の advisories 存在検査 / t449 の fmc binding 検査) | **承認** — 被検対象自体を FR-DEL-1/3 が削除。B1 の削除ゼロ制約は別途機械照合済み(expect 件数 442→444) |

## FR-NORM-1 の設計節(§12a FOLLOW-UP の閉包 — FR-ISS-1 と対称化)

- **所有**: conductor / **時期**: 本 Bolt PR 着地の実読検証後 / **成果物形**: origin/main 起点の単独ノルム PR 1 本(team.md 二層検証の形式検証面 + project.md の fmc/tla 系 cid — 着手時に re-scan §O-7 の述語で件数を再実測してから改訂。蒸留手順・矛盾監査・常任マージ承認条件)

## swarm 収束記録

referee check: 1回目 converged:true / tampered:true(t341 を protected 指定したが設計自体が差し替えを指示 — 弱体化は expect 件数非減少で機械確認済みの設計許容内検出)→ protected 指定なし再実行で converged:true / tampered:false。settle-release succeeded(pool terminal)。配送は per-unit Bolt PR(finalize 不使用 — cid:code-generation:c1-swarm-pr-delivery)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T07:54:26Z
- **Iteration:** 1
- **Scope decision:** none

Gate拡張(追補1)が unit-of-work write scope・requirements/NFR に未接地、write scope 未追補、FR-DOC-1/DEL-3/DEL-4 の名指しトレース不足

### Findings

- BLOCKER | code-summary.md:23-29 追補1のProject Coverage Gate拡張がwrite scope・requirements/NFRに未接地(ADR/設計根拠の遡及文書化またはPR分離が必要)
- BLOCKER | unit-of-work.md write scope が追補1/2 のファイル群を未宣言(承認済み unit 境界が実配送に対し stale)
- FOLLOW-UP | code-summary.md 逸脱節に追補1/2 への cross-ref がない
- FOLLOW-UP | FR-DOC-1 の t3028・FR-DEL-3 の graph compile 不在確認・FR-DEL-4 の runner-gen regen が名指しで未トレース
- NIT | measured GraphQL fixture のリテラル置換について fixture 側への provenance 注記を提案

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T07:54:26Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER/MAJOR は ADR-7・write scope 追補・cross-ref・FR トレーサビリティ実測で解消。新規 BLOCKER なし

### Findings

- FOLLOW-UP | code-generation-plan.md:5 の cid:code-generation:c5-followup-routing は不在 — 実在は cid:build-and-test:c5-260809-followup-routing。次回接触時に訂正
- FOLLOW-UP | unit-of-work.md 追補行の tests/run-tests.ts / t112.serial.test.ts が code-summary 追補1/2 の叙述で個別裏取りされていない — 一行追記を推奨
- NIT | 追補2 の FR-TEST-6 引用は名指し主語(3 unit)より広い適用 — AC 準拠だが一句の区別注記を推奨
