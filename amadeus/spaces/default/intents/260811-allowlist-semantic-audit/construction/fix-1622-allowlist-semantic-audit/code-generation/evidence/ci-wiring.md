# FR-5 配線根拠 — ガードは既存の blocking 経路に載っている

上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

FR-5 は「ガードを CI へ blocking で配線する」ことを求め、`cid:code-generation:c1-2814-aggregate-needs-is-blocking`
により **集約ジョブ `ci-success` の `needs` に載る経路**であることを要求する。

結論: **新規ジョブは追加しない**。宣言クラス検査は `tests/coverage-patch-gate.ts --check` の
内側にあり、その `--check` は `coverage-head` ジョブ(`ci.yml:428`)のステップである。
`coverage-head` は集約 `needs` に**直接は載らない**が、集約に載る `coverage` ジョブ(`:573`)が
`needs: coverage-head` を持ち、その先頭ステップで結果を assert するため赤は伝播する(下記 2 節)。
`cid:code-generation:c1-2814-runs-when-vs-blocks-merge` が区別する 2 面(いつ走るか / 赤が止めるか)を
それぞれ実読で確認した。

## 1. ガードが走る場所

`.github/workflows/ci.yml:428`(逐語 `  coverage-head:`)のジョブ内、`:471-477`(逐語):

```yaml
      - name: Patch coverage gate
        if: ${{ github.event_name == 'pull_request' }}
        env:
          AMADEUS_PATCH_BASE_REF: origin/${{ github.event.pull_request.base.ref }}
        run: |
          set -euo pipefail
          bun tests/coverage-patch-gate.ts --check | tee /tmp/patch-gate-summary.txt
```

`set -euo pipefail` があるため `--check` の非0終了はステップを、ひいては `coverage-head` ジョブを落とす。
宣言クラス検査はこの `--check` の内部(`runCheck` の allowlist 解決直後)にあり、
別の入口を持たない — requirements.md Constraints の「第 2 の解釈器を作らない」に従う。

`coverage-head` の赤が集約へ届く経路(`ci.yml:573-586`、逐語):

```yaml
  coverage:
    name: Coverage Report
    needs:
      - changes
      - coverage-head
      - coverage-base
    if: ${{ always() && needs.changes.outputs.coverage == 'true' }}
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Require coverage jobs
        run: |
          test "${{ needs.coverage-head.result }}" = success
          test "${{ needs.coverage-base.result }}" = success
```

`coverage` は `if: always()` で必ず起動し、先頭ステップの `test` が `coverage-head` の結果を
assert する。GitHub Actions の既定シェルは `bash -e` なので、この `test` が偽なら `coverage` ジョブが
落ちる。**この 1 段の伝播があるため、`coverage-head` が集約 `needs` に直接載っていなくても
赤はマージを止める**(2 節の `require_result "coverage"` が拾う)。

## 2. 赤がマージを止めること

`.github/workflows/ci.yml:822-836`(逐語、抜粋):

```yaml
  ci-success:
    name: CI Success
    runs-on: ubuntu-latest
    needs:
      - changes
      - control-byte-gate
      - typecheck
      - lint
      - distribution-contract
      - plugin-conformance-e2e
      - tests
      - reproducible-build
      - drift-check
      - coverage
      - review-thread-resolution
```

`coverage` は `needs` に含まれる。その結果は `:902-906` で評価される(逐語):

```yaml
          case "${{ needs.changes.outputs.coverage }}" in
            true)
              require_result "coverage" "${{ needs.coverage.result }}"
              ran=true
              ;;
```

`require_result` は `:841-846` で定義され、`success` 以外なら非0で終了する(逐語 `:844-845`):

```bash
            if [[ "${actual}" != "success" ]]; then
              echo "${name} was ${actual}; expected success"
```

## 3. 対象 PR で `coverage` ジョブが実際に走ること

`coverage` ジョブは `:431` の `if: ${{ needs.changes.outputs.coverage == 'true' }}` で条件付き。
その値は `scripts/detect-ci-changes.sh` が決める(逐語):

```bash
  case "${path}" in
    *.ts|*.tsx|*.mts|*.cts|\
    bun.lock|package.json|*/package.json|\
    .github/workflows/ci.yml|tests/*)
      coverage=true
      ;;
  esac
```

このガードが発火しうる 2 種類の変更は、いずれもこの条件を満たす:

- **台帳の変更**(`tests/.coverage-patch-allowlist.json`)→ `tests/*` に一致
- **宣言先ソースの変更**(`packages/framework/core/tools/*.ts` 等)→ `*.ts` に一致

したがって「宣言クラスが実コードと食い違う」状態を作りうる変更では、必ず `coverage` が走り、
その赤が `ci-success` を落とす。

## 4. 二重の blocking 経路

新規テスト t536(unit)/ t537(integration)は `tests` ジョブで走り、`tests` も
`:832` で `needs` に含まれ `:874` で `require_result "tests"` される。実台帳のスイープ
(t537 の「every declared class matches the code it resolves to」)はこちら側でも blocking である。

## 5. 実証の分担

意図的に赤にした PR がマージ不能であることの実測は、**conductor が別ブランチで**行う。
承認候補 PR の head へ注入コミットを残さないため(`cid:code-generation:falling-proof-injection-one-set`)、
builder 側は実装と本根拠の記録までとする。ローカルでの落ちる実証は
`evidence/README.md` と code-summary 側に実測出力を残した。
