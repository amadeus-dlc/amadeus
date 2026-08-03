# Security Test Instructions — silent-drop-gate

## 上流成果物と脅威境界

本書は4 Unitの `code-generation-plan.md`、`code-summary.md`、各 `security-requirements.md` を入力とする。amadeus-devsecops-agentの観点で、untrusted source bytes、filesystem、Git revision、evidence provenance、mutation targetを信頼境界とする。

外部attack surface、HTTP、database、credential、cloud IAMは存在しないためDAST、auth、TLS、SQL／XSS検査は非適用である。代わりにrepository-local SASTと攻撃的fixtureを必須にする。

## 実行方法

```bash
bun run no-silent-drop -- --base-revision 47574fbabf274e11cb8e0b37bf35a0309a7b3d42
bun test --timeout 120000 \
  tests/integration/no-silent-drop-gate.test.ts \
  tests/integration/no-silent-drop-repository-adoption.test.ts \
  tests/integration/t413-no-silent-drop-ci-adoption.test.ts \
  tests/integration/t224-state-set-failclosed.test.ts \
  tests/unit/t279-amadeus-mirror-executor.test.ts
```

dependency／supply-chainは `bun install --frozen-lockfile` のlock整合、exact `@ast-grep/napi@0.45.0`、`bun run typecheck`、package／promotion drift guardで検証する。network依存の新規scannerは導入しない。

## 合格条件

- NSD001〜NSD003のunsafe形態を検出し、safe形態を誤検出しない
- malformed／duplicate／decoy／改行・引用符・backslash・Unicode separator／過長targetをfail-closedにする
- symlink、missing root、source race、short／zero／unknown SHA、artifact改変、receipt mismatchを拒否する
- pre-commit failureではstate／audit bytes不変、post-commit durability failureではunknownを成功へ丸めない
- identity一致・payload不一致でoutboxを保持し、audit重複、silent retry、secret／state全文／絶対path露出を0件にする
- SAST、focused security tests、typecheck、lock／distribution integrityの全項目がexit 0
