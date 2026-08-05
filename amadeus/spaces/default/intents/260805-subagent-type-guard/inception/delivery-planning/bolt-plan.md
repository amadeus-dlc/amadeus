# Bolt Plan

**上流入力(consumes 全数)**: `requirements`(AC-1〜6 — 各 Bolt の完了条件)/ `components`(C→Unit 割付と規模)/ `unit-of-work`(U1〜U3 の範囲・kind・完了条件)/ `unit-of-work-dependency`(bolt_dag の正: batches = [[u1], [u2, u3]])/ `unit-of-work-story-map`(リリース刻みの価値)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`。bolt_dag は compile 済み runtime-graph で非 null を実測(batches 2段)。

## Bolt 編成

| Bolt | Unit | kind | バッチ | ゲート | PR |
|---|---|---|---|---|---|
| **Bolt 1** | u1-detection-skeleton | library | batch 1(単独) | **walking-skeleton ゲート(実人間承認 — 本 intent のユーザー裁定 2026-08-06)** | Bolt 単位 PR(スカッシュ) |
| **Bolt 2** | u2-model-attribution | library | batch 2(Bolt 3 と並行可) | ラダー選択に従う | Bolt 単位 PR |
| **Bolt 3** | u3-subagent-stats | service | batch 2(Bolt 2 と並行可) | ラダー選択に従う | Bolt 単位 PR |

- **walking-skeleton(org.md / project.md § Walking Skeleton)**: scope `self-feature` は greenfield 要素(新設モジュール + 新設 CLI)を含むため Bolt 1 を単独・ゲート付きで実行し、ユーザーの明示承認後に残りへ進む。**訂正(2026-08-06 ユーザー裁定)**: 当初記述「グラント認可不可(project.md Forbidden)」は事実誤認 — 同 Forbidden は廃止済みの旧 standing grant を縛る規定であり、既決 canonical(#2067 現本文+#2253 ユーザー裁定 2026-08-05)は「walking-skeleton gate は **full だけが grant により自動承認できる**」と定める。そのうえで**本 intent はユーザー裁定(2026-08-06)により Bolt 1 ゲートを実人間承認で運用する**(full 発効中でもこの1点は AskUserQuestion で承認を取る — intent 固有の運用選択であり canonical の変更ではない)。
- **ラダープロンプト**: Bolt 1 出荷後に「残りの Bolt はどう実行しますか?(自律継続 / 全ゲート)」をユーザーへ提示し、選択を `amadeus-state.md` の Construction Autonomy Mode として永続化(org.md)。
- **worktree**: 各 Bolt は本 worktree 起点の Bolt worktree で実装(`cid:code-generation:solo-bolt-worktree-required`)。ベース = `260805-subagent-type-guard` ブランチ、マージターゲット = `main`(PR 経由)。
- **並行度**: batch 2 の U2/U3 は編集面が非交差(U2 = observability モジュール + lib/hook/registry、U3 = 新設 CLI)のため worktree 分離で並行可(上限は同時 builder 4 の枠内)。

## 各 Bolt の完了条件(requirements の AC を転記)

- **Bolt 1**: AC-1(純関数 in-process テスト)+ AC-2(落ちる実証)+ completed 面 fail-open テスト + `bun run build` 追跡ファイル不変 + PR CI ブロッキング集合 green
- **Bolt 2**: AC-4(4ケース)+ AC-5(欠落明示 + emit 継続)+ 同上の共通ゲート
- **Bolt 3**: AC-3(corpus sweep 両側実証)+ AC-6(実出力に測定 ref + unresolved 区分)+ 同上

## スケジュールとリソース

ソロモード(conductor + worktree 分離 builder subagent)。時間ボックスは設けない — 完了条件ベースで進め、各 Bolt の PR は `j5ik2o-gh-pr-converge-loop` で収束後、ユーザー承認マージ(no-AI-merge)。
