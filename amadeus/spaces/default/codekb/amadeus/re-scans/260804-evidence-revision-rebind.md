# RE 差分リフレッシュ記録: 260804-evidence-revision-rebind

上流成果物(consumes): なし。入力は intent state、[Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156) の本文とクロスレビュー verdict 2件(`XREV-2156-20260804`)、参考として [Issue #2153](https://github.com/amadeus-dlc/amadeus/issues/2153) 本文。Project Type は Brownfield、Scope は `self-fix`、Depth は Minimal。

## 実行メタデータ

- Date: `2026-08-04`
- Base commit: `498c3034a78bd432dc426f9f807b79c8ae980762`
- Observed commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`(= `origin/main`。`cid:reverse-engineering:c2-observed-mainline-commit` によりローカル merge でなく mainline 系譜のコミットを記録)
- Scope: `self-fix`、Brownfield、単一 repo `amadeus`、Depth: Minimal
- Scan mode: **xrev scan mode**(`cid:reverse-engineering:c1-xrev-scan-mode` / `c1-xrev-single-issue`)。クロスレビュー2名の verdict を Developer scan の一次入力とし、主要主張を verbatim スポット再実測で二重化した。

### 祖先性と差分区間(実測)

```
$ git cat-file -e 498c3034a78bd432dc426f9f807b79c8ae980762^{commit}   → exit=0
$ git cat-file -e 9458bbda85eb7257310a80882b4858dc6ce3d1fc^{commit}   → exit=0
$ git merge-base --is-ancestor 498c3034a78bd432dc426f9f807b79c8ae980762 \
                               9458bbda85eb7257310a80882b4858dc6ce3d1fc   → exit=0
$ git rev-parse origin/main   → 9458bbda85eb7257310a80882b4858dc6ce3d1fc
$ git rev-list --count 498c3034a..9458bbda8   → 11
```

区間の 11 コミット(`git log --oneline` からの転記):

`9458bbda8`(#2152) / `9e699ea79`(#2151) / `1f4498fcc`(#2150) / `3b3caf45c`(#2149) / `3972a5e01`(#2146) / `763ebf676`(#2142) / `7a51ace47`(#2141) / `52a082af7`(#2136) / `272cac2af`(#2138) / `dece5e59d`(#2137) / `a2f08658e`(#2127)

区間の変更規模は `git diff --name-only | wc -l` = **7283 files**。支配的な変更は `9458bbda8`(#2152)による生成物の Git 追跡除去(`git diff --name-status` の分類集計: `D dist` 3951 / `D .claude` 580 / `D .kimi-code` 578 / `D .codex` 552 / `D .opencode` 539 / `D .cursor` 536 / `D .agents` 94)。生成物・`amadeus/` record・`metrics/` を除いた実質変更は **227 files**。

### 行番号再解決の免除判定: **APPLIES(適用される)**

- 免除条件(`c1-xrev-single-issue` / E-OBB5-RES13): 「当該引用が observed と一致する SHA で検証済みであること」。両 verdict の HTML コメント `<!-- target-sha: 9458bbda85eb7257310a80882b4858dc6ce3d1fc -->` は observed と**同一**。したがって免除は適用される。
- ただし条件の**根拠が touch の有無ではない**ことを明示する。実測すると患部ファイルは base 区間で touch されている:

```
$ git diff --name-status 498c3034a 9458bbda8 -- tests/no-silent-drop tests/no-silent-drop-gate.ts \
    tests/integration/t413-no-silent-drop-ci-adoption.test.ts \
    tests/integration/no-silent-drop-repository-adoption.test.ts .github/workflows/ci.yml
M	.github/workflows/ci.yml
M	tests/integration/no-silent-drop-repository-adoption.test.ts
M	tests/integration/t413-no-silent-drop-ci-adoption.test.ts
M	tests/no-silent-drop/adoption-evidence-manifest.json
M	tests/no-silent-drop/adoption-evidence.json
M	tests/no-silent-drop/approval.json
M	tests/no-silent-drop/baseline.json
M	tests/no-silent-drop/evidence/adoption-runs.json
M	tests/no-silent-drop/exemptions.json
```

  touch があっても、レビュー対象 SHA == observed のため引用は observed 断面で有効である。

### 測定 ref に関する注意(後続工程向け)

本 intent の worktree(`worktree-bug-batch-a-state-integrity`、HEAD `668e88665`)は observed と**同一ではない**。patch 対象のうち以下は worktree と observed で内容が異なるため、**引用は必ず observed SHA から行うこと**(`cmp` による実測):

| ファイル | worktree vs observed |
| --- | --- |
| `tests/no-silent-drop/adoption-evidence.json` | DIFF |
| `tests/no-silent-drop/adoption-evidence-manifest.json` | DIFF |
| `tests/no-silent-drop/evidence/adoption-runs.json` | DIFF |
| `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` | DIFF |
| `tests/no-silent-drop/bootstrap.ts` | SAME |
| `tests/no-silent-drop/bootstrap-provenance.json` | SAME |
| `tests/no-silent-drop/repository-adoption-evidence.ts` | SAME |
| `tests/no-silent-drop/repository-adoption.ts` | SAME |
| `tests/no-silent-drop-gate.ts` | SAME |

本記録の file:line はすべて `git show "${OBS}:<path>"` で抽出した observed 断面のものである。

---

## 焦点1: 欠陥機序の確定 — リビジョンフィールドの所在と消費者

### 台帳3層の構造(observed 実測)

| 台帳 | リビジョンフィールド | 出現数 | 内訳 |
| --- | --- | --- | --- |
| `tests/no-silent-drop/adoption-evidence.json` | `currentRevision` | **24** | top-level 1 + receipt 23 |
| `tests/no-silent-drop/adoption-evidence-manifest.json` | `testedRevision` | **24** | top-level 1(`:609`) + evidence entry 23 |
| `tests/no-silent-drop/evidence/adoption-runs.json` | `testedRevision` | **25** | run レコード 25(top-level なし) |

いずれの出現も値は到達不能 SHA `3734885cbfc03aa97f655ca61da1cdd533fdea3e` である(`grep -c "$SHA"` が `grep -c '"…Revision"'` と全ファイルで一致)。

**リポジトリ全域では上記3ファイル以外に当該 SHA は存在しない**(測定 ref = observed):

```
$ git grep -c 3734885cbfc03aa97f655ca61da1cdd533fdea3e 9458bbda85eb7257310a80882b4858dc6ce3d1fc -- .
…:tests/no-silent-drop/adoption-evidence-manifest.json:24
…:tests/no-silent-drop/adoption-evidence.json:24
…:tests/no-silent-drop/evidence/adoption-runs.json:25
```

合計 **73 箇所**。

### 各フィールドを読むコードと効く検査

| フィールド | 読み手 | 効く検査 |
| --- | --- | --- |
| `adoption-evidence.json` top-level `currentRevision` | `t413…test.ts:157`(`git cat-file -e`)、`:159-163`(`git merge-base --is-ancestor`)、`:164`(`validateEvidenceRegistry(registry, registry.currentRevision)`)、`:168`(`git diff` の左端) | **到達性**(#2156 の患部)+ 鮮度 diff(#2153 の患部) |
| 同 receipt ごとの `currentRevision` | `repository-adoption.ts:182` `if (candidate.currentRevision !== expectedRevision) problems.push(\`receipt ${candidate.id} revision mismatch\`)` | registry 内部整合 |
| 同 receipt ごとの `evidenceDigest` | `repository-adoption.ts:183-187`(`expectedDigests.get(receiptId)` との一致) | 台帳↔manifest の digest 束縛 |
| manifest top-level `testedRevision` | `repository-adoption-evidence.ts:360` `if (rawManifest.testedRevision !== expectedRevision) problems.push("evidence manifest revision mismatch")` | manifest↔registry 束縛 |
| manifest entry ごとの `testedRevision` | `repository-adoption-evidence.ts:197` `if (value.testedRevision !== expectedRevision) problems.push(\`evidence ${value.id} revision mismatch\`)` | 同上 |
| `adoption-runs.json` の run ごとの `testedRevision` | `repository-adoption-evidence.ts:268` `if (summary.testedRevision !== entry.testedRevision) problems.push(\`${label} revision mismatch\`)` | 成果物レコード↔manifest 束縛 |
| `bootstrap-provenance.json` `preRevision` | `bootstrap.ts:427-428`(`gitObjectExists` + `isAncestor`) | **到達性検査あり** |
| 同 `postRevision` | `bootstrap.ts:331` `currentBaseline.generatedFrom.revision === provenance.postRevision`、`:432` の bundle 束縛 | **等値比較のみ。git 解決なし** |
| 同 `bootstrapBaseRevision` | `bootstrap.ts:423`(`=== preRevision`) | 等値比較のみ |

**機序**: `t413…test.ts:157/:159` だけが「台帳に永続化した SHA を後日 git で解決する」検査である。この repo はスカッシュマージ運用のため、PR ブランチの tip SHA は着地後 `main` に存在しない。台帳を更新する PR は自ブランチの tip を記録して着地するため、着地の瞬間に到達不能へ反転する。PR 上では記録 SHA が到達可能なので緑になり、**PR CI でもレビューでも構造的に捕捉できない**。

---

## 焦点2: 修復面の全数棚卸し(自前 grep による再計算)

上表のとおり **24 + 24 + 25 = 73 箇所**。クロスレビューの報告(`currentRevision` 24箇所 / `testedRevision` 25箇所 / manifest の `testedRevision` 群)と数値は一致し、manifest 側の未確定だった件数を **24**(entry 23 + top-level 1)と確定した。

ただし **SHA 文字列の 73 箇所は修復面の全数ではない**。焦点3のとおり digest 面が連動する:

- `adoption-evidence.json` の `evidenceDigest` **23 箇所**(receipt ごと)
- `adoption-evidence-manifest.json` の `artifact.sha256` **25 箇所**(run ごと。`adoption-runs.json` の実バイト digest)

したがって機械的な再バインドで書き換わるフィールドは **73 + 23 + 25 = 121 箇所**(実測: 後述の再バインド実験で `perl -pi` と digest 再計算がこの母集団を書き換えて `ok: true` に到達した)。

---

## 焦点3: `canonicalBinding()` と digest 束縛の構造

`repository-adoption-evidence.ts:333-351`:

```ts
function canonicalBinding(entry: EvidenceEntry, artifactDigests: ReadonlyMap<string, string>): string {
  return JSON.stringify({
    schemaVersion: entry.schemaVersion,
    id: entry.id,
    testedRevision: entry.testedRevision,
    runs: entry.runs.map((run) => ({
      name: run.name,
      command: run.command,
      artifact: {
        path: run.artifact.path,
        sha256: artifactDigests.get(run.artifact.path) ?? run.artifact.sha256,
        …
```

digest の入力は (a) `entry.testedRevision`(:336)と (b) 成果物ファイルの**実測バイト digest**(:343、`artifactDigests` は `readArtifactCollection` が `sha256(bytes)` で作る — :316、:446)である。したがって束縛は3層の**不動点**をなす:

1. `adoption-runs.json` の `testedRevision` を書き換える → ファイルバイトが変わる
2. → `adoption-runs.json` の sha256 が変わる → manifest の `artifact.sha256` 25 箇所を更新しないと `:317` `artifact digest mismatch`
3. → `canonicalBinding` の入力が2面(revision と artifact digest)とも変わる → `adoption-evidence.json` の `evidenceDigest` 23 箇所を再計算しないと `:185-186` `evidence digest does not match repository evidence`

**「SHA 置換だけでは閉じない」は正しい。ただし不動点は機械的に計算可能で、閉じる。** 実験(scratch clone `file:///…` を observed へ detach、`bun install --frozen-lockfile` exit 0):

| 段階 | 操作 | `validateEvidenceRegistry` の problems |
| --- | --- | --- |
| A | registry + manifest のみ SHA 置換(= クロスレビューの実験) | **48 件** — run 単位 `revision mismatch` 25 + receipt 単位 `evidence digest does not match repository evidence` 23 |
| B | + `adoption-runs.json` も SHA 置換、manifest の `artifact.sha256` を新 digest へ更新 | **23 件**(digest 面のみ残存) |
| C | + `evidenceDigestForReceipt()` で 23 receipt の `evidenceDigest` を再計算 | **0 件 / `ok: true`** |

段階 C の状態で `bun test tests/integration/t413-no-silent-drop-ci-adoption.test.ts` → **`10 pass / 0 fail`**(`48 expect() calls`)。

**クロスレビューとの相違点(精密化)**: verdict は問題を「23 receipt 全件が `primary revision mismatch`」と記述しているが、実測の内訳は **run 単位 25 件**であり、うち 4 件は名前が `primary` ではない(`full-test:normal` / `full-test:isolated-known-timeouts` / `coverage:normal` / `coverage:isolated-known-timeouts`)。またこのメッセージの発生元は `canonicalBinding` ではなく `repository-adoption-evidence.ts:268`(`summaryMatchesRun` の `summary.testedRevision !== entry.testedRevision`)である。`canonicalBinding` が効くのは同時に出ている 23 件の digest 問題の方である。

---

## 焦点4: evidence 再生成経路の不在

observed の `tests/no-silent-drop/` 配下 + `tests/no-silent-drop-gate.ts` の `.ts` は **8 ファイル**(`git ls-tree -r --name-only`):

`tests/no-silent-drop-gate.ts` / `ast-scan.ts` / `bootstrap.ts` / `engine.ts` / `ledger.ts` / `model.ts` / `repository-adoption-evidence.ts` / `repository-adoption.ts`

各ファイルに対する `grep -cE 'writeFileSync|Bun\.write|appendFileSync|createWriteStream|writeFile\(|mkdirSync'` は **全 8 ファイルで 0**。

CLI のモードは `engine.ts:49` `export type Mode = "check" | "census-evidence" | "approve-evidence" | "baseline-candidate";` の **4 種**で、出力は `tests/no-silent-drop-gate.ts:35` の `process.stdout.write(\`${JSON.stringify(result)}\n\`)` のみ。**正本 3 台帳を書く経路はリポジトリに存在しない。** クロスレビューの報告と一致する。

したがって再バインドの実施手段自体を本 intent が新設する必要がある(焦点3が示すとおり、その手続きは決定的に計算可能)。

---

## 焦点5(未確定事項の解消): `baseline-proof` receipt の再現性 — **主張は反証された**

起票時の主張「`baseline-proof` receipt は台帳再バインド後に構造的に再現しない(exit 2 / `bootstrap.candidate exact-bytes digest mismatch`)」を、repo 外 scratch clone(`/private/tmp/nsd-2156/clone`、observed へ detach、`bun install --frozen-lockfile` exit 0)で実測した。

`baseline-proof` receipt が記録するコマンド(manifest の当該 entry からの転記):

```
bun tests/no-silent-drop-gate.ts check --base-revision 9e699ea799eab3d250b752fb099943926d94a232
```

| 状態 | exit | stdout |
| --- | --- | --- |
| 再バインド**前**(pristine observed) | **0** | `{"schemaVersion":1,"status":"pass","code":"NO_SILENT_DROP_OK","findings":[]}` |
| 再バインド**後**(焦点3の段階 C) | **0** | 同上 |

**記録値 `exitCode: 0` は再バインド後も再現する。主張は成立しない。**

### エラー文字列の真の発火条件(別途特定)

`bootstrap.candidate exact-bytes digest mismatch`(`bootstrap.ts:226`)は実在し再現もするが、**トリガーは台帳再バインドではない**。

`bootstrap.ts:493-495`:

```ts
  if (!gitObjectExists(repoRoot, `${trustedSha}:${BASELINE_PATH}`)) {
    return validateBootstrap(repoRoot, trustedSha, currentBaseline, currentExemptions);
  }
```

`validateBootstrap`(→ `validateCurrentArtifactBindings:322` → `readArtifact(repoRoot, provenance.candidate, "bootstrap.candidate")`)へ入るのは、**信頼ベース SHA に `tests/no-silent-drop/baseline.json` が存在しない場合だけ**、すなわちゲート導入コミット `7c29e33f7` より前のベースに限る。`--base-revision 9e699ea79…` は当該ファイルを含む(`git cat-file -e 9e699ea79…:tests/no-silent-drop/baseline.json` exit 0)ため git 経路(:496-508)を通り、bootstrap 検証には到達しない。

bootstrap 経路のベース(`preRevision` = `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`、当該コミットに `baseline.json` は無く `git cat-file -e` exit 128)を渡すと、**pristine observed(再バインド前)でも**次を実測した:

```
$ bun tests/no-silent-drop-gate.ts check --base-revision 47574fbabf274e11cb8e0b37bf35a0309a7b3d42
exit=2
{"schemaVersion":1,"status":"error","code":"BASELINE_INVALID","findings":[],"detail":"bootstrap.candidate exact-bytes digest mismatch"}
```

再バインド後も同じ exit 2 / 同じ detail。**再バインドの有無に依存しない。**

### 派生発見(新規・本 Issue 本文にもレビューにも未記載): bootstrap fallback は observed で既に恒久破損

`bootstrap-provenance.json` の `candidate.digest` は現在の `baseline.json` のバイトと一致しない:

```
recorded candidate digest: 607988a05398e0c85324980ebba66ad127981fe3d28235141dc0f7d980d292a9
actual baseline.json sha256: 9c1e7275074a145cc0ecf1b60fe48e01b8dcfe9a46ddd058677cfeb351df196e
match: False
```

コミット別に追跡すると、乖離は **`a2f08658e`(PR #2127)から**始まっている:

| コミット | `baseline.json` の sha256 | provenance の `candidate.digest` | 一致 |
| --- | --- | --- | --- |
| `7c29e33f7` | `607988a05…` | `607988a05…` | YES |
| `498c3034a` | `607988a05…` | `607988a05…` | YES |
| `a2f08658e` | `e85ca7666…` | `607988a05…` | **NO** |
| `3972a5e01` | `4e8999f9a…` | `607988a05…` | NO |
| `52a082af7` | `90ad85e29…` | `607988a05…` | NO |
| `9e699ea79` | `ea618c569…` | `607988a05…` | NO |
| `9458bbda8` | `9c1e72750…` | `607988a05…` | NO |

`bootstrap-provenance.json` は導入コミット `7c29e33f7` 以降**一度も更新されていない**(`git log --oneline -3 -- tests/no-silent-drop/bootstrap-provenance.json` が `7c29e33f7` の 1 件のみ)一方、`baseline.json` は `9458bbda8` / `9e699ea79` / `3972a5e01` で更新されている。

さらに `bootstrap.ts:330-333` の等値検査も既に破れている:

```
baseline.generatedFrom.revision = 69338a56fb5abaf34825815ca058d762401a44a4
provenance.postRevision         = fc49f8de26f85c56ddc7ba94ee7522276ed3ec60
equal: False
```

**評価**: bootstrap fallback 経路は observed で fail-closed に落ちる(exit 2)。CI の実運用ベース(PR base / push before)は常にゲート導入後の SHA なので git 経路が選ばれ、この破損は顕在化しない。つまり **fail-closed 側なので偽緑は生まないが、fallback は事実上死んでいる**。これは #2156 と同じ「台帳に永続化した値がマージ運用で陳腐化する」設計クラスの3件目である。

---

## 焦点6: 同根の潜在事例 — `postRevision` の非到達性

reviewer-1 の所見を実測で確認し、さらに強い形に精密化した。

```
$ git cat-file -e fc49f8de26f85c56ddc7ba94ee7522276ed3ec60^{commit}
fatal: Not a valid object name fc49f8de26f85c56ddc7ba94ee7522276ed3ec60
exit=128
$ git branch -a --contains fc49f8de26f85c56ddc7ba94ee7522276ed3ec60
error: no such commit fc49f8de26f85c56ddc7ba94ee7522276ed3ec60
$ git merge-base --is-ancestor 47574fbabf274e11cb8e0b37bf35a0309a7b3d42 9458bbda8…   → exit=0   (preRevision は祖先)
```

**精密化**: mainline のみを持つクローンでは `postRevision` は「非祖先」ではなく **オブジェクトとして存在しない**(exit 128)。reviewer-1 の「非祖先 + `--contains` 0件」は複数 remote ブランチを持つツリーでの観測であり、CI の fresh clone では 128 形になる。

**現時点で赤にならない理由(file:line)**: `postRevision` は git 解決されない。

- `bootstrap.ts:426-428` の到達性検査(`gitObjectExists` + `isAncestor`)は `provenance.preRevision` にのみ適用される。
- `postRevision` の用途は `bootstrap.ts:331`(`currentBaseline.generatedFrom.revision === provenance.postRevision` の等値比較)と `:432`(`validateEvidenceBundle(…, provenance.postRevision, …)` — 内部 `:275` `approved.revision !== revision` の等値比較)のみ。
- かつ焦点5のとおり `validateBootstrap` 自体が `:493-495` の条件でしか呼ばれない。

将来 `postRevision` に到達性検査を足した時点で顕在化する。ただし**その前に `:331` の等値比較が既に破れている**(上記)ため、bootstrap 経路の修復は到達性だけでなく provenance 全体の再バインドを要する。

---

## 焦点7: #2153 との切り分け(assertion 行単位)

対象テスト `tests/integration/t413-no-silent-drop-ci-adoption.test.ts` の `the canonical evidence registry binds one reachable tested implementation revision`(`:151-174`、observed 断面)。

| 行 | assertion | 帰属 |
| --- | --- | --- |
| `:157` | `git cat-file -e ${registry.currentRevision}^{commit}` → 0 | **#2156**(fresh clone 形。CI の実失敗行) |
| `:158-163` | `git merge-base --is-ancestor registry.currentRevision headRevision` → 0 | **#2156**(オブジェクト在るフルクローン形) |
| `:164` | `validateEvidenceRegistry(registry, registry.currentRevision)` → `{ok:true}` | どちらでもない(自己参照的に `registry.currentRevision` を期待値へ渡すため現状は緑。**再バインドを不完全に行うとここが赤になる** — 焦点3の段階 A/B) |
| `:165-173` | `git diff --name-only ${currentRevision}..${headRevision} -- packages/framework/core/tools ':(glob)tests/no-silent-drop/**/*.ts'` が空 | **#2153**(path spec が被検査対象 `core/tools` を含む) |

**両者は独立**である。#2156 を `currentRevision` の再バインドで閉じても、#2153 の面は生き続ける。実測(worktree HEAD `668e88665` を head として observed を currentRevision と見立てた場合):

```
$ git diff --name-only 9458bbda8..HEAD -- packages/framework/core/tools
packages/framework/core/tools/amadeus-advisory-choice.ts
packages/framework/core/tools/amadeus-directive.ts
packages/framework/core/tools/amadeus-graph.ts
packages/framework/core/tools/amadeus-orchestrate.ts
packages/framework/core/tools/amadeus-plugin-activation.ts
packages/framework/core/tools/amadeus-sensor-self-scope-consistency.ts
packages/framework/core/tools/data/self-install-allowlist.ts
packages/framework/core/tools/data/stage-identities.json
                                                  → 8 files (#2153 の leg)
$ git diff --name-only 9458bbda8..HEAD -- ':(glob)tests/no-silent-drop/**/*.ts'
                                                  → 0 files (ゲート実装の leg)
```

`core/tools` leg のみが非空である = #2153 の主張(「検証器の実装面」と「検証器が検査する対象面」を混ぜている)が observed で live であることの実測。

---

## 影響面の再実測(クロスレビューの訂正の裏取り)

- 必須チェック: ruleset `main`(id `18843917`、`enforcement: active`)の `required_status_checks` = **`['CI Success']` の1件のみ**。classic protection は `branches/main/protection` が **404 `Branch not protected`**。
- `CI Success` の集約構造(observed の `.github/workflows/ci.yml`、行番号は実測):
  - `:893` `ci-success:` / `:894` `name: CI Success` / `:896` `needs:` / `:897-905` `changes, typecheck, lint, distribution-contract, plugin-conformance-e2e, tests, reproducible-build, drift-check, coverage` / `:906` `if: ${{ always() }}`
  - **精密化**: Issue 本文の `ci.yml:894-906` は observed では **`:893-906`**(`ci-success:` が 893 行)。
- t413 の pristine observed 実行(scratch clone、`file://` transport):

```
 9 pass / 1 fail / 45 expect() calls
(fail) … the canonical evidence registry binds one reachable tested implementation revision
  at t413-no-silent-drop-ci-adoption.test.ts:157:117 — Expected: 0 / Received: 128
```

  なお `file://` の通常クローン(`--single-branch` なし)でも当該 PR ブランチのオブジェクトは入らなかったため、reviewer-1 が記した ref 削除 + `gc --prune=now` を経ずに CI 形(`:157` / 128)を再現できた。

---

## 修正方式の裁定に必要な確定事項(要約)

1. 再バインドの**不動点は機械的に計算可能で閉じる**(段階 C で `ok: true` / t413 `10 pass 0 fail`)。「書き換えでは閉じない」は naive 置換に限った話であり、修復不能を意味しない。
2. `baseline-proof` の再現性は再バインドの障害**ではない**(exit 0 が再バインド後も再現)。この未確定事項はスコープから外してよい。
3. 再バインドを行う**書込経路は存在しない**ため、本 intent で新設が要る(現状 8 ファイル 0 write / 4 subcommand が stdout のみ)。
4. 記録する SHA を「マージ後の main SHA」にする設計と、「PR ブランチ SHA を記録できない」構造のどちらを採るかは未裁定(requirements の裁定事項)。前者はマージ時点で台帳を更新する経路を要し、後者は t413 の到達性検査の意味論変更を伴う。
5. bootstrap fallback(`bootstrap-provenance.json`)は**同一設計クラスで既に破損済み**(candidate digest 乖離 + postRevision 等値破れ + postRevision オブジェクト不在)。fail-closed のため無害だが、修正方針の射程に含めるかは裁定事項。
6. #2153 は独立に残る(`:165-173` の path spec)。同一テスト・同一 test 名を共有するため、片方だけ直しても test 名単位では赤が残りうる。

## Scan による副作用

なし。git 状態の変更、`amadeus-orchestrate.ts` / `amadeus-state.ts` / `amadeus-log.ts` 等の実行、PR / Issue の操作はいずれも行っていない。再現実験はすべて repo 外 scratch(`/private/tmp/nsd-2156/`)のクローンで実施した。coverage 計測は `cid:code-generation:c1-coverage-single-owner` に従い一切行っていない。
