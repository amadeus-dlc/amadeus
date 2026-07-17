# Reliability Requirements — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、codekb technology-stack.md。

## 要求

- RR-1: 未知ハーネス名は loud に失敗する(exit 2+6値列挙 — BR-3 挙動保存)。サイレント失敗・fail-open を導入しない
- RR-2: エンジン dir 解決の fail-fast を保存(engineDirNameFor :15-20 の throw — 実測 verbatim `throw new Error(\`no engine directory mapping is defined for harness "${harness}"\`)`)。entry 追加漏れはこの経路+契約テストで検出される(domain-entities.md の2機構)
- RR-3: hook project-dir 解決(rung 2)の worktree 誤収束を opencode/cursor でも防ぐ(AC-6a/6e — E-1048-FD-Q1=A 裁定)。検証は worktree 解決テスト1本
- RR-4: 既存 installer のアトミック性・リカバリ機構へ非接触(FR-4 クラッシュ耐性面)— 触れる必要が生じたら逸脱として実装前停止

## SLO

該当なし(根拠付き N/A — observability-setup:c3): 本 unit はランタイムサービス・SLI を持たない単発 CLI で、service SLO の対象が不存在。単発 run の成功を SLO 達成へ昇格させない。
