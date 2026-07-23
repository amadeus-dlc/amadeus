# Code Summary — U1 boundary-guard

> 上流入力(consumes 全数): code-generation-plan、business-logic-model、business-rules、domain-entities、logical-components、security-design、reliability-design(FD/ND 確定設計の実装転写)

## 実装ファイル一覧

| ファイル | 役割 | 本番/テスト |
|---|---|---|
| `tests/lib/boundary-guard.ts` | 述語1/述語2・`AllowRule`+`parse`・`SCAN_ROOTS`・`fileMatchesGlob`・`Result` の**唯一の正本定義**(FS 非接触の純ロジック、BR-7 canonical 1定義) | テスト補助(非 .test.ts) |
| `tests/unit/t258-boundary-guard.test.ts` | 上記シンボルを**再 export** し、入力データ駆動で純関数を検証(mechanism: none) | unit |
| `tests/integration/t258-boundary-guard.integration.test.ts` | git-tracked 実 FS 走査 + live 適用 + corpus sweep + fixture 落ちる実証 | integration |
| `tests/fixtures/boundary-guard/skill-with-scripts-ref.md` | `scripts/` 参照を含む SKILL 断片(述語1 fixture 赤の実証入力) | fixture |
| `tests/fixtures/boundary-guard/duplicate-scenario/scripts/amadeus-shared-asset.ts` | 述語2 両実在シナリオの scripts/ 側(basename 衝突) | fixture |
| `tests/fixtures/boundary-guard/duplicate-scenario/canonical/amadeus-shared-asset.ts` | 述語2 両実在シナリオの正本側(basename 衝突) | fixture |

**本番コード(`packages/framework/`)への変更はゼロ**(logical-components 配置根拠どおり全て `tests/` 側)。

## 検証コマンドと exit code

| コマンド | 結果 | exit |
|---|---|---|
| `bun test tests/unit/t258-boundary-guard.test.ts` | 20 pass / 0 fail(37 expect) | 0 |
| `bun test tests/integration/t258-boundary-guard.integration.test.ts` | 4 pass / 0 fail(7 expect) | 0 |
| `bun test <両ファイル>` | 24 pass / 0 fail(二重登録なし) | 0 |
| `bun run typecheck`(`tsc --noEmit` ×2) | エラーなし | 0 |
| `bun run lint`(Biome) | 自ファイル3件 "No fixes applied"(clean)。既存の advisory 警告 250 件は事前存在で本変更由来ゼロ | 0 |

補足: 本 worktree に `node_modules` が未展開だったため `bun install --frozen-lockfile` を実行(257 packages)。`bun.lock`・`package.json` の tracked 差分は**なし**(git status 実測で確認)。

## live 赤の実測(落ちる実証 — BR-4/FR-5b)

integration の `[t258 live-red]` 出力(実行時に stdout へ記録):

- **contrib election findings: 6 件**(residual = 0)
- 所在:
  - `.agents/skills/amadeus-election/SKILL.md:11` `compatibility: Requires bun and this repository checkout (scripts/amadeus-election.ts).`
  - `.agents/skills/amadeus-election/SKILL.md:21` `bun scripts/amadeus-election.ts open --file <definition.json>`
  - `.agents/skills/amadeus-election/SKILL.md:31` `bun scripts/amadeus-election.ts next --election <id>`
  - `.claude/skills/amadeus-election/SKILL.md:11`(同上)
  - `.claude/skills/amadeus-election/SKILL.md:21`(同上)
  - `.claude/skills/amadeus-election/SKILL.md:31`(同上)

この 6 件が「既知の未解消集合(contrib SKILL 由来)」= expected-red。integration テストは `isKnownContribSkill` でこれらを一時隔離し、**それ以外 residual = 0** を assert してテスト自体は green を保つ。U2(同 Bolt)が SKILL を promoted core 呼び出しへ書き換えると `isKnownContribSkill` は 0 件一致になり、residual assertion は 0 のまま成立して**テスト無変更で完全 green**に到達する(TODO を expected-red 定義直上に根拠付きで明記済み)。CI へは Bolt PR(U1+U2 同乗)で green 状態のみが乗る。

### corpus sweep(FR-5c/BR-6)

tracked 配布ツリー(SCAN_ROOTS 12面)を `git grep -lE scripts/` で候補抽出(43 ファイル)。tracked トークン全域は既知9種のみ:`scripts/package.ts`(21)/ bare `scripts/`(13)/ `scripts/team-up.sh`(11)/ `scripts/forbid`(11)/ `scripts/onboarding.ts`(9)/ `scripts/manifest-types.ts`(9)/ `scripts/amadeus-election.ts`(6)/ `scripts/promote-self.ts`(5)/ `scripts/package-codex.ts`(1)。うち election 以外の 80 件を id 付き AllowRule 4本で免除(build-tooling / team-up / forbid / bare-mention)し**偽赤 0** を実測。

### fixture 赤の実証(常時 green の証明テスト)

- 述語1: `skill-with-scripts-ref.md` を空 allowlist で走査 → Finding > 0(検出)。
- 述語2: `duplicate-scenario/{scripts,canonical}` の basename 衝突 → `findDuplicatedAssets` が `["amadeus-shared-asset.ts"]` を返す(両実在 red)。
- 述語2 live: `scripts/` 直下資産 vs `core/tools`+`core/skills` basename の積集合 = `[]`(現状 green、コピー残置なし)。

## 逸脱申告(deviation-stop-before-implement / implementation-deviation-election)

**1件あり — 要 reviewer 裁定。**

- **内容**: ND `logical-components.md` は述語・型・`SCAN_ROOTS` の実装位置を「`tests/unit` の新設テストファイル内 export」と規定するが、正本定義を **`tests/lib/boundary-guard.ts`(非 .test.ts 共有モジュール)**へ置き、unit twin から**再 export** する構成に精密化した。
- **停止して申告する理由(既存様式への準拠と判断する場合も停止対象の規律に従う)**: `.test.ts` を別 `.test.ts` から import すると Bun は次のいずれかになり、どちらも不可:
  1. 素の import → 被 import 側の `describe/test` が二重登録(フルスイートで unit テストが2回走る)。
  2. `import.meta.path === Bun.main` ガード付き → 複数ファイル/ディレクトリ実行時に `Bun.main` が単一エントリに解決されるため unit twin が**無音スキップ**(検証劇場 Forbidden の偽 green)。
  実測(`/tmp` 隔離スクリプト): 単一実行はガードで 1 pass だが、`bun test unitFile intFile` では `Bun.main` が integration 側に解決され unit-a が登録されず 1 pass のみ = **unit が沈黙**。
- **精密化が満たす原則**: canonical 1定義(BR-7・construction guardrail「canonical な1定義から導出」)+ size purity(fs-tests-integration-first、unit は純関数のみ)を両立し、かつ設計の「unit twin から export 到達可能」面を**再 export で保存**する。両 twin は同一正本を参照し、二重登録も無音スキップも発生しない(24 pass の実測で確認)。
- **申告先**: FD `business-logic-model.md` は既に「component-methods C1 の `(roots, allowlist: RegExp[])` → `files` 配列 + id 付き `AllowRule` へ FD レベル精密化」を citation-semantics-check 準拠で申告済み。本件はその実装位置面の追加精密化。reviewer に本節での明示裁定を要請する。

## 決定性についての実装メモ(reliability-design 核の実現)

live 走査対象は **git-tracked ファイルのみ**(`git grep`/`git ls-files`)。未 tracked の machine-local ファイル(例: `.claude/settings.local.json` — 絶対パスの session-hook で `scripts/session-*.sh` を参照)を除外することで、マシン間・CI 間の非決定性を排除する(settings.local は gitignore 済みで CI に存在しないため、tracked 限定が CI と一致)。これは reliability-requirements の「偽赤ゼロ・決定性」の実装手段であり、述語1出力は不変(findings を出しうるファイルは必ず `scripts/` を含む → `git grep -lE scripts/` の事前絞り込みは exact)。
