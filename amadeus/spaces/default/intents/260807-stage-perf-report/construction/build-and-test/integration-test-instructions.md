# Integration Test Instructions — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(FR-1/FR-6/FR-7 の実 FS・spawn 検証ステップを設計として消費)、code-summary(fixture 構成と exit ladder 実測の実績を対象として消費)

## 対象と配置

`tests/integration/t487-stage-stats.integration.test.ts` — **19 tests / 77 assertions**。実 FS fixture + in-process `main(argv)` + spawn による exit code 実測。

```bash
bun test tests/integration/t487-stage-stats.integration.test.ts --timeout=30000
```

## fixture が含む境界

一時ディレクトリに space ツリーを構築し、次を混在させる:

- **二世代スキーマ**(v1 `event`/`fields` と v2 `eventName`/`attributes`)
- **破損行**(JSON として decode 不能)
- **読取不能シャード**(dangling symlink — ディレクトリ注入は macOS/Linux で挙動が割れるため使わない、cid:code-generation:bun-readfilesync-dir-platform-divergence)
- **退化した `intentId:"intents"`**(パス由来帰属の検証)
- **未クローズ AWAITING**・**0 秒窓**・**重複 idle 区間**
- **接尾辞付き Review 見出し**・**`{unit-name}` リテラルディレクトリ**
- **`Stage slug` ≠ `Stage`** の混在行・**Model 有無**の混在

## 検証する境界

| 境界 | 内容 |
|------|------|
| `scanCorpus` | 二世代が集計に載る / 破損行計数 / パス由来帰属 / 不在ツリーは空コーパス(クラッシュしない) |
| `collectReviewBlocks` | 正規見出し → ブロック、接尾辞付き → unparseable 計数 |
| `main` パイプライン | measurement ref 先頭・仮説明記・JSON の層別恒等・**3 形すべて 2 回実行 byte 一致**・実ワークスペースの 60 秒上限 |
| exit ladder(spawn 実測) | 正常 0 / 読取不能シャード 1 / 未知フラグ 2。`timeout: 60_000` + `SIGKILL` 付き |
| resolution seam(in-process) | `--project-dir` / `CLAUDE_PROJECT_DIR` / cwd / active-space fallback |
| read-only 不変条件 | fs write API import 0 件(型 import は除外)+ 実行前後で space ツリーが byte 不変 |

## 環境

一時ディレクトリは `afterEach` で全削除。リポジトリの実ワークスペースは read-only 走査のみ(NFR-1 実測に使用)。
