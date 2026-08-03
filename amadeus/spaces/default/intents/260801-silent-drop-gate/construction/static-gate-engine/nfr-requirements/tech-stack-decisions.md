# Tech Stack Decisions — static-gate-engine

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、既存Bun-only TypeScript monorepo内へ追加する技術だけを決定する。

## 決定一覧

| ID | 決定 | 理由 |
| --- | --- | --- |
| TS-SG-01 | RuntimeはBun 1.3.13、言語はstrict TypeScript／ESM | 既存CLI、テスト、CI、packagingと同じ実行境界を維持する |
| TS-SG-02 | structural candidate検出に `@ast-grep/cli` 0.45.0をexact dependencyとして採用 | catch／expression等の構造候補を文字列検索より安定して列挙でき、Bun frozen installで同じbinaryを解決できる |
| TS-SG-03 | semantic oracleに既存TypeScript compiler APIを使う | symbol、discriminated union、全path、独立したcandidate母集合を同一snapshotから評価できる |
| TS-SG-04 | hashはNode/Bun標準cryptoのSHA-256を使う | identity、manifest、evidence digestに既存runtime外の依存を増やさない |
| TS-SG-05 | filesystem／process adapterはNode互換標準APIを使う | source read、temp mirror、literal child process、Git readを明示的I/O境界へ隔離できる |
| TS-SG-06 | base ledger取得はliteral full SHAとpathを使うGitReadPortへ隔離 | current treeからprevious setを推測せず、trusted base revisionを一意に読む |
| TS-SG-07 | schemaはTypeScript discriminated unionと厳格parserで表す | Pass／Violations／Error、ledger、evidenceの無効状態をfail-closedにする |

## ast-grep採用条件

- `package.json`へ `"@ast-grep/cli": "0.45.0"` をexact指定し、`bun.lock`のresolution／integrityとfrozen installで固定する。range、tag、runtime downloadは認めない。
- packageの`bin.ast-grep`が指す相対pathとplatform／arch別SHA-256を、tracked `config/no-silent-drop/toolchain-lock.json` に固定する。lockfile reviewと同じrepository changeで更新し、通常checkが信頼するdigestの唯一の正本とする。
- 通常checkはpackage root配下の`bin.ast-grep`対象を`O_NOFOLLOW`で読み、`0700` private temp directory内の`ast-grep`へexclusive copyする。copyのSHA-256がtoolchain lockと一致した後、そのliteral absolute pathだけをspawnする。PATH、`node_modules/.bin`、元package pathを直接execしない。
- installation capability probeは検証済みprivate copyの `--version` がexactly `ast-grep 0.45.0` を返すことと、`scan --help` が `--inline-rules`、`--json=stream`、`--color=never`、`--threads` を公開することをCIで検証する。probe receiptはtoolchain-lock digest、copy digest、version、capability setへ結合する。
- 通常checkは `ast-grep scan --inline-rules <bundle> --json=stream --color=never --threads=1 <snapshot-root>` を1 invocationだけ実行する。stdoutは1 matchにつき1 JSON objectのJSON Lines、stderrは診断、exit 0はscan成功としてadapterが厳格parseし、rule bundle内にcandidate rulesとcoverage sentinelを同梱する。
- tool missing、version不一致、rule parse失敗、nonzero exit、schema不正をtyped Errorへ写像できること。
- TypeScript semantic oracleと独立した構造候補源として使い、ast-grep query自身を完全性oracleにしないこと。

## モジュール境界

| 境界 | 責務 |
| --- | --- |
| domain | Result、Finding、identity codec、candidate classification、ratchet、exemptionのpure logic |
| source adapter | authored root列挙、snapshot、前後manifest、symlink／readability検査 |
| ast-grep adapter | fixed binary起動、rule／sentinel receipt parse、timeout／signal処理 |
| TypeScript adapter | snapshot overlay Program、semantic universe、symbol／union／control-flow解決 |
| GitReadPort | full base revisionからbaseline／exemption bytesをliteral pathで取得 |
| evidence adapter | new-output-only write、digest結合、既存path拒否 |
| RSS sampler | root Bunと全descendantの`/proc` `VmRSS`を10ms間隔で同時合計し、tree-wide peakを記録 |
| CLI entrypoint | command parseと完成済みResultのstdout／stderr／exit code投影 |

domainはfilesystem、process、console、`process.exitCode`を直接扱わず、adapterはpolicy判断を再実装しない。

## 採用しない選択肢

- Biome custom ruleだけでの実装: TypeScript semantic unionと既存ast-grep採用要件を同時に満たさないため不採用。
- regex／`rg`中心の検出: best-effort catch、status Result、write-success対応を意味的に分類できないため不採用。
- 常駐language server／remote analysis service: credential、network、availability、運用面を不要に増やすため不採用。
- databaseによるbaseline管理: Git版管理、review、subset diffより複雑で、repository-local再現性を失うため不採用。
- incremental cacheを初期導入: snapshot authorityと決定性を複雑化し、15秒目標は単一run設計で先に実測すべきため不採用。
- baselineとexemptionの統合台帳: 既存債務と意図的dropの意味を混同し、shrink-onlyを弱めるため禁止。

## Build・Test・Distribution

- package scriptsはBun直接実行、型検査は既存`tsc --noEmit`、lintはBiomeを維持する。
- pure unit、filesystem／CLI integration、positive／negative fixture、repository corpus、performance測定を分離する。
- 新規gateはTDDで各vertical sliceのRed→Greenを実測し、tool／rule／zero／partial等のfalling proofを残す。
- contributor-only toolとして成立する限り`dist/`へ含めない。core tool化が必要な場合だけcanonical sourceを変更し、`scripts/package.ts`と`scripts/promote-self.ts`で投影を再生成する。
- generated projectionを直接編集せず、`bun scripts/package.ts --check`と`bun run promote:self:check`を最終検証に含める。

## 再検討条件

- cold／warm最大15秒を完全性維持のまま満たせない。
- ast-grepがrequired node shapeまたはmachine receiptを固定版で表現できない。
- TypeScript compiler APIだけではclosed semantic catalogを一意に判定できない。
- 新しいlanguage、authored root、status-return catalog、distribution surfaceがscope changeとして承認される。
- supply-chain上の重大な脆弱性により固定版を更新する必要がある。
