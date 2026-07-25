# Component Dependency — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/architecture.md`、`amadeus/spaces/default/codekb/amadeus/component-inventory.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/practices-discovery/team-practices.md`

- `requirements.md` — FR/NFR の対応関係を依存グラフの検証対象とした。
- `architecture.md` — launch シーケンス上の順序制約を引いた。
- `component-inventory.md` — 既存コンポーネント間の呼び出し関係を引き、変更が波及する範囲を確定した。
- `team-practices.md` — 配布同期が唯一の交差点であることの根拠とした。

測定 ref: HEAD `0b0c6e20a`。行域は `grep -n` + 終端 `}` 走査で機械確認。

## U1 の依存グラフ

```
member_role (:895-900, 既存・不変)
   ↑
member_bootstrap_prompt (新設)
   ↑                ↑                    ↑                   ↑
claude_member_cmd  watcher_verification  再送 (:1202)      回復ガイダンス (:1211)
(:860-894)         _applies (:1092-1102)    ↑                   ↑
   ↑                   ↑                 verify_watchers_armed (:1174-1213, 本体不変)
member_cmd         検証の呼び出し (:1478-1480 → mux_attach 後へ)
   ↑                   ↑
mux_new_session / mux_split       mux_attach (:513-515, 不変)
```

**依存の向き**: `member_bootstrap_prompt` は `member_role` にのみ依存する葉に近い純関数。4つの呼び出し元はすべて一方向にこれへ依存し、循環はない。

**FR-2 の充足**: プロンプト文字列を組み立てる箇所が `member_bootstrap_prompt` の1つに集約され、`CLAUDE_MONITOR_PROMPT` 定数は廃止される。

## U2 の依存グラフ

```
create_run (:1267-1311)
   │  worktree 生成ループ（並列度4へ）
   ↓
（成功: RUN_ROOT 配下に member ディレクトリが実在）
   ↑
rollback_prepared_run (:1241-1251)  ← 実在走査で対象を再導出
   ↑
handle_exit (:1253, 呼ぶ側・不変)
```

**現行の暗黙依存が切れる点**: 現行は `add` 成功（`:1305`）→ `CREATED_MEMBERS` 追記（`:1306`）が同一シェルの連続2行であることに依存し、`rollback_prepared_run` が `:1244` でそれを読む。並列化するとこの含意がサブシェル境界で切れるため、**依存を「台帳」から「ファイルシステムの実体」へ張り替える**（FR-7）。

これにより `create_run` → `rollback_prepared_run` の状態依存が消え、両者は `RUN_ROOT` という**共有された観測対象**を介してのみ関係する。

## U1 と U2 の交差

| 面 | 交差 |
|---|---|
| 触る関数の行域 | **交差なし**。U1 = `:860-894` / `:1092-1102` / `:1174-1213` / `:1478-1480`、U2 = `:1241-1251` / `:1267-1311` |
| 共有する可変状態 | **なし** |
| 配布物 | **交差あり** — 同一ファイル `team-up.sh` の11コピー。後着 PR 側で `bun scripts/package.ts` / `bun run promote:self` の再実行が要る |
| テストファイル | **交差なし**。U1 は `t-team-up-watcher-arming.test.ts` + 新規、U2 は新規のみ |

**結論**: 2 PR に分割して独立に着地できる（intent-capture Q1 = A の構造的裏付け）。唯一の調整点は配布同期であり、これは後着側の再生成で解消する。

## 外部依存

```
team-up.sh ──(read-only)──> agmsg: delivery.sh / watch.sh / actas-claim.sh / lib/actas-lock.sh
           ──(read-only)──> herdr: pane run / send-text / send-keys / session attach
           ──(呼び出し)───> git: worktree add / worktree remove
```

いずれも本 intent では**変更しない**。agmsg との契約は初期プロンプトの形が変わるのみ。
