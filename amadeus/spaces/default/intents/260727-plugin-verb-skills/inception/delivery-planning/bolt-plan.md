# Bolt Plan — 260727-plugin-verb-skills

上流入力(consumes 全数): requirements.md(FR と受け入れ基準)、components.md(規模)、unit-of-work.md(U1〜U4)、unit-of-work-dependency.md(DAG と交差材料)、unit-of-work-story-map.md(ジャーニー対応)、team-practices.md(worktree・PR 規律)

## Bolt 編成(1 Unit = 1 Bolt = 1 PR)

| Bolt | Unit | 内容 | ゲート |
|---|---|---|---|
| 1 | u1-plugin-handler-skeleton | `/amadeus plugin <verb>` ハンドラ+usage 三重同期+テスト | **walking skeleton — 単独実行・ユーザー明示承認後に残 Bolt へ**(amadeus-feature Mandated+org.md) |
| 2 | u2-install-verb | install verb+冪等コピー+INSTALL 文言+5ケーステスト | ラダープロンプト裁定に従う |
| 3 | u3-runner-gen-plugin | plugin 識別焼き込み+runner 生成/prune+対称配線+fixture/E2E | 同上 |
| 4 | u4-skill-docs | スキル全7面+19-plugins EN/JA | 同上(終端 — Bolt 2/3 の着地後) |

## シーケンス裁定(2.7 から委譲された材料の確定)

- **Bolt 2 と Bolt 3 は並行とする**(ユーザー裁定 2026-07-28 — 初版の直列裁定を改訂)。amadeus-plugin.ts の交差は小さく(U3 は spawn 配線数行)、worktree 隔離+後着側の rebase 吸収で扱う(c6 の実 diff 再評価を後着側のマージ前に必ず実施)。同時アクティブ builder 上限は 2 へ緩和(規範上限4の内)
- Bolt 4 は DAG どおり終端
- 各 Bolt は git worktree 分離で実装(solo-bolt-worktree-required)、`main` ベース・`main` ターゲットのスカッシュマージ

## Bolt 別の完了条件(共通)

typecheck / lint / dist:check / promote:self:check / 関連テスト green+local lcov で新規行未カバー 0 → deslop → PR 発行 → CI green → ユーザーマージ承認(no-AI-merge)。工程記録はチェックポイントコミットで本線へ(実装 PR に同乗させない)。
