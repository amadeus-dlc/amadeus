# Bolt Plan — インセプション固定費バッチ(#3181 + #2415)

上流入力: `requirements.md`(制約)、`components.md`(C1〜C7)、`unit-of-work.md`(U1/U2 定義)、`unit-of-work-dependency.md`(DAG — U2 depends_on U1)、`unit-of-work-story-map.md`(FR 割当と Unit 内実装順)。計画承認: 梯子 AUTO_DECIDED `auto-decision-d41c65f2f7beb6923659931aa1dae236`。

## Bolt 1

- **Units:** `issue-evidence-upstream`
- **Walking skeleton:** YES — self-feature スコープの義務(単独・ゲート付き実行、残り Bolt の前にユーザー明示承認)。証明する層: gateway(gh 境界)→ CLI verb → record artifact → stage 契約 consume 配線 → sensor 義務 — 取り込み経路の全アーキテクチャ層を最小 end-to-end スライスで貫通する
- **Definition of Done:** FR-EVD-1〜8 の AC 全達成(story-map の U1 実装順 7 step)。TDD Red→Green 証跡、落ちる実証(FR-EVD-8)完了、`bun run build` 後の dist 投影確認、typecheck/lint/targeted テスト green、PR 作成済み(push-first — 重い検証はリモート CI 正)
- **Confidence hypothesis:** 「issue-first intent で `issue-evidence fetch` 1回の実行により、クロスレビュー済み一次資料が record に実在し、RA/RE がそれを consume できる」— これが成立すれば #3181 の固定費削減経路(再導出の置換)が機械的に開通したことを証明する
- **Expected demo:** 本 intent 自身の Issue(#3181/#2415)で fetch を実行し、生成された issue-evidence.md の様式と provenance を実照する

## Bolt 2

- **Units:** `re-input-exclusion`
- **Walking skeleton:** NO(通常 Bolt — Bolt 1 の承認後に実行)
- **Definition of Done:** FR-EXC-1〜6 の AC 全達成(story-map の U2 実装順 6 step)。除外述語の事前実測(既知非ゼロ区間で正件数・specs/** 非除外)、落ちる実証1セット、帰属検査述語 green、契約⇔定数 drift 検査、PR 作成済み
- **Confidence hypothesis:** 「除外クラス適用後の RE 差分入力から工程排出物が消え、除外された全行が宣言クラスへ帰属する(未帰属ゼロ)」— これが成立すれば #2415 の自己増幅遮断が述語レベルで担保されたことを証明する
- **Expected demo:** 本 intent の RE 区間(89053172e..23d4ae767、排出物 61.8% 実測済み)へ除外述語を適用し、縮小率と帰属検査の実測値を提示する

## 実行順序と直列化

順序は **Bolt 1 → Bolt 2 の厳密直列**。根拠は `risk-and-sequencing-rationale.md`。Bolt 間の取込は: Bolt 1 の PR 着地 → Bolt 2 ブランチを origin/main へ rebase → 共有ファイル `reverse-engineering.md` の U2 面を U1 面の上に編集 → 再 mint → CI 再走(`cid:pr-convergence:serial-landing-rebase-shape`)。
