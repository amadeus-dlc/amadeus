# Security Design: plugin-packaging-e2e(U3)

上流入力(consumes 全数): business-logic-model(U3 自身の business-logic-model は packaging kind のため produces_kinds により不在 — 参照実体は sibling unit の FD、具体的には convergence-toolchain の business-logic-model が定める report/override の2様式と exit code 契約を C8 センサーの検査対象様式の出典として消費する。engine 解決済み directive の consumes は空であり、この参照は設計出典の明示)。その他の設計入力: requirements FR-1/FR-5c/FR-6/NFR-4、application-design ADR-5/C7/C8/C9

## 脅威と対策(パッケージング・配布面)

| 脅威 | 対象 | 対策(設計) |
|---|---|---|
| import 閉包外モジュールの混入(composed host での missing import) | plugin.json の tools 宣言 | `assertPluginImportClosure` の通過を受け入れ基準に含める(NFR-4 — 既存 guard、write-0 拒否。E-PCP-ADDEV で実測済みの declared ∧ owned 二重被覆) |
| symlink 脱出(バンドル外への参照) | plugin バンドル | 既存 `repoFileReader` の realpath 境界に相乗り(scripts/plugin-projection.ts:893-909 — 実在確認済み。escape は null → unreadable 列挙で loud) |
| センサーによる執行の混入(検証劇場) | C8 センサー manifest | センサーは advisory のみ(FR-6a — 執行は置かない)。manifest の `default_severity: advisory` を既存8センサーと同一様式で固定 |
| 工程断片への外部依存の混入 | C7 ステージ本文断片 | Guardrail は self-contained 正本化(FR-5c、裁定 Q4)— 外部スキルパス・$HOME 参照を本文に書かない(未 install 環境・別ハーネスでの空文化防止) |
| trust 3層の迂回 | plugin stage 出荷 | compose 時 TrustGrant digest / compile 時 provenance stamp / run 時 O_NOFOLLOW(FR-2d — formal-model-check 既習形へ相乗り、新機構なし) |
| E2E fixture の本番汚染 | 対実証テスト | fixture workspace は repo 外 scratch(scratch-script-discipline)。record を書くツールの実験は project-root override を明示 |
| 収束レポート偽装の見逃し | C8 様式検査 | レポート様式(converged/override の2様式 — ADR-3)の必須フィールドをセンサーが可視化。手書き偽装は §12a レビュー観点と対で検出(A-3) |

## 認可境界

- install/uninstall は人間の明示 verb が起点(opt-in 境界 — FR-1a)。U3 は新たな認可面を作らない
- C8 センサー manifest は core 側配置(ADR-5)— plugin stage frontmatter の宣言より先の着地を Bolt 内順序で担保(compile の未知 id loud 拒否が fail-closed の順序ガード)

## 検証境界(対実証の完全性)

- NFR-1 の対実証は「install 済み → 前進拒否(落ちる実証)」と「未 install → produces 不変」の両側を必須とする(片側のみは comparative-gate の片側実測に相当し不完全)
- NFR-2 の述語赤 fixture(replied-unresolved)は U2 のテストに存在するが、U3 の E2E でも composed runtime 経由で貫通確認する(受け入れ目安2の実証面)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T09:08:27Z
- **Iteration:** 1
- **Scope decision:** none

U3 security-design は7類の脅威を既存ガード相乗りで網羅し両側実測を明記、新規機構なしで READY

### Findings

- FOLLOW-UP | scripts/plugin-projection.ts:893-909 の引用はスコープ外読取のため今回未検証(conductor が実在確認済みの旨は別途記録)
- FOLLOW-UP | 認可境界節が簡潔で install/uninstall と並行 Bolt 実行時の blast radius が未明示(新規認可面なしは明言済み — 非ブロッキング)
- NIT | 表中の(A-3)は requirements の Assumptions 番号だがスコープ内に定義が無い略号
