# Code Generation Plan — U3 u3-runner-gen-plugin(Bolt 3)

上流入力(consumes 全数): business-logic-model.md(3層フロー)、business-rules.md(BR-U3-1〜6)、domain-entities.md(GraphStage 拡張の additive 契約)、performance-design.md(spawn 1追加)、security-design.md(検証済み graph のみ)、unit-of-work.md(U3 境界)、requirements.md(FR-4)

## 実装計画(builder ディスパッチ内容の記録)

1. compile 焼き込み: plugin join でノードへ `plugin_source?: true`(BR-U3-1 = ADR-1 主案。stock はキー不在 — business-logic-model.md の false 禁止)。:2140 コメント改訂と graph 消費者の全数棚卸しを含む(domain-entities.md)
2. runner-gen: plugin ノードの生成対象化(BR-U3-2 テンプレート1定義)、check/prune 挙動不変(business-logic-model.md 生成層)
3. CLI 配線: handleCompose/handleDrop 両側の spawn(BR-U3-3 対称、performance-design.md の同型 spawn、security-design.md の固定 argv)
4. テスト: fixture の落ちる実証先行(BR-U3-5 regression-first)+stock バイト不変の機械実証(BR-U3-4、requirements.md FR-4c)+unit 純関数(BR-U3-6)
5. dist×7/self-install 再生成+全検証+patch gate ローカル PASS

## 隔離と規律

worktree `bolt-u3-runner-gen`(base origin/main b32be0ec2)。Bolt 2 と並行(ユーザー裁定)、amadeus-plugin.ts 接触は最小(型1行+spawn 配線)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-28T00:42:23Z
- **Iteration:** 1
- **Scope decision:** none

ADR-1/BR-U3-1〜6 の1:1実現(compile 限定 stamp・additive・stock バイト不変・単一テンプレート・対称配線)を独立再検証で確認。builder 申告(generateRunners required seam)は妥当。検証再実行 全 exit 0(21 pass、t129 不変)。残存指摘なし。

### Findings

- None
