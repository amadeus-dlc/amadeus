# Unit of Work Dependency — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-methods.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/services.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/component-dependency.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/application-design/decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`

- `component-dependency.md` — U1/U2 の行域が非交差で共有可変状態を持たないこと、唯一の交差点が配布同期であることを引き、下記 DAG に依存辺を置かない根拠とした。
- `components.md` / `component-methods.md` — 各ユニットが触るコンポーネントと契約を引き、交差判定の対象目録とした。
- `services.md` — 外部サービスとの契約変化が両ユニットで独立していることを引いた。
- `decisions.md` — ADR-1〜5 のいずれもユニット間に順序制約を課さないことを確認した。
- `requirements.md` — FR/NFR の割り当てにユニット間の前後関係がないことを確認した。

測定 ref: HEAD `5c06db654`。

## 依存 DAG

```yaml
units:
  - name: u1-actas-migration
    depends_on: []
  - name: u2-worktree-parallel
    depends_on: []
```

**依存辺はゼロ。** 2ユニットは完全に独立して実装・出荷できる。

## 非交差の根拠（実測）

`component-dependency.md` の判定を再掲する。行域は `grep -n` + 終端 `}` 走査で機械確認済み。

| 面 | U1 | U2 | 交差 |
|---|---|---|---|
| 触る関数の行域 | `:860-894`（`claude_member_cmd`）/ `:1092-1102`（`watcher_verification_applies`）/ `:1174-1213`（`verify_watchers_armed`）/ `:1477-1480`（検証呼出ブロック — `watcher_status=0` の初期化行を含む）/ 定数 `:104`, `:108` | `:1241-1251`（`rollback_prepared_run`）/ `:1267-1311`（`create_run`）/ 定数（新設） | **なし** |
| 共有する可変状態 | `CLAUDE_MONITOR_PROMPT`（廃止） | `CREATED_MEMBERS`（廃止） | **なし**（別々の状態） |
| テストファイル | `t-team-up-watcher-arming.test.ts` / `t294-team-up-watcher-applicability.test.ts` | 新規のみ | **なし** |
| 外部サービス契約 | agmsg（初期プロンプトの形） | git（`worktree add` の並列呼び出し） | **なし** |
| 配布物 | `team-up.sh` の11コピー | 同左 | **あり（同一ファイル）** |

## 唯一の交差点: 配布同期

両ユニットは同一ファイル `packages/framework/core/tools/team-up.sh` を変更するため、**dist 6面 + self-install 4面の再生成が競合しうる**。

**解消方法**: 先に着地した PR のあと、後着 PR 側で `bun scripts/package.ts` と `bun run promote:self` を再実行し、`bun run dist:check` / `promote:self:check` の exit 0 を確認する。これは `cid:code-generation:code-generation:base-advance-regrounding`（実装完了後〜PR 発行前に origin/main が前進した場合の再接地）の定型手順そのものであり、新規の調整機構を要しない。

**テキスト行の競合可能性**: U1 は `:104` / `:108` 付近と `:860-894` / `:1092-1213` / `:1478-1483` を、U2 は `:1241-1311` を触る。定数群（`:104` / `:108` 付近）に U2 も `WORKTREE_PARALLELISM` を追加するため、**定数ブロックのみ textual conflict が起きうる**（`cid:code-generation:shared-ledger-insert-collision` の同型）。挿入位置を分散させるか、後着側で union 解消 → 再生成 → 検証再実行を行う。

## 実行順序

依存辺がないため**どちらから着手してもよい**。ただし優先度は #1476 が P1/S2-CRITICAL、#1478 が P2 であり、**U1 を先に着手する**（`cid:requirements-analysis:priority-vs-dependency`: 優先度がキューの並び順、依存関係が実行可能性の制約。ここでは依存制約がないため優先度がそのまま順序になる）。

U1 内部の作業順序は `intent-backlog.md` の B-3（待機設計の変更）を先頭とする — B-1/B-2（actas 移行）と独立に実装でき、先に入れておけば actas 移行で検証が再有効化されても起動レイテンシが退行しない。

## 並行実装の可否

依存辺ゼロのため理論上は並行可能だが、**同一ファイルを触るため直列化する**（`cid:code-generation:c6`: 交差する場合のみ直列化。ここでは dist 再生成面が交差する）。ソロモード運用でもあり、U1 → U2 の直列で進める。
