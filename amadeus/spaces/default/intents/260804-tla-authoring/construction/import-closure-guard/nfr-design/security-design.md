# NFR Design: セキュリティ設計 — U6 import-closure-guard

上流入力(consumes 全数): engine directive の解決済み consumes は 0 件 — nfr-requirements stage が scope 設計どおり SKIP のため `security-requirements` / `tech-stack-decisions` は expected-absent、`business-logic-model.md` は U6 が packaging kind で functional-design の適用成果物を持たない(engine の produces_kinds 判定)ため本 unit には存在しない。いずれも設計どおりの欠落であり、内容を発明せず fallback 手順で設計する。本書は stage 手順の documented fallback に従い、承認済みの `requirements.md`(NFR-003/NFR-005/NFR-006)、`decisions.md` ADR-4、`components.md` §C8、`component-methods.md` §C8、U6 の functional-design 非該当判定(packaging kind)を文脈として設計する。存在しない上流成果物の内容は発明しない。

## 脅威モデルと守るもの

C8 ImportClosureGuard は**供給網(配布物)の完全性検査**であり、守る資産は「composed runtime が canonical source の実行推移閉包を完全に含むこと」(NFR-005)。

| 脅威 / 欠陥クラス | 影響 | 対策(本設計) |
|---|---|---|
| manifest 掲載漏れ(実害実測済み: `tla-model-receipt.ts` / `tla-module-deps.ts`) | composed runtime の missing import — 利用者環境で実行時故障(FR-011) | 再帰 import 走査で閉包を機械列挙し、manifest / bundle / ownedPaths との差集合が非空なら projection を fail-closed 停止(ADR-4) |
| 検査の無音 skip(guard 自体の不発) | 掲載漏れの再流入 — 偽 green | guard は `bun run build` の直列検査として組み込み、exit 非 0 で build 全体を停止(`services.md` §S5 相当の結線)。「落ちる実証」= module を 1 つ manifest から抜くと欠落全数列挙で build が赤くなることを fixture で固定(`memory/team.md` Mandated「落ちる実証」+ delivery-planning 成果物 bolt-plan.md の Bolt 4 DoD — 出典は delivery-planning 側と明示) |
| 解決不能 import の黙殺 | 閉包の過小評価 — 検査の空文化 | `ClosureFailure.unreadable` として全数列挙し、解決できない import は「閉包に含まれない」ではなく failure として扱う(NFR-003 — 欠落の暗黙変換禁止) |
| path escape(`..` / 絶対パス / シンボリックリンクで repo 外を閉包に引き込む) | 検査対象の汚染・配布物への repo 外ファイル混入 | **責務を 2 層で確定**(U6 は FD 非該当のため本書が確定点): (1) pure 関数(`resolveImportClosure`)は文字列レベルの POSIX 正規化(`..` 展開・絶対パス拒否)+ repo ルート境界判定を所有し、境界外は `unreadable` へ全数列挙 (2) **symlink の実体解決(realpath)は注入 FS アダプタ(`scripts/plugin-projection.ts` 側の `readFile` 実装)が所有**し、realpath が repo ルート境界外へ出る参照には null を返して pure 関数側の `unreadable` へ倒す — 文字列正規化だけでは symlink 脱出を検出できないため、この層分担を実装契約とする |
| 検査述語の恣意的緩和(将来の allowlist 肥大) | ガードの形骸化 | 例外機構(skip リスト・allowlist)を**持たない**設計とする — 閉包に含まれる module は manifest へ載せる以外の通過経路がない(検証劇場 Forbidden の予防形。例外が必要になった場合は設計改訂 = 人間ゲート) |

## 権限・攻撃面

- guard は**読取専用の静的解析**であり、新規のネットワーク経路・秘密情報・書込権限を持たない(ADR-4 セキュリティ影響節の設計化)。入力は manifest(`plugin.json`)と repo 内ソースファイルのみ、出力は診断と exit code のみ。
- `readFile` は注入 seam(`component-methods.md` §C8)であり、実 FS 実装は projection(`scripts/plugin-projection.ts`)側が渡す — guard 純関数は FS 直接アクセスを持たず、テストでは fake FS で全分岐を検証できる(NFR-006)。
- bare specifier(外部パッケージ import)は閉包対象外(Bun runtime 解決 — `components.md` §C8 境界)。依存パッケージの完全性は本 guard のスコープ外で、既存のリポジトリ規律(lockfile・CI)が担う。

## 入力検証

| 入力 | 検証 | 失敗時 |
|---|---|---|
| plugin.json manifest | 既存 manifest parse(projection 側の既存検証)を通過した値のみ guard へ渡る | 既存 projection のエラー経路(guard の前段) |
| import 指定子 | 相対指定子のみ解決対象。正規化(POSIX、`..` 展開)後に repo ルート境界内であること | 境界外・解決不能 → `unreadable` に全数列挙 |
| 走査対象ファイル | `readFile` が null(不在)を返した参照は `unreadable` | fail-closed(黙殺しない) |

## 検証可能性(NFR-006)

- 純関数 + 注入 seam により unit 層で全分岐(閉包成立 / unreadable / missingFromManifest / missingFromOwnedPaths / 境界外 escape)を検証する。実 FS・実 projection を通す検査は integration 層に最小限置く(`memory/project.md` cid:code-generation:fs-tests-integration-first)。
- 「落ちる実証」: 既存欠落 2 module を再現する red fixture → manifest 修復後 green、および任意 module の除去 → 欠落全数列挙での build 失敗(出典: delivery-planning 成果物 bolt-plan.md の Bolt 4 期待デモ)。ガードが新設検査であるため、赤くなることの実証を完成条件に含める(`memory/team.md` Mandated)。symlink 脱出 fixture(repo 外への dangling/実体 symlink)を負例に含め、FS アダプタ層の realpath 境界判定が実際に赤を出すことも実測する。

## 上流トレーサビリティ

- `inception/requirements-analysis/requirements.md`(FR-011、NFR-003、NFR-005、NFR-006、AC-007/AC-008)
- `inception/application-design/decisions.md` ADR-4(Context / 対策 / セキュリティ影響)、`components.md` §C8、`component-methods.md` §C8
- `inception/units-generation/unit-of-work.md`(U6 定義)、`inception/delivery-planning/bolt-plan.md`(Bolt 4 DoD・期待デモ — delivery-planning 成果物としての出典明示)
- `nfr-design-questions.md`(0 件判定、人間承認 2026-08-04T22:44:55Z)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-04T22:50:05Z
- **Iteration:** 1
- **Scope decision:** none

脅威モデル・fail-closed契約・ADR-4/C8整合は成立しているが2件の引用不備がありFOLLOW-UPで申し送る

### Findings

- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/import-closure-guard/nfr-design/security-design.md:12,34 — 「unit-of-work.md Bolt 4 DoD」という引用は誤り。許可範囲の unit-of-work.md 全文を実測したが「Bolt」の文字列は一切出現せず(Bolt は delivery-planning の概念)、falling-proof fixture の根拠出典が誤帰属のまま固定されている。正しい出典(おそらく bolt-plan.md 等の delivery-planning 成果物)へ是正すること。
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/import-closure-guard/nfr-design/security-design.md:14 — path escape 対策として引用する `amadeus-formal-verif-model-map.ts` の `isCanonicalAuxiliaryPath` は本レビューの許可範囲外で実在未検証。加えて、pure な `resolveImportClosure(entrypoints, readFile)` は文字列としての import 指定子しか扱わないため、シンボリックリンクによる repo 外脱出を検出するには readFile を供給する具象 FS アダプタ(`scripts/plugin-projection.ts` 側)側の realpath 解決が必要になる可能性が高い。POSIX正規化だけでは足りないケースの責務所在(pure関数側か注入FS側か)を Functional Design で明示すること。
- FOLLOW-UP | amadeus/spaces/default/intents/260804-tla-authoring/construction/import-closure-guard/nfr-design/nfr-design-questions.md:5,13 — 同じ「unit-of-work.md(U6 定義・Bolt 4 DoD)」引用が questions ファイル側にも複製されており、上記の是正時は record 全域(cid:nfr-design:cite-fix-sweeps-whole-record)で同時修正すること。
