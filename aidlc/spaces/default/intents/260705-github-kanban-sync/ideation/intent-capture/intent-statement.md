# Intent Statement — GitHub Kanban Sync（260705-github-kanban-sync）

対象 Issue: [#470 エージェント並行作業の可視化: Intent/Issue の GitHub kanban](https://github.com/amadeus-dlc/amadeus/issues/470)

## Problem Statement

複数エージェント（複数 worktree）での並行自己開発が定着したが、「どの Intent / Issue をどのエージェントが作業中か」を横断的に把握する手段がない。
現状の把握手段は `aidlc/spaces/<space>/intents/*/aidlc-state.md` の横断 grep だけであり、一覧性がない。

主課題は担当状況の不明（どの Intent / Issue をどのエージェントが、どのホストで作業中か分からない）である。
従課題として、承認待ちゲート（`[?]`）の滞留を検知できないことを併せて扱う（intent-capture-questions.md Q1 = E）。

前提として、Intent と GitHub Issue の構造的な紐付けが正準台帳 `intents.json` に存在しないという台帳ギャップがあり、これは解決手段の前提整備として本 Intent の範囲に含める。

## Target Customer

主要な利用者は Maintainer（人間、ゲート審査官）だけである（Q2 = A）。

- Maintainer は、並行運用ポリシー（team.md）のゲート審査官として、承認待ちキューと並行作業の全体像を GitHub 上で一覧できるようになる。
- エージェントは利用者に含めない。エージェントは従来どおりローカル成果物（正）を読んで並行可否を判断し、遅延を含む鏡（kanban）を判断材料にしない。

## Success Metrics

intent-capture-questions.md Q3 の回答（A、B、C、D、X）に基づく。

1. **一覧性**：進行中の全 Intent について、担当エージェント、phase / stage 状態、worktree、実行ホスト（host-clone 識別子）、紐付く GitHub Issue が kanban から一覧できる。
2. **確認時間の短縮**：並行可否判断と承認待ち確認が、`aidlc-state.md` の横断 grep より短時間で済む。
3. **放置ゲートの発見**：承認記録の取り残し（放置ゲート）を kanban 上で発見できる。
4. **自動追従**：手動同期の操作なしで board が実況に追従する（hook 起動 sync が機能する）。

## Initiative Trigger

複数 worktree の並行運用（Intent 単位の並行、フェーズパイプライン）が team.md の並行運用ポリシーとして定着した一方、把握手段が横断 grep のままであるため（Q4 = A）。
衝突事故の実発生が起点ではなく、定着した運用と把握手段のギャップが起点である。

## Initial Scope Signal

scope は **feature**（Standard 深度）である。

本 Intent で扱う範囲は、Issue #470 の実施候補 ①〜③ である（Q5 = A）。

1. 台帳整備：`intents.json` への `issues` フィールド追加と既存 entry の遡及補完。
2. `dev-scripts/kanban-sync.ts` の手動実行版：全 space の `aidlc-state.md` と `intents.json` をスキャンし、GitHub Projects v2 へ冪等反映する。
3. hook 結線：PostToolUse でのキュー書き込みと `Stop` / `SessionEnd` での flush（デバウンス構成）。

段階ごとに別 PR とする。④ GitHub Actions による merge 後の整合回復は後続 Intent とする。

## 技術文脈（architect 視点の補足）

- GitHub 上の kanban は表示専用の鏡とし、正はローカル成果物（`intents.json` と `aidlc-state.md`）に置く。GD009（人間向け一覧は `intents.json` から都度生成する）と整合させる。
- 作業は未 push の worktree で進むため、実況の反映はローカル hook からの push が必須である。
- ホスト識別は audit shard 名（`<host>-<clone>` 形式）から取得できる。
- 現在の `gh` トークンには `project` scope がなく、Projects v2 操作の前に `gh auth refresh -s project` が必要である。
