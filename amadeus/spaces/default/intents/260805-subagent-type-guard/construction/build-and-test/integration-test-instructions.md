# Integration Test Instructions — Issue #2279

**テスト戦略**: Comprehensive
**上流入力**: 3 Unit の `code-generation-plan.md` / `code-summary.md`

unit 層(別紙)が純関数の契約を固定するのに対し、integration 層は
**実 FS・実 hook 配線・実 CLI spawn** を跨いだ振る舞いを固定する。
この境界は U3 の `code-generation-plan` が
`cid:code-generation:fs-tests-integration-first` として明示している。

## 実行

```bash
bun test tests/integration/t452-subagent-observability.integration.test.ts \
         tests/integration/t454-subagent-model-attribution.integration.test.ts \
         tests/integration/t461-subagent-stats.integration.test.ts
```

前提は unit 層と同じ(`bun run build` 済みであること)。CPU 制約のある環境では
`--timeout 120000` を付ける。

## 対象と観点

### 許可集合の実 FS 解決 + completed hook — `t452`(10 件)

- `resolveAllowedAgentTypes` を実ディレクトリで駆動: 正常系 / `name:` 無しの skip /
  非 `.md` の除外 / **dir 不在の fail-open**(warnings へ縮退し throw しない)
- **AC-2(落ちる実証)**: 集合外の型を completed payload として hook へ流し、
  stderr advisory の発火と audit 行の `Type Verdict: outside-allowed-set` を実測
- 通る実証: persona 型 / builtin 型で警告ゼロかつ正しい verdict
- fail-open: agents dir 不在でも `SUBAGENT_COMPLETED` の emit が継続すること

### model 属性の両面配線 — `t454`(13 件)

- `resolvePersonaPin` を実 FS 6 ケース(basename ≠ `name:` の対照、重複時の先勝ちを含む)
- **AC-4**: 4 解決ケースを completed / started 両面で実測。harness ケースは
  **Codex の実 fixture(`payloads.json`)を注入**し、逐語断片の存在も assert する
- **AC-5**: model 供給の無いハーネス + 非 persona 型で `Model` / `Model Source` が
  **キーごと不在**であり、かつ行が書かれること(捏造値を作らない)
- started 面の fail-open(agents dir 不在)

### 集計 CLI と corpus sweep — `t461`(9 件)

- fixture corpus: 両スキーマ(v1 `event` / v2 `attributes.Event`)混在、parse 不能行、
  空 corpus。`SUBAGENT_COMPLETED` を本文に含む別イベント行を混ぜ、**部分一致の
  偽陽性**が起きないことを固定
- 実在シャードの読取失敗は計上 + stderr + **exit 非 0**(fail-loud)
- **AC-3 corpus sweep(両側実証)**: 実 corpus のバイトスナップショットに対し
  (0) 台帳と persona 名の衝突ゼロ
  (i) 許可集合内の型に警告分類が付かないこと
  (ii) CLI `--json` の verdict 計数が**被検 CLI を経由しない独立オラクル**の
  再計算値と完全一致すること
- 集合外行を注入すると `outside-allowed-set` が増える(落ちる実証)

## 外部依存の扱い

- **ネットワーク・DB・常駐サービスへの依存なし**。すべてローカル FS と子プロセス。
- corpus sweep は**測定時点のバイトスナップショット**に対して走る。実 corpus は
  追記され続ける動く値であり、CLI とオラクルが同一バイトを読むことで比較の race を
  排除する。実測値(persona 8 種など)を固定値として assert してはならない。

## 実測結果(本ステージ実行時)

| ファイル | 件数 |
|---|---|
| `t452-subagent-observability` | 10 |
| `t454-subagent-model-attribution` | 13 |
| `t461-subagent-stats` | 9 |
| **合計** | **32 pass / 0 fail**(584 expect) |
