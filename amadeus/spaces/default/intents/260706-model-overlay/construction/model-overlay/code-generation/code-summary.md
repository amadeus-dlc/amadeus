# Code Summary — model-overlay

上流入力: [code-generation-plan.md](code-generation-plan.md)

## 変更ファイル一覧

### 新規

- `dev-scripts/data/model-overrides.json` — overlay 宣言（初期宣言: `amadeus-architect-agent` / `amadeus-design-agent` = `fable`、fallback `fable -> opus`）。初回 apply 後は各 agent entry に `base: "opus"` が追記された状態でコミットする。
- `dev-scripts/apply-model-overrides.ts` — 適用スクリプト（適用関数 `applyModelOverrides` を export、CLI は `import.meta.main` ガード）。`readModelOverrideLine` / `setModelOverrideLine` も export し、`parity-check.ts` と eval から再利用する。
- `dev-scripts/evals/model-overlay/check.ts` — RED→GREEN の検証本体（9 系列 + 回帰 1 件）。
- `amadeus/spaces/default/intents/260706-model-overlay/construction/model-overlay/code-generation/code-generation-plan.md`
- `amadeus/spaces/default/intents/260706-model-overlay/construction/model-overlay/code-generation/code-summary.md`（本書）

### 変更

- `dev-scripts/parity-check.ts` — `checkEngineFiles` に overlay 逆変換正規化（`loadModelOverlay` / `normalizeModelOverlay`）を追加。base 記録済み・実値が管理値集合と一致する場合のみ base へ置換して hash 比較する（BR-9）。base 未記録時はヒント付きで通常比較する（FR-1.4）。
- `dev-scripts/promote-skill.ts` — 最終段（`!options.dryRun` ガード）で `applyModelOverrides(root)` を呼ぶ前方互換フックを追加。
- `.agents/amadeus/tools/amadeus-utility.ts` — `handleDoctor` に model overlay 乖離検査を追加（fail-open。overlay ファイル不在は静かにスキップ、読み取り失敗時は「model overlay state unknown」1 行、乖離時は agent ごとに警告）。
- `dev-scripts/data/parity-map.json` — `exceptions` に本変更（Issue #554）の理由を追記。`engineFileExceptions` は既存宣言（`tools/aidlc-utility.ts`）を流用し新規追加なし。
- `package.json` — `models:apply` / `models:check` / `test:it:model-overlay` を追加し、`test:it:all` 連鎖の末尾に組み込んだ。
- `AGENTS.md` — 「運用注意」節を新設し、上流同期後の `parity:check` → `models:apply` の順序を記載（BR-6）。
- `.agents/amadeus/agents/amadeus-architect-agent.md` / `amadeus-design-agent.md` — 初回 `models:apply` により `modelOverride: opus` → `modelOverride: fable` へ書き換え済み（frontmatter 1 行のみ）。

## RED → GREEN 実行ログ要約

1. **RED 確認**: `bun run dev-scripts/evals/model-overlay/check.ts` を eval 本体のみ書いた時点で実行し、`apply-model-overrides.ts` 不在によるモジュール解決エラー（`Cannot find module '../../apply-model-overrides.ts'`）で失敗することを確認した。
2. **GREEN（apply 側）**: `apply-model-overrides.ts` 実装後、9 系列のうち (a)(b)(c)(f)(h) が GREEN、(d)(e)(i)（parity 側未実装）と (g)（doctor 側未実装）が FAIL のままであることを確認した（想定どおりの部分 GREEN）。
3. **GREEN（parity 側）**: `parity-check.ts` へ overlay 逆変換正規化を追加後、(d)(e)(i) が GREEN になった。
4. **GREEN（doctor 側）**: `amadeus-utility.ts` の `handleDoctor` へ overlay 乖離検査を追加後、(g) が GREEN になり、9 系列全件 GREEN（`model-overlay eval: ok`）を確認した。
5. **実装中に発見した回帰**: 実リポジトリで初回 `models:apply` を実行したところ、`dev-scripts/data/model-overrides.json` に `base` が記録されないバグを発見した。原因は bootstrap 判定（`entry.base === undefined` 分岐）が「実値が管理値集合に含まれない場合のみ base を記録する」という条件を持っていたため、実リポジトリの初期値 `opus` が偶然 fallback 先 `opus` と同値であったことから「既に適用済み」と誤認し、base を記録しなかったこと。
   - 修正: bootstrap 分岐では実値の内容によらず無条件に base を記録するよう変更した（base 未記録は「一度も apply していない」ことの唯一の証拠であるため）。
   - 回帰固定: eval に `(b regression)` を追加し、`git`（実ファイルではなく一時ファイルへの退避、`apply-model-overrides.ts` を旧ロジックへ一時的に書き戻す形）で遡及 RED を確認した（`FAIL: (b regression) ...`）。修正を戻すと GREEN（`model-overlay eval: ok`）に復帰することを確認した。

## 初回 apply の実施結果

```
$ npm run models:apply
model overlay apply: ok（適用: amadeus-architect-agent, amadeus-design-agent）
```

- `.agents/amadeus/agents/amadeus-architect-agent.md` / `amadeus-design-agent.md` の `modelOverride` が `opus` → `fable` に書き換わった（frontmatter 1 行のみ、他の内容は不変）。
- `dev-scripts/data/model-overrides.json` に各 agent の `base: "opus"` が記録された。
- 2 回目の `models:apply` は byte 同一（sha256 一致）で冪等性を実地確認した。
- `npm run models:check` は `model overlay check: ok` で pass する。

## parity:check / test:all の結果

```
$ npm run parity:check
parity check: ok（39 skills、199 engine files、基準 commit b67798c37c71855271b70882a33f47890d41f212）

$ npm run test:all
（typecheck → lint:check → contracts:check → parity:check → claude-wiring:check
  → grilling-wiring:check → issue-ref-contract:check → test:it:all
  → test:it:engine-e2e → diff:check まで全 pass。test:it:model-overlay を含む）
```

`test:it:promote-skill`（`promote-skill.ts` が非 dry-run 実行のたびに `applyModelOverrides` を呼ぶ変更を含む）も pass した。初回 apply 後は実ファイルが `fable` で安定しているため、`promote-skill.ts` からの再適用は冪等（差分なし）であることを確認済み。

## BR-6 の記載先

`AGENTS.md` の「運用注意」節（`## Review exclusion settings` の直後に新設）に、次の 1 文を記載した。

> 上流同期後に model overlay（`dev-scripts/data/model-overrides.json`、Issue #554）の反映を確認する場合は、`npm run parity:check` で乖離を確認してから `npm run models:apply` で再適用すること。

判断根拠: `docs/amadeus/` 配下（`aidlc-v2-difference-response-plan.md` 等）を実測したが、model overlay や dev-scripts の再適用手順を記す既存の恒久文書は見つからなかった（`260705-upstream-sync` は完了済み Intent record であり、恒久的な運用文書ではない）。team.md の責務分担が「AGENTS.md は現在の作業環境で Agent が従う操作指示を扱う」と定義しているため、BR-6 が候補として挙げた 2 択のうち AGENTS.md の運用注意を採用した。

## BR-11 の実測結果

`scripts/amadeus-install.ts` の `MANIFEST` を実測した。

- `MANIFEST.engineDirs`（`copyEngine` がコピーする唯一の対象）は `agents`, `amadeus-common`, `hooks`, `knowledge`, `scopes`, `sensors`, `tools` の 7 件で固定されており、`dev-scripts` は含まれない。
- `copyEngine` は `MANIFEST.engineDirs` を反復するだけで、それ以外の repo パス（`dev-scripts/` を含む）を一切参照しない。
- `copySkills` も `.claude/skills/amadeus*` と `.agents/skills/amadeus*` のみを対象にし、`dev-scripts/` には触れない。

結論: FR-1.3（配布物に含めない）は、許可リスト方式（コピー対象を列挙する側が `dev-scripts` を含まない）で構造的に担保されている。既存の `dev-scripts/evals/installer/check.ts` は `MANIFEST.engineDirs` の 7 件がコピーされることを網羅的に検証しており、コピー関数が `dev-scripts` を参照するコード経路自体が存在しないため、追加の eval 検査は不要と判断した（Simplicity First。存在しない経路を検査する追加テストは検出力を持たない）。

## Corrections c3 の対応

- `dev-scripts/data/parity-map.json` の `engineFileExceptions` は既に `tools/aidlc-utility.ts` を宣言済みであることを確認した（新規追加なし）。
- 同ファイルの `exceptions`（理由付き配列）に、本変更（Issue #554、model overlay の doctor 乖離検査追加）の理由を追記した。
- skills/ 正準ソースの実在確認: `grep -rl "handleDoctor\|amadeus-utility" skills/` を実行したが、`.ts` ファイルは 1 件もヒットせず、`amadeus-utility.ts` に対応する `skills/` 配下の正準ソースは存在しない（`.agents/amadeus/tools/` 配下にのみ存在するエンジン専用ファイルであり、いずれの skill の promote 対象にも含まれない）。したがって skills/ 側への反映は不要と判断した。

## 未解決事項

- なし。9 系列 + 回帰 1 件の eval、`models:apply` の実地適用、`parity:check` / `test:all` の pass をすべて確認済み。
