# Code Summary — fix-1769-degrade-multiunit(Bolt 0)

上流入力(consumes 全数): requirements.md(FR-1769a〜c の充足対照)。

## 結果
- PR: https://github.com/amadeus-dlc/amadeus/pull/1774 — **マージ済み**、#1769 自動クローズ(着地 grep: resolveDegradeUnit ×3 on main)。
- コミット列: 828a57f33(uncovered-unique 実装+t367 test 10-13)→ a43986794(Bugbot 是正: unitKinds 伝搬+test 15)→ ca9f8c7b1(origin/main 再接地 merge、parent 2・マーカー0・allowlist union)。

## 検証(round 2 報告より)
typecheck/lint/dist:check/promote:self:check 0 / t367+t186+t116 = 48 pass / ratchet 系 44 pass / CI 17 pass / スレッド 2/2 resolved。落ちる実証: test 15(旧実装 checkout で単独赤)、test 14(CodeRabbit 提案どおり単一候補アーム削除で単独赤)— 両側とも非空虚を実証、復元 green。

## 裁定・逸脱
- E-OBB2-CG1(2-0、GoA 2×2): 裁定 B — 単一 dir は coverage に関わらず解決(ゲート時 directive 再取得の保証・DAG 経路の全充足再発行と一様)。投票者留保2件(covered 単一の回帰テスト固定/非対称の意図的相違を注記と返信の両方へ)を test 14+コード注記+返信の3面で転記。
- CodeRabbit Major は裁定に基づく意図的相違として却下(実装不変)。
