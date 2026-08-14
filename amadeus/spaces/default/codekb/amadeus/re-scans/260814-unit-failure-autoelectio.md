# RE scan — 260814-unit-failure-autoelectio

**観測 ref**: observed = `cd64486a68c6a1144db50fbe3fde8273f5e18455`（`git rev-parse HEAD` = `git rev-parse origin/main`）。差分 base = `d7ffaa5442266508d8e67babc3e0b947fb4c1637`。

**base 選定根拠**: `reverse-engineering-timestamp.md` + `re-scans/*.md` の全 observed のうち **HEAD の祖先で距離最小**（`cid:reverse-engineering:rescan-base-ancestry`）。`git rev-list --count d7ffaa544..HEAD` = **4**、対抗候補 `5b12d96e9` は **5** であるため `d7ffaa544` を採る。

**Focus**: [GitHub Issue #2976](https://github.com/amadeus-dlc/amadeus/issues/2976) の患部（failure-ruling seam、election CLI 受け口、config スキーマ、stage-protocol の halt-and-ask 契約）+ `base..observed` の差分全域。

**Date**: 2026-08-14。**Scope**: `self-fix`、Brownfield、単一 repo `amadeus`、depth `Minimal`、build `bun`。

**副作用**: git 状態変更・GitHub 書込・engine/state ツール実行・コード変更はすべてゼロ。書込は `codekb/amadeus/` 配下のみ。

## Scan mode

通常の差分リフレッシュ。xrev differential scan mode は採らない。

判定の実測: クロスレビュー target-sha `52f1f1b2575ea35bd23b761697b2d17a5e9a7ac3` 以後に患部 4 ファイル（`amadeus-orchestrate.ts` / `amadeus-election.ts` / `amadeus-config.ts` / `stage-protocol.md`）へ触れたコミットは `git log --oneline 52f1f1b25..HEAD -- <患部4ファイル>`（exit 0）で **1 件のみ**:

```
d7ffaa544 [bolt-pr-attestation/...] Fix multi-Unit Delivery Bolt PR attestation (#2999)
```

`git show --stat d7ffaa544 -- <患部4ファイル>` は `packages/framework/core/tools/amadeus-orchestrate.ts | 175 ++++++++++++++++++++-`（167 insertions / 8 deletions）の 1 ファイルのみ。**患部の表現形式（スキーマ・セレクタ形式・ファイル様式）を変える移行は着地していない**ため、`cid:reverse-engineering:c5-xrev-currency-schema-migration` が言う currency 不成立の条件には当たらない。ただし `emitConstructionFailureIfPresent` の分岐は**行番号のみ移動**しており（クロスレビュー時 `:4063-4068` → HEAD `:4069-4075`）、以降の記述はすべて HEAD 断面で再解決した行番号を使う。

## base..observed の差分（全域）

取得: `git log --oneline d7ffaa544..HEAD`（exit 0）、`git diff --stat d7ffaa544..HEAD`（exit 0）。

コミット 4 件:

- `cd64486a6` docs(norms): coverage-patch-quick 標準化 (#3019)
- `fb1939dfd` chore(metrics): snapshot (#3020)
- `f60b3f4c8` fix(tests): copyTreeWithRetry (#3003)(#3015)
- `da0acecdd` chore(metrics): snapshot (#3017)

`diff --stat` 集計行の転記: `89 files changed, 3129 insertions(+), 4 deletions(-)`。着地面は `amadeus/spaces/default/`（codekb・elections・intents record）、`metrics/`、`tests/harness/fixtures.ts`、`tests/integration/t-fixtures-copy-tree-retry.integration.test.ts`、`amadeus/spaces/default/memory/project.md` のみ。**`packages/` 配下の変更は 0 件**であり、本 intent の患部にこの区間は一切触れていない。

## 主要発見

### 1. 患部の HEAD 断面 — 無条件 ask

`packages/framework/core/tools/amadeus-orchestrate.ts:4027` に `emitConstructionFailureIfPresent` を定義。`await-unit-ruling` 分岐は **HEAD で `:4069-4075`**、逐語:

```ts
  if (transition.kind === "await-unit-ruling") {
    const siblingSummary = transition.siblings.map((entry) => `${entry.unit}:${entry.outcome}`).join(", ") || "none";
    emit(askDirective(
      `Unit "${transition.target.unit}" failed during ${stageSlug} (attempt ${transition.target.attempt}, batch ${transition.target.batch}; siblings: ${siblingSummary}). Choose exactly one: Retry, Skip, or Abort. The answer is committed through the ordinary ask report path.`,
    ));
    return true;
  }
```

`askDirective` は `:1042-1044`。前段は parked 分岐（`:4056-4062`）と runtime population 絞り込み（`:4064-4068`、`failureOutsideRuntimePopulation` は `:4018-4025`）のみで、**config も autonomy mode も条件に入らない**。呼び出し元は `next` の両経路 `:3694`（in-flight 再入）と `:3737`（次ステージ前進）。

stage-protocol（`packages/framework/core/amadeus-common/protocols/stage-protocol.md`）は `:141` で「Halting is unconditional; who rules on the halt is decided by the solo auto-election hook below, **which names the one branch that does not present the prompt**.」、`:151` の branch 1 で「the blocker goes to an election **INSTEAD OF** the prompt below」「the prompt below is not presented」と規定。branch 2 は `:152`、question fenced block は `:156-166`。protocol の branch 1 は conductor 手続きとしてのみ書かれ、engine 側に対応する抑止が存在しない。

### 2. 不在実測の述語と exit code

`git grep` の不一致は exit 1、エラーは exit 2（`cid:reverse-engineering:c6-absence-predicate-exit-code` に従い述語を分割して実行）。

| 述語 | コマンド | 結果 |
|---|---|---|
| A2 | `git grep -inE "(^\|[^s])election" -- packages/framework/core/tools/amadeus-orchestrate.ts` | 出力 0 行、**exit 1** |
| B | `git grep -n "solo-election" -- packages/framework/core/tools/amadeus-orchestrate.ts` | 出力 0 行、**exit 1** |
| C | `git grep -n "soloElection" -- packages/` | **exit 0**、5 ファイル 7 行 |

C の全ヒット: `amadeus-config.ts:94`（型宣言）、`:772`（resolvedConfig 構築）、`amadeus-election.ts:459`（唯一の読取）、`amadeus-intent-autonomy-production.ts:834,910`、`amadeus-intent-autonomy.ts:802,956`（後 4 件は `soloElectionAvailable` — decide-question 梯子の capability フラグで別機構）。

語境界なしの `git grep -in "election" -- .../amadeus-orchestrate.ts` は exit 0 で 11 行返すが、すべて `selection` / `IntentSelectionSnapshot` の部分一致であり、election ドメインの参照はゼロ（A2 の語境界述語で確認）。

### 3. engine の config 読取能力は既存

- import: `amadeus-orchestrate.ts:241` `import { resolveAmadeusConfig } from "./amadeus-config.ts";`
- 3 引数（intent + space）: `:632`、invalid は `errorDirective` で fail-closed（`:633-643`）
- 1 引数: `:3940`（`emitConfiguredSwarm`）、invalid は `Invalid swarm configuration:`（`:3941-3944`）

`solo-election.trigger.mode` は `amadeus-config.ts:563-574` で `layers: ALL_LAYERS` / `defaultValue: "manual"` / legacy `auto-solo-election` として宣言（型 `:94`、解決 `:771-775`）。欠けているのは能力ではなく「engine がこの値を読む前例」だけである。

### 4. 裁定 commit 経路は変更不要

`report --user-input retry|skip|abort` の受け口 `:6161-6169` → `handleFailureRuling`（`:6507`）。ガードは `canonicalConstructionFailurePending`（`:3922-3936`）。サブコマンド直接動線は `:6973`。この経路は answer の出所を問わないため、election 裁定を `report --user-input <裁定>` として渡せば既存経路がそのまま使える。**修正の着地面は ask の抑止側だけで足りる**。

### 5. election CLI 側の受け口

`handleTriggeredOpen`（`amadeus-election.ts:443-463`）が `resolved.config.soloElection.trigger.mode !== "auto"` のとき `{opened: null, reason: "solo-election-manual-trigger-required"}` を **exit 0** で返す（fail ではない）。呼び出し側は exit code ではなく `opened === null` を見る必要がある。ここでの `resolveAmadeusConfig(projectDir)` は **1 引数呼出**で intent / space レイヤを渡していない。`handleOpen` は `:402-434`、`GoaLineCode.parse`（`^E-[A-Z0-9]+(-[A-Z0-9]+)*$`）は `:413-414`。definition スキーマは `amadeus-election-model.ts:100-116`（choices `:76-97`、voters `:107-108`）。

### 6. テスト棚卸し — P1/P2/P3 の交差は空集合

- P1 `git grep -ln "solo-election\|soloElection" -- tests/` → **exit 0**、17 ファイル
- P2 `git grep -ln -- "--trigger" tests/` → **exit 0**、5 ファイル（`t-exec-codex-autosolo-s13.serial`、`t236-election-loop`、`t269-election-solo-skill-template`、`t369-protocol-autosolo-hook`、`t432-config-vocabulary-drift`）
- P3（engine 側 failure ruling、いずれも exit 0）: `await-unit-ruling` → `t533-per-unit-consume-fanout.integration` / `t-construction-outcome-projection`、`resolve-failure` → `t211-swarm-batch-progress` のみ、`"Retry, Skip, or Abort"` → `t211-swarm-batch-progress` のみ

**P2 ∩ P3 = ∅**。「auto 設定下で unit failure がどう扱われるか」を engine 断面で検証しているテストは 0 件であり、これが本 Issue が緑のまま生存できた構造的理由である。

`t369-protocol-autosolo-hook.test.ts` の判定述語 `findMissingHookMarker`（`:88-92`）は protocol 文言の存在のみを検査し engine 挙動を拘束しない。テストは `:96` `:106` `:114` `:124` `:134` の 5 件 + fixture 系 3 件（`:178` `:197` `:211`）。対象パスに `dist/<harness>/amadeus-common/` と self-install ツリーを含むため、protocol 文言を触る修正は `bun run build` を同一変更に含めないと赤になる。

`t211-swarm-batch-progress.test.ts:326-333` は `amadeus/config.json` を seed しない（seed ヘルパ `seedFailedSwarmUnit` は `:239-280`）ため `manual` 期待としてそのまま維持でき、`auto` を植えた新ケース追加で TDD の Red を作れる。

`t236-election-loop.integration.test.ts:71-135` が `open --trigger auto` の 4 段階（unknown trigger / config 不在 / manual / auto）を実測する CLI 契約の正本。`:117` からは invalid config（`mode: "true"`）で exit 1 + `solo-election.trigger.mode expected manual | auto`。

## 更新した artifact

- `architecture.md` — 本 intent 節（三層の責務境界断裂、不在実測、能力と前例の区別、commit 経路、設計選択点、検証の空白）
- `code-structure.md` — 患部ファイル・テスト位置・投影連鎖
- `api-documentation.md` — ask directive / `report --user-input` / `open --trigger` / definition スキーマ / 指令ループ / config スキーマの各契約
- `component-inventory.md` — 実装・テストコンポーネント棚卸しと交差の空集合、未検証面
- `business-overview.md` — 業務影響（現在節。直前の `260814-fmc-macos-provider` 節は履歴へ降格）
- `code-quality-assessment.md` — 文言検査が挙動検査を代替している所見ほか 4 件
- `reverse-engineering-timestamp.md` — 共有 freshness pointer

**Reviewed-and-unchanged**: `technology-stack.md` / `dependencies.md`（`base..observed` に `packages/` 変更 0 件、依存・スタックともに不変）。本 intent の節を持たないため、後続はここから本 intent の事実を引かない（`cid:requirements-analysis:c4-consume-header-is-not-citable-content`）。

## 申し送り

- 設計判断が要る点は 3 つ。(a) engine は election を open できない（`amadeus-election.ts` 未 import、A2 exit 1）ため「ask を出さず conductor に election を回させる新種 directive」か「既存 ask に auto である旨のメタを載せる」かの責務境界選択 (b) `resolveAmadeusConfig` を 1 引数で呼ぶか 3 引数で呼ぶか（intent レイヤの有効性に直結） (c) protocol 文言を触るなら `bun run build` を同一変更に含める
- 本スキャンの未検証面: `amadeus-election.ts:137` `handleNext` / `:186` `handleReport` の内部指令生成ロジック（逐行未読）、`tests/e2e/t-exec-codex-autosolo-s13.serial.test.ts` と `tests/harness/autosolo-s13-fixture.ts` の内容（grep によるファイル特定のみ。§13 学習選定の auto 発動面であり本 Issue の halt-and-ask 面とは別類型）、`amadeus-construction-outcome*.ts` 系の射影ロジック（患部外）
