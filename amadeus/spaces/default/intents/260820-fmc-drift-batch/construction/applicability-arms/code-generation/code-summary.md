# Code Summary — applicability-arms(U4 / #3186)

上流入力: `code-generation-plan.md` / FD 3 成果物 / `nfr-design/security-design.md` / `unit-of-work.md` U4 / `requirements.md` FR-ARM-1〜7・FR-REG-5。数値は builder 2 回の完了報告と CI ログからの転記(測定 ref = worktree commits `8c74522f3` + `5e1fb8ede`、着地 = PR #3374 squash `3ae6223f4`、2026-08-21 マージ)。

## 実装実測

- **規模**: 9 ファイル +1551 / −16(新モジュール 559 行 + テスト 2 本 715 行)+ coverage 是正 +104(テスト 7 本)。見積 実装 250〜350 / テスト 350〜450 に対し、fail-closed 全様式・受け入れ二層の実装で上振れ(FD 必須要素の較正クラス)
- **tier (i) 実 corpus(逐語)**: PrConvergenceGate × pr-convergence-cli.ts → 1 finding(**covered=TerminalVerdicts**{converged,override}(サイズ2の宣言済み値集合 — 改訂述語の完全被覆条件 S⊆C を満たす側は Verdicts でなくこの集合)、cluster=[converged,landed,override,superseded]、unknown=[landed,superseded]、line 744)。BoltPrAttestationGate 同型 1 finding。MirrorLifecycle 4 governed ソース各 0(非空虚陰例 — 宣言値集合 7 本)。FormalElection 5 ソース各 0(値集合ゼロの空虚陰例と明示 assert)— 20 pass
- **tier (ii) pipeline**: 合成 fixture で発火(revision-evaluation-required、exit 1)/ 非発火(fired:false・evaluated)両側 + `--persist true` + HUMAN_TURN 検証済み receipt でのみ閉包 — 15 pass
- **defectRecurrence**: 交差2で発火 / 交差1 = 閾値ちょうどで発火 / 交差0・enhancement のみで非発火 / 閾値 0<1<2 両側 strict / not-supplied 明示 — corpus 再実測(bug 限定)= 260817:0 / 260818:2 / 260820:0
- **fail-closed**: model-source-unreadable(cfg / entry の各アーム)・model-source-unparseable・model-vocabulary-inconsistent・issue-evidence-unreadable/unparseable・not-evaluated(素通りゼロ)— 是正ラウンドで全枝テスト化、注入→赤6件→revert 残渣0の落ちる実証1セット
- **census**: AUTHORING_ROUTES 定義 = leaf 1箇所のみ(applicability/registration は import のみ)— BR-8 完成形
- **検証**: typecheck 0 / lint 0 / t3186 2 ファイル 42 pass / formal・tla 57 ファイル 806 pass / t3078・t146・registry --check 全緑
- **CI 経過**: 1周目 Patch Coverage Gate 赤(UNCOVERED 9 行 — fail-closed 枝と空 --changed usage)→ テスト追加後 2周目全緑。targeted lcov で 9 行全て正 hit を事前確認(注: 正本判定は CI gate)

## write scope 追補

新モジュール `plugins/formal-model-check/tools/tla-applicability-arms.ts`(純粋述語群の分離)は unit-of-work.md U4 の宣言 write scope(tla-applicability.ts / tla-authoring.ts / stage・docs 面 / 新規テスト / 生成台帳)に明示されない追加ファイルであり、**本節で write scope 追補として明文化する**。分離自体は FD の「純粋関数として実装」意図の実現形で、選挙 E-260820-FMC-CG-U4DEV の question 本文が同モジュールを名指し(plugin.json tools[] 宣言の機械的適応 (b))して 2-0 追認しており、裁定記録上は可視だった — 明文の write scope 行が欠けていた点を本追補で閉じる。所有権交差なし(新規ファイル)。

## 逸脱(全て裁定・申告済み)

- **述語の単調強化**(実質)— 選挙 E-260820-FMC-CG-U4DEV 2-0 追認、FD 改訂注記追補済み。投票者の敵対的再導出により、実装の2部条件(完全被覆 ∧ unknown リテラル)が精緻化自体を偽陽性フリーに保つことも独立検証済み
- 機械的適応3件(tier (i) テストの integration 配置 = c2-doctor-seam 適用 / plugin.json tools[] 宣言 = t3078 強制 / model-map パス解決基点)— 同選挙で追認

## 配送・クローズ

PR #3374(converged:true・CLEAN・unresolved 0)→ 常任承認条件でマージ → Issue #3186 クローズ(着地面実読: arms モジュール実在・--issue-evidence シーム実在・leaf 集約完了)。pr-convergence-report.md(kind: converged)同梱。
