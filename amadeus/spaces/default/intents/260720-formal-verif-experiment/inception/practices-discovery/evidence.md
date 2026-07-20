# Practices Discovery Evidence — 260720-formal-verif-experiment

## Sources Scanned

上流入力 `code-structure.md`、`technology-stack.md`、`dependencies.md`、`code-quality-assessment.md`、`architecture.md`、`business-overview.md` を読み、現行 `.github/workflows/ci.yml`、`.github/workflows/release.yml`、`package.json`、`biome.json`、`tests/`、`scripts/amadeus-election*.ts`、git history と突き合わせた。観測断面は commit `d588c117a1e83ac6bac74bf586294d4db1a26add`。

## Pipeline and Deployment Finding

- CI は PR と `main` push で起動し、typecheck、Biome lint、CCN ratchet、dist/self-install drift、smoke・unit・integration、project/patch/relative coverage を `ci-success` で blocking 集約する(`.github/workflows/ci.yml:7-15,77-114,125-232,334-368`)。
- `main`、短命 PR、squash を中心とする履歴と既存 team practice が一致する。application environment の宣言はなく、release は手動 dispatch から GitHub Release と npm provenance publish を行う(`.github/workflows/release.yml:9-18,29-46,108-159`)。
- 問う必要があった点: Brownfield の形式検証実験で walking skeleton を使うか。

## Quality Finding

- 直近修正は source と regression test を同じ変更で着地させており、red→green 順序は squash 履歴から証明できない。姿勢は TDD confirmed ではなく test-co-development / regression-first。
- project coverage は baseline `7225/17648 = 40.9395%` から最大0.02pp低下までの相対 ratchet、PR patch は測定可能な追加行の未カバー0を要求する(`tests/.coverage-project-baseline.json`、`tests/coverage-project-gate.ts:119-125`、`tests/coverage-patch-gate.ts:266-283`)。
- `test:ci` は e2e を含まず、live substrate 不在時の skip がある。本実験の全件検出基準は一般 coverage gate と別に明文化する必要がある。

## Developer Finding

- 選挙 CLI は model / store / record / transport / CLI の5責務へ分離され、型は PascalCase、関数・値は camelCase、定数は UPPER_SNAKE_CASE、ファイルは kebab-case + 責務 suffix を反復使用する。
- expected failure は判別 `Result`、永続化は same-directory tmp + rename、破損/未知参照は write 前に fail-closed。domain/record は副作用を持たず、I/O/clock/spawn は境界へ隔離する。
- 後続設計へ送る点: 欠陥母数5/6の不一致、TLA/TLC資産0件、選挙PBT 0件、二時刻ブランド型未実装、e2eのPR CI除外、clock injection seam。

## DevSecOps Finding

- 強制済み: least-privilege の既定 `contents: read`、frozen lockfile、Bun/lizard pin、dist drift guard、release ancestry/version guard、npm provenance、publish allowlist。
- 未実装: SAST、DAST、secret scan、dependency vulnerability scan、dependency-update bot、SBOM/signing、Action full-SHA pin。Biome は formatter off、lint warningを許し、blocking complexity は別の lizard ratchetが担う。
- CodeKB の Codecov、CI job構成、Biome導入予定記述には現行 workflow との鮮度差があり、今回の判断は live config を優先した。

## Interview Outcome

ユーザーは本 intent に限って walking skeleton を使い、最初の Bolt で「1欠陥の再注入 → 1アーム実行 → 決定論的判定 → CI 証跡」を実証してから展開する方針を選択した。team 横断ルールは変更しない(`practices-discovery-questions.md`)。
