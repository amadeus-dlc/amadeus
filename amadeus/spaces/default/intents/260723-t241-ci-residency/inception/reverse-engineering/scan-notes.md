# Reverse Engineering スキャンノート — 260723-t241-ci-residency(bugfix)

対象バグ: GitHub Issue #1294 — `tests/e2e/t241-election-machine-executor.test.ts` のヘッダが「CI-resident」(FR-0 機械実行器の常時証明、ADR-6 layer (i))を自称するが、PR CI は e2e 層を実行しない。

## 1. 実行メタデータ

| 項目 | 値 | 取得コマンド(measure ref) |
|---|---|---|
| date (UTC) | 2026-07-23T00:57:42Z | `date -u +%Y-%m-%dT%H:%M:%SZ` |
| observed (現 HEAD) | `78bce87615b985d0151f604c915c6aab1d6ba9f1` | `git rev-parse HEAD` |
| base | `a81c11dde83e0059c48ecc912d2d22dd6bca60eb` | 前回 scan(260722-teamup-prompt-race)の observed |
| ancestry | exit 0(base は HEAD の祖先) | `git merge-base --is-ancestor <base> HEAD; echo $?` |
| distance | 35 | `git rev-list --count <base>..HEAD` |
| diff 規模(全体) | 224 files changed, 10774 insertions(+), 16 deletions(-) | `git diff --shortstat <base>..HEAD` |

### diff の内訳(measure ref: `<base>..HEAD`)
`git diff --name-only <base>..HEAD | sed 's#/.*##' | sort | uniq -c`:
- `amadeus/` 220(大半は前 intent 260722-teamup-prompt-race の record/audit + codekb re-scan + memory)
- `tests/` 3、`scripts/` 1

tests/scripts の変更(`git diff --name-status`):
- M `scripts/team-up.sh`
- M `tests/integration/t-team-up-codex-resume.serial.test.ts`
- M `tests/integration/t-team-up-msg-backend.test.ts`
- A `tests/integration/t-team-up-watcher-arming.test.ts`

### ★重要: 本バグ面は base..HEAD で無変更
`git diff --numstat <base>..HEAD -- tests/e2e tests/run-tests.ts tests/run-tests.sh tests/gen-coverage-registry.ts .github/workflows package.json` → **0 行(出力空)**。
→ 本バグの欠陥コード(t241 の配置・CI tier 定義・ワークフロー)は base より前に導入済みで、差分リフレッシュ区間に一切変更がない。原因所在は intent 260718-election-ts-foundation(導入 PR #1235)であり、本区間の 35 コミットとは無関係。差分リフレッシュとしては「バグ面ドリフトなし」を確定。

## 2. 重点面ごとの実測

### 面1: t241 のヘッダ主張とテスト構造(`tests/e2e/t241-election-machine-executor.test.ts`)

ヘッダ verbatim(:1-7):
```
// t241 — FR-0 machine executor (ADR-6 layer (i), CI-resident, Bolt 4).
// An LLM-free TS loop that reads each `next` directive and executes EXACTLY the
// verb/report it names — zero election knowledge lives in this file. If the
// loop completes, the directive stream alone carried the election, which is the
// strongest standing proof of FR-0 (the acceptance-demo subagent run is layer
// (ii), one-shot, not in CI). Doubles as the consumer contract test for the
// directive schema (stdout-only parse).
```
→ :1 が明示的に「**CI-resident**」を自称。:4-5 が「strongest **standing** proof of FR-0」= 常設保証を主張。しかしファイルは `tests/e2e/` に配置。

テスト構造(実測):
- spawn 型: `import { spawnSync } from "bun"`(:9)、`spawnSync(["bun", SCRIPT, ...])`(:20)で `scripts/amadeus-election.ts`(:14)を子プロセス起動。
- fs 依存: `mkdtempSync`/`mkdirSync`/`writeFileSync`/`rmSync`(:10, :62-63, :109)で一時 projectDir を作成。
- テスト2件: E-EXEC1(zero-confirm open→done、:91-111)、E-EXEC2(hold→hold-resolved→done、:113-140)。guard=30 回ループ(:35, :37)。
- 依存 fixture: 外部ファイルなし。def.json/b1.json を実行時に自前生成(自己完結)。
- 実行時間: 本 RE では未計測(--e2e/--release 実行は規律上のバックグラウンド長時間実行回避のため未実施)。spawnSync×最大30回×2テストの CLI 起動オーバーヘッド依存。**不確定事項**(§4)。

t237(同一 e2e tier)の同型状況 — ヘッダ verbatim(`tests/e2e/t237-election-walking-skeleton.test.ts`:1-5):
```
// t237 — FR-0 walking-skeleton demonstration over the real CLI (Bolt 1).
// Layer: e2e — spawns `bun scripts/amadeus-election.ts` exactly as an AI (or
// the Bolt 4 machine executor) would, proving the directive loop alone carries
// a zero-confirm election from open to recorded. Coverage of the wiring lines
// is owned by the in-process t236 (spawn is a bun --coverage blind spot).
```
→ t237 は「**Layer: e2e**」と正直に宣言し、**CI-resident を自称しない**。よって t237 は本バグの対象外(矛盾なし)。矛盾は t241 単独(e2e 配置 × CI-resident 主張)。

### 面2: テスト層・tier 機構(`tests/run-tests.ts`, `package.json`)

profile flag 定義(verbatim, run-tests.ts):
- Usage banner :124-127:
  ```
  (default)       smoke + unit + integration
  --ci            smoke + unit + integration
  --release       smoke + unit + integration + e2e
  --all           Same as --release
  ```
- `--ci` 実装 :197-202 → `runSmoke/runUnit/runIntegration = true`(**runE2e を立てない**)。
- `--release`/`--all` :203-211 → 上記 + `runE2e = true`。

package.json test scripts(:14-16):
```
"test:all":     "bun tests/run-tests.ts --all",
"test:ci":      "bun tests/run-tests.ts --ci",
"coverage:ci":  "bun tests/run-tests.ts --ci --coverage --coverage-dir coverage",
```
→ `test:ci`/`coverage:ci` はいずれも `--ci`(e2e 非実行)。e2e を走らせるのは `test:all`(=`--release`)のみで、これはローカル手動起動用。

size purity 機構(`tests/unit/t-test-size-drift.test.ts` + `tests/lib/test-size.ts` の `classifyTestSize`):
- scope 別 MAX サイズ(:161-166 verbatim):
  ```
  smoke: null,        // sized OUT of the pyramid axis
  unit: "small",
  integration: "medium",
  e2e: "large",
  ```
- ヘッダ規約 :142-145: `unit → small only`(spawn/fs は tier を超過)、`integration → up to medium`、`e2e → large allowed`。
- `classifyTestSize` の signals(t-test-size-drift.test.ts :66-69 実測): `node:fs` 呼び出し → **medium**、`child_process`/`spawn` → **medium**、`fetch`/net → large。
- gate 適用範囲: 違反判定は scope の MAX 超過(:193)。unit のみ ratchet allowlist で grandfather(:198-209)。**integration は medium まで許容**(超過にならない)。

### 面3: `.github/workflows/ci.yml`(e2e 不在の実測)

test 実行ステップ(grep 実測):
- :114 `run: bun run test:ci -- -P 4`
- :152 `run: bun run coverage:ci -- -P 4`
- :227 `run: bun run coverage:ci -- -P 4 || status=$?`(base coverage 比較用)
→ **ci.yml に `--e2e` / `--release` / `test:all` は 0 ヒット**。トリガーは :8 `push: branches:[main]` + :13 `pull_request`。よって PR/main push とも e2e 層(t241/t237)は走らない。

release.yml(実測): test 実行ステップなし(release-it publish のみ、:56 runs-on、:154 tag ロジック)。**e2e は release.yml でも走らない**。

formal-verification.yml(実測): トリガーは :12 `workflow_dispatch` のみ(:3 コメント「pull_request でないので通常 CI band に影響しない」)。:17 macos-15 + JDK(TLA+ skeleton)。**e2e テストランナーとは無関係**。

結論: e2e 層(t241 含む)は **自動 CI(ci.yml / release.yml / formal-verification.yml)のいずれでも実行されない**。t241 の「CI-resident/standing proof」主張は実行実態と矛盾する。

### 面4: 移設影響面(候補1 = t241 を integration へ移設)の実現可能性

- size purity: t241 は spawnSync + fs → `classifyTestSize` = **medium**。integration の MAX = medium(:164)。→ **移設で purity 違反なし**(clean)。unit へ移すと small 違反になるが、対象は integration であり適合。
- ★★ 強い既存 precedent: `tests/integration/` に **amadeus-election.ts を spawn する兄弟テストが 6 ファイル既存**(`grep -rln amadeus-election tests/integration | wc -l` = 6): t235-election-store, t236-election-loop, t240-election-transport, t242-election-skill-vocabulary, t244-election-tie-choice(+ t-formal-verif-arm-s-blind)。t241 と同じ「CLI を spawn する election テスト」が既に integration tier で `--ci` により CI 実行されている。→ 候補1は既存様式そのままの移設。
- ★★★ 決定的: **ADR-6(design)が layer (i) を integration テストと明記**(§6 参照)。t241 の e2e 配置は ADR-6 からの実装逸脱であり、候補1(integration 移設)は設計本来の配置への回復にあたる。
- coverage registry(`tests/gen-coverage-registry.ts`)への影響: t241 は registry に **未登録**(`grep t241 gen-coverage-registry.ts` = 0 ヒット)。registry は UNIT-surface 生成器で `covers:` claim を走査(:4-8, :113 コメント「This UNIT-surface generator...」)。wiring 行の coverage は in-process の t236(integration tier)が所有(t237 ヘッダ :4-5 が明言、spawn は bun --coverage の盲点)。→ 移設で registry の再生成が必要か否かは t241 が covers claim を持つかで決まるが、現状 registry 非参照のため**影響は小さい見込み**(移設後に `covers:` を書く場合のみ registry 再生成)。
- 実行時間(integration 予算): integration tier は `--ci` に含まれ、既に t235/t236/t240/t242/t244 の spawn 型 election テストを収容。t241 追加の増分は同型テスト1本相当。**具体秒数は未計測**(§4)。

### 面5: CI コスト面(候補2 = ci.yml に e2e ジョブ追加)

- e2e ファイル数(measure ref: 現 HEAD): `ls tests/e2e/*.test.ts | wc -l` = **75 ファイル**。
- e2e には TUI 駆動(@xterm/headless, node-pty)・worktree・フルライフサイクルの重量テストが含まれる(run-tests.ts :1178-1204 の e2e パーティション処理、TUI preflight 分離 :1190)。--release は Usage banner で「(hours)」と明記(:148 `# All levels (hours)`)。
- → 候補2は 75 ファイルの e2e 層全体を PR CI に持ち込む形になり、コスト増が大きい。**t241 単独を CI に載せる目的には過剰**(1本のためにジョブ全体を追加)。e2e 内の1ファイルのみを選択実行する既存機構は run-tests に `--filter`(:152 例)があるが、ci.yml への e2e ジョブ新設 + フィルタ運用は新規配線。

### 面6: 上流意図(FR-0 二層証明・ADR-6 layer (i))

FR-0(requirements.md, 260718)verbatim:
> **FR-0: directive-driven・AI 無知識プロトコル** — 選挙プロトコルの正本は TS(状態機械+型+テスト)であり、AI は選挙手順の知識を持たずに完走できる。(…)
> **受け入れ基準**: 選挙ノルム(team.md の該当 cid 群)を一切参照しない fresh なセッション断面が、SKILL とツール指令のみで選挙1件(起票→配信→収集→開票→記録)を完走できることを **e2e で実証**する。fresh 断面の構成方法(ノルム import なしの subagent 等)は application-design で具体化する(申し送り)。

ADR-6(application-design/decisions.md :41-48)verbatim:
> **## ADR-6: FR-0 e2e の fresh 断面 = 機械実行器(CI 固定)+ノルム無参照 subagent(受け入れ実演)の2層**
> - **Decision**: 二層で実証する。**(i) CI 層(決定的・常設)**: テストコード内の機械実行器 — `next` の指令 JSON を読み、指令が名指しした verb を字義どおり実行し、`report` するだけの TS ループ(LLM 不在・選挙知識ゼロ)。これが選挙1件を完走できることを **integration テストで固定する**。(…)**(ii) 受け入れ実演層(1回・非 CI)**: (…)選挙ノルムを prompt に含めない subagent に SKILL 本文+ツールパスのみを与えて実選挙1件を完走させ、記録を成果物に残す
> - **Consequences**: FR-0 の常設保証は決定的テスト(CI)が担い、LLM 実演は一度きりの受け入れ証跡に留まる(flaky な LLM テストを CI に持ち込まない)。機械実行器は C6 の指令スキーマの consumer 契約テストを兼ねる
> - **Alternatives Rejected**: (a) LLM subagent e2e を CI に常設 — 非決定的・トークンコスト・NFR-3(決定性)と不整合 (b) 機械実行器のみで実演なし — (…)

★★★ **決定的な原因所在**: ADR-6 の Decision は layer (i) 機械実行器を「**integration テストで固定する**」と明記している。t241 の**ヘッダ自身も「ADR-6 layer (i), CI-resident」を自称**(:1)し、本文でも「fixed in ... integration」を意図した記述("consumer contract test")を持つ。にもかかわらず実装は `tests/e2e/` に配置した。→ 原因所在は「**設計(ADR-6)は integration を正しく指定していたが、実装(#1235)がその配置に従わず e2e に置いた実装逸脱**」。CI 実行範囲(--ci に e2e 非含有)との整合検証が欠落したため、CI-resident 主張が実行実態と乖離した。

補足の要件テキスト上の緊張: FR-0 受け入れ基準の文言は「e2e で実証する」と書くが、その具体化を application-design へ明示委任(「fresh 断面の構成方法は application-design で具体化する(申し送り)」)しており、ADR-6 が layer (i)=integration・layer (ii)=非CI subagent 実演へと二層化した。FR-0 の「e2e で実証」= layer (ii) の受け入れ実演(fresh session 断面)に対応し、layer (i) 機械実行器は ADR-6 で integration と確定。よって t241 の正しい tier は **integration**(ADR-6 が権威)。

## 3. 修正候補3案の実現可能性に効く実測事実(トリアージ用)

| 候補 | 実測事実 | 実現可能性評価 |
|---|---|---|
| (1) t241 を integration 層へ移設 | size purity: spawn→medium、integration MAX=medium で clean(面2/4)。既存 precedent: integration に election spawn テスト6本既存(面4)。**ADR-6 が layer (i)=integration と明記**(面6)。registry 非参照(面4)。 | **最有力。設計本来の配置への回復**。size purity・precedent・design authority すべてが支持。副次確認: t241 内の `// e2e` 相当のヘッダ文言・パス相対(`../../scripts`)の更新、ファイル名 suffix 慣習(`.integration.test.ts`、兄弟が採用)への整合。 |
| (2) ci.yml に e2e ジョブ追加 | e2e 75 ファイル(面5)、--release は「hours」(:148)。TUI/worktree 重量テスト含む(面5)。 | コスト増大。t241 1本のために e2e 層全体を PR CI へ持ち込む形で過剰。ADR-6 の「flaky な LLM テストを CI に持ち込まない」設計思想とも部分的に緊張(e2e には非決定要素あり)。 |
| (3) ヘッダ表明を release-tier へ修正 | FR-0 常設保証は ADR-6 Consequences で「決定的テスト(CI)が担う」と明記(面6)。 | 「常時証明(standing proof)」が弱まる。ADR-6 の「常設/CI 固定」要件に反し、設計意図を実装都合に合わせて後退させる方向。設計逸脱の追認になりうる。 |

## 4. 不確定事項

- t241 / e2e 層の実測実行時間(秒)は本 RE で未計測(規律上の長時間 --e2e 実行回避)。候補1の integration 予算増分・候補2の CI 増分見込みの定量化は要実測(`bash tests/run-tests.sh --e2e --filter t241` 等、別途)。
- 候補1でファイル名を `t241-*.integration.test.ts` へ改名する場合、参照(gen-coverage-registry の EXPECTED_NONE_TO_CLI、docs/reference/09-testing.md、他テストからの参照)への伝播棚卸しが必要か未確認(移設方式=改名 vs 単純ディレクトリ移動で影響範囲が変わる)。
- t241 が将来 `covers:` claim を持つ設計にするか(registry 登録要否)は未決 — 現状 t236 が wiring coverage を所有しているため t241 は契約テスト専任の可能性が高いが、要件・設計レベルの確認事項。
- FR-0 要件文「e2e で実証」と ADR-6「integration で固定」の文言差は、layer (i)/(ii) の二層化で解消されている(layer (ii)=fresh subagent 実演が FR-0 の "e2e" 文言に対応)と読めるが、修正 PR で requirements/design の traceability を明記するかは requirements-analysis で確定すべき。
