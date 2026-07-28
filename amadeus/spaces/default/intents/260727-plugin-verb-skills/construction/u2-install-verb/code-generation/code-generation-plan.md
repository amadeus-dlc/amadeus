# Code Generation Plan — U2 u2-install-verb(Bolt 2)

上流入力(consumes 全数): business-logic-model.md(install フローと swap α〜δ)、business-rules.md(BR-U2-1〜7)、domain-entities.md(型と2 seam)、performance-design.md(素朴コピー)、security-design.md(hardening・symlink)、unit-of-work.md(U2 境界)、requirements.md(FR-1・FR-5c)

## 実装計画(builder ディスパッチ内容の記録)

1. parseInstall+USAGE(business-logic-model.md Step 冒頭、FR-1a)
2. 型の判別 union 機械拡張(domain-entities.md — installed kind / failure.stage "install"、網羅 switch 型強制)
3. handleInstall: 検分 → 名前 hardening(security-design.md の申告済み敷衍)→ 3値衝突判定(BR-U2-1 = Q2 裁定 A)→ swap 配置(BR-U2-2、business-logic-model.md α〜δ)→ compose 委譲(BR-U2-3 trust 不変)
4. INSTALL 文言(BR-U2-7、requirements.md FR-5c — folder-drop-auto / manual-only の2クラス)
5. テスト6ケース以上(BR-U2-6、performance-design.md の既存ランナー内)+dist×7/self-install 再生成+全検証+patch gate ローカル PASS

## 隔離と規律

worktree `bolt-u2-install`(base origin/main b32be0ec2)。Bolt 3 と並行(ユーザー裁定)— amadeus-plugin.ts の交差は後着側 rebase で吸収、マージ前に c6 実 diff 再評価。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T00:38:16Z
- **Iteration:** 1
- **Scope decision:** none

実装は FD の swap α〜δ・3値衝突・trust 不変・冪等収束表と1:1一致。申告3適応(if-stale/相対表記/改番)は contract 非破壊で妥当。書込は staging root 限定、検証再実行 全 exit 0(typecheck / t353 10 pass / t341 3 pass / dist:check)。残存指摘なし。

### Findings

- None
