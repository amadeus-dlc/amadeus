# Bolt Plan — 260807-stage-perf-report

上流入力(consumes 全数): requirements(FR/NFR を Bolt DoD の正本として消費)、unit-of-work(U1 stage-stats-cli の定義・複雑度 M を Bolt 内容として消費)、unit-of-work-dependency(エッジなし DAG を単一 Bolt 編成の根拠として消費)、unit-of-work-story-map(FR→U1 全数写像を Bolt スコープ検証に消費)、components(C1〜C9 の実装順トポロジーを Bolt 内実装計画の参照として消費)。stories / mockups / team-practices は本スコープで生成されていない(user-stories・refined-mockups・practices-discovery は SKIP — 不在は設計上の欠落であり捏造補完しない。practices 面は memory 層の org/team/project.md を直接適用)

## Bolt 列(全 1 Bolt)

### Bolt 1: stage-stats-cli(walking-skeleton ゲート付き)

- **含まれる Unit**: U1 stage-stats-cli(kind: service — 唯一の Unit)
- **walking-skeleton マーカー**: あり — project.md Mandated「self-feature なら最初の Construction Bolt に walking-skeleton gate を維持」の執行。単一 Bolt のため「最初の Bolt」= 本 Bolt であり、そのゲートが walking-skeleton ゲートを兼ねる(Q1 = A 裁定、2026-08-07T15:44:04Z)
- **Definition of Done**:
  1. `packages/framework/core/tools/amadeus-stage-stats.ts` が FR-1〜FR-7 の全受け入れ基準を充足(除外バケット報告・fail-loud exit・決定的出力・read-only 不変条件を含む)
  2. twin テスト(t481 unit / t482 integration)が green、独立オラクル使用(自己参照比較なし)
  3. NFR-5 落ちる実証(除外バケット・fail-loud exit への失敗注入で赤の実働確認)を実施済み
  4. 現行 CI ブロッキング集合(typecheck / lint / 再現性検査 / source-only / グラフ不変量 / run-tests --ci / Project+Patch Coverage Gate / complexity / no-silent-drop / cast-guard)を全て通過
  5. `bun run build` 後の全ハーネス投影が正常(NFR-4)、既存 t460/t461 green 維持(C-2)
  6. Bolt ブランチから PR を発行し §12a READY・収束ループ完了
- **確信仮説(confidence hypothesis)**: 「実コーパス(observed 222 シャード・131,074 行・record 691 ファイル)に対し、単一コマンドで決定的なステージ別性能基準線(net 中央値・p95・センサー赤率・モデル内訳)が 60 秒以内に出力され、idle 減算が退化しない弁別的ランキングを産出する」— 出荷はこの仮説を実コーパスで検証する
- **期待デモ**: 本リポジトリの実ワークスペースに対する `amadeus-stage-stats` 実行 1 回(Markdown 出力)+ `--json` 出力の決定性(2 回実行 byte 一致)提示

## 実行形態

- 単一 Bolt・逐次(Bolt 間並列なし — Unit 1 つのため)。ソロモードのため Bolt 実装は worktree 分離(cid:code-generation:solo-bolt-worktree-required)。ハーネスの worktree 隔離ガード下では cid:code-generation:c1-pcp-isolated-session-swarm-incompat の isolation 経路に従う
- Bolt 1 出荷後のラダープロンプト(org.md)は Bolt が 1 つのため発生しない(後続 Bolt なし)
