# Bolt Plan — 260717-state-mirror-fixes

上流入力(consumes 全数): requirements.md、components.md、unit-of-work.md、unit-of-work-dependency.md、unit-of-work-story-map.md、team-practices.md

## Bolt 列

| Bolt | Unit | 内容 | ゲート | 規模(unit-of-work.md より) |
|---|---|---|---|---|
| 1 | fix-1170-retreat-guard | handleSetStatus の export+withAuditLock ラップ+parseCheckboxes 後退判定(components.md C1/C2)+dist 6ツリー/self-install 再生成+unit/integration テスト | Bolt PR マージは都度ユーザー承認(no-AI-merge) | 実装 30-40行 / テスト 160-190行 |
| 2 | fix-1172-skip-denominator | countStageProgress の `— SKIP` 分母除外+t232 fixture 実様式是正 | 同上 | 実装 3-5行 / テスト 20-40行 |

Bolt 1/2 は依存なし(unit-of-work-dependency.md の bolt_dag: batches=[[両 unit]])— 並行実装可(c6 非交差判定済み、同時アクティブ builder ≤4 の枠内)。

## Walking Skeleton の扱い

本 intent は既存コードベースへのインクリメンタルな bug fix バッチであり、org.md の規律「bugfix・refactor 系はスケルトンのセレモニーをスキップし、最初の Bolt も他と同様に実行」に該当する(scope 名は amadeus だが作業実体は #1170/#1172 の修正 — requirements.md Intent 分析「既文書化仕様への回復」)。skeleton-gate ステージの stance 分類は construction 進入時の engine round-trip(report --skeleton-stance)で「skip」相当を申告する。

## 実行規律

- worktree ベース = main、マージターゲット = main(org.md Construction 規律)。swarm(prepare → fan-out → check → finalize)の worktree 隔離を既定とし、conductor は c2 隔離文言+builder-prompt-sync-completion+deviation-stop-before-implement(既存様式準拠と判断する場合も停止 — deviation-applicability-not-solo)をディスパッチプロンプトに明記
- 各 Bolt 完了時に Bolt ブランチ切り出し+PR 発行を明示タスク化(bolt-pr-taskization)、PR 前 deslop+ローカル lcov 事前確認(local-lcov-pre-push)、スカッシュマージ
- C4 state 修復(unit-of-work.md「Unit 外の conductor 執行」)は Bolt 2 の live 検証(18/18 実測)前に conductor が record チェックポイントで執行(ADR-3)
- 検証コマンド列: Bolt 1 = typecheck/lint/dist:check/promote:self:check/tests+lcov、Bolt 2 = typecheck/lint/tests(team-practices.md の適用プラクティス写像)
