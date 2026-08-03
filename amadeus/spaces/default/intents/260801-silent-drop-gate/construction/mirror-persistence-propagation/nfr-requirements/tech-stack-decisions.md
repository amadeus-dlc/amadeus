# Tech Stack Decisions — mirror-persistence-propagation

## 決定の前提

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。既存のBun-only TypeScript／ESM monorepo、同期CLI、filesystem adapter、正本からの生成投影を維持し、本Unitのための新規framework、database、queue、daemon、外部serviceを追加しない。

## 採用技術

| 領域 | 決定 | 理由 | 検証 |
|---|---|---|---|
| Runtime | Bun 1.3.13 | repositoryとCIの既存固定runtime | frozen install、focused test、test:ci |
| Language | TypeScript strict／ESM | discriminated unionで失敗状態を閉じ、exhaustiveに処理できる | `tsc --noEmit`、exhaustiveness test |
| Persistence | 既存filesystem atomic adapter | state／audit／outboxのcommit境界とfailure injection seamを再利用 | lock〜fsyncの注入試験 |
| Result model | module-internal discriminated union | `OperationPreparationResult`、`StoreMutationResult`、`StateResult`を文字列解析なしで分離 | pure mapping unit test |
| Audit recovery | 既存transactional outbox | commit後failureをrollbackせずat-most-onceへ収束 | append／clear failure integration |
| Test runner | Bun test |既存unit／integration／failure-injection基盤と整合 | focused suite、Comprehensive回帰 |
| Packaging | `bun scripts/package.ts` と `bun run promote:self` | canonical sourceから全harness投影を同期 | `--check` drift guard |
| Lint／format | Biome既存設定 |近傍スタイルとCI契約を維持 | `bun run lint` |

## 型境界の決定

`OperationPreparationResult` は `ready`、`maintenance-blocked`、`maintenance-completed` の閉集合とし、prior outboxの処理を所有する。`StoreMutationResult` はcurrent transitionの `transition-written`、`transition-unchanged`、`transition-conflict`、`transition-invalid`、`transition-io-failure(phase)` を所有する。`StateResult` は `failed(pre-commit | durability-unknown)` と `ok(clean | outbox-pending)` を所有する。

この3層を統合する汎用Result frameworkは作らない。`requirements.md` のNFR-05が要求するpure domain／filesystem adapter分離を、今回の局所module境界で実現する。

## 依存と供給網

新規runtime dependencyとdevelopment dependencyは0件とする。Bun lockfile、既存TypeScript、既存filesystem APIだけを使う。ast-grepは別Unitのstatic gateが所有し、本Unitのruntime修正へ持ち込まない。

生成物を直接編集せず、canonical sourceだけを変更する。packagerとpromotionの出力は既存drift guardでbyte parityを検証し、`technology-stack.md` が記録する7 harness distributionとself-install面を同じ手順で更新する。

## 却下した選択肢

| 選択肢 | 却下理由 |
|---|---|
| 新しい全域Result型 | FR-10／NFR-09の公開互換境界を越え、単一用途以上のframeworkになる |
| exception message／summary prefix解析 | BR-04とNFR-05に反し、型付きphaseを失う |
| database／外部queue | ローカルCLIへ不要な運用・security・availability面を追加する |
| 自動retry／backoff | 呼出前byte invarianceと明示的invocation境界を曖昧にする |
| cache | 強整合なstate／audit判定にstale readを持ち込む |
| generated projection直接修正 | FR-14とNFR-09のcanonical source／byte parity契約に反する |

## 完了判定

focused test、lint、typecheck、Comprehensive回帰、package check、promotion checkがgreenであることを要求する。加えて、`business-rules.md` のAR-01〜AR-11、`requirements.md` のFR-10／FR-15、公開union不変、新規依存0件を実測証跡で確認する。
