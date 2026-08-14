# Domain Entities — git-drift-plugin

上流入力: `component-methods.md` C5(DriftReport)、`business-logic-model.md`、`business-rules.md`、`unit-of-work.md` U3、`requirements.md` FR-DRIFT、`components.md` C5、`services.md` F2。スタイル: class-free、判別ユニオン(project.md Code Style)。

## エンティティ

### DriftReport(センサーの中心出力 — 判別ユニオン)

```ts
type DriftReport =
  | { readonly kind: "synced" }
  | { readonly kind: "info"; readonly behind: number }
  | { readonly kind: "warning"; readonly behind: number;
      readonly intersecting: readonly string[];        // origin∩作業の交差ファイル(ソート済み)
      readonly ledgerIntersecting: readonly string[] } // うち台帳系(優先提示)
  | { readonly kind: "skipped"; readonly reason: "fetch-failed" | "not-a-git-repo" | "no-origin";
      readonly detail?: string };
```

- ライフサイクル: 発火ごとに生成・出力(状態レス)。
- 不変条件: warning ⇒ intersecting 非空、ledgerIntersecting ⊆ intersecting。behind ≥ 1(info/warning)。
- **C5 契約との整合(是正記録)**: component-methods.md C5 の初稿は skipped reason に "throttled" を含んでいたが、承認済み ADR-5(fetch のみ skip・判定は毎回)によりスロットルは報告種別でなくなった(スロットル中も synced/info/warning を返す)。C5 側の署名を ADR-5 に整合させて "throttled" を削除・`detail?` を追記済み — 本ファイルの型が実装契約。

### GitDriftSettings(argv 受領 — U2 の ResolvedSettings 投影)

```ts
interface GitDriftSettings { readonly "fetch-throttle-seconds": number } // default 600(plugin.json 宣言)
```

- parse-don't-validate: argv の `--settings-json` を parse した時点で型を確定(不正 JSON は skip 扱いでなく loud エラー — C4 が正しい JSON を渡す契約のため、破れは契約違反として即失敗)。

### FetchThrottleRecord(機械ローカル)

```ts
interface FetchThrottleRecord { readonly lastFetchEpochMs: number }
```

- 置き場: **workspace 単位の機械ローカル** `amadeus/.amadeus-sessions/git-drift-fetch.json`(既存の gitignored 機械ローカルディレクトリ)。intent record 配下にしない理由: スロットルは workspace の git 状態に関する横断情報であり、intent 切替・並行で意図せずリセットされるべきでない(レビュー FOLLOW-UP の解消)。
- 破損・不在 → 「前回 fetch なし」として即 fetch(fail-open)。

### GitPort / ClockPort(テストシーム)

```ts
interface GitPort { run(args: readonly string[], cwd: string): { ok: boolean; stdout: string; stderr: string } }
interface ClockPort { nowMs(): number }
```

- 本番実装は spawnSync("git", ...) / Date.now 相当。fake はテスト側ヘルパーに置く(本番コードにテスト分岐なし — construction ガードレール)。

## 宣言エンティティ(plugin.json — C5 構成)

```
name: "git-drift" / stages: [] / seams: [{stage:"code-generation", seam:"sensors", entries:["git-drift"]}, {stage:"build-and-test", seam:"sensors", entries:["git-drift"]}]
sensors: ["sensors/amadeus-git-drift.md"] / tools: ["tools/amadeus-sensor-git-drift.ts"]
settings: { "fetch-throttle-seconds": { type:"number", default:600, description:"..." } }
```

sensor manifest frontmatter: id `git-drift` / kind・command(`{{HARNESS_DIR}}/plugins/git-drift/tools/amadeus-sensor-git-drift.ts`)/ default_severity `advisory` / matches(ステージ作業ファイル全般)/ timeout_seconds(fetch タイムアウトを内包する値)。timeout_seconds の確定基準(code-generation 段): 実 fetch 所要時間を 1 回実測し(ADR-5 の NFR-1 検証と同一測定)、既存センサーの宣言値(pr-convergence の 5 秒等)を対照に「実測所要時間 < timeout < ステージ作業を妨げない上限」の観測レンジ内側へ置く。
