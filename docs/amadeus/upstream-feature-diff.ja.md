# Upstream Feature Diff（上流機能差一覧）

この文書は、上流 `awslabs/aidlc-workflows` の `main` ブランチ、上流 `v2` ブランチ（基準 commit）、Amadeus の三者で機能がどう対応するかを 1 ページで一望できるようにする。各行に検証可能な出典を付す。英語正本は [upstream-feature-diff.md](upstream-feature-diff.md) である（乖離時は英語版を正とする）。

- 上流 `main`: https://github.com/awslabs/aidlc-workflows/tree/main/
- 上流 `v2` 基準: commit `b67798c37c71855271b70882a33f47890d41f212`（2.2.0 Adaptive Workflows。Issue #428 / PR #539 で採用）
- Amadeus: 本リポジトリ（`core/skills/amadeus*`、`.agents/amadeus/` エンジン、`harness/`、validator、インストーラ）

読み方: 各軸の表は 5 列（観点 / 上流 main / 上流 v2 / Amadeus / 出典）である。「上流 main」列は、v1 系ツリーに対応物がない行では「対象外（v1 系。冒頭要約参照）」と記す。サマリ表は v2 → Amadeus の関係を 4 区分（一致 = 忠実適応、適応 = 改名・再結線、独自 = Amadeus のみ、未取り込み = 上流機能の未採用）で分類する。

## 上流 main と v2 の関係

上流 `main` は v1 世代の構成である: `.claude/` + `.kiro/`（spec 駆動の Kiro ワークフロー）、`aidlc-rules/`、`docs/`、`scripts/`（実測 = main の live tree）。`v2` ブランチは `core/`（単一ソース: agents、aidlc-common、hooks、knowledge、memory、scopes、sensors、skills、templates、tools）、`harness/<claude|codex|kiro|kiro-ide>/`（ハーネス別差分層）、`dist/`（生成物）、`scripts/`（ビルド）へ再構成された。Amadeus は `v2` ブランチだけを追跡する。v1/v2 の差は本節の要約に留め、詳細は上のリンクへ委ねる。以降の各軸の行単位比較は v2 と Amadeus を詳細に、main 列は v1 対応概念の有無を記録する。

## サマリ

| 軸 | v2 → Amadeus の関係 |
|---|---|
| ライフサイクル構造 | 一致（32 stages、同一グラフ） |
| scope 集合 | 適応 + 独自（上流 9 + `pdm`） |
| エンジンツール群 | 適応（26 tools、`aidlc-*` → `amadeus-*` 改名、例外は宣言済み） |
| hooks | 適応（11 hooks） |
| sensors | 適応（4 sensors + Amadeus の 2 段 linter 検出） |
| audit イベント | 適応 + 独自（上流 70 + `GUARD_EXEMPTED` = 71） |
| 質問プロトコル | 適応（grilling 結線が Amadeus の適応点） |
| 多体連携運用 | 独自 |
| validator | 独自 |
| インストーラ | 独自 |
| harness | 部分採用（codex Phase 1）+ 未取り込み（build/emit） |
| 上流にあって Amadeus に無いもの | 未取り込み項目は #428 / #552 で追跡 |

## ライフサイクル構造

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| phase / stage グラフ | 対象外（v1 系。Kiro spec の phase。冒頭要約参照） | Initialization〜Operation の 32 stages | 同一の 32 stages、同一の phase 機構 | `.agents/amadeus/tools/data/stage-graph.json`、上流 `core/aidlc-common/stages/`、`docs/amadeus/lifecycle/` |
| stage protocol | 対象外（v1 系） | `stage-protocol.md`（+ recovery、governance） | 忠実コピー + 宣言済みローカル追記（PR gate ポインタ #534、cid marker 形式 #504） | `parity-map.json` の `exceptions[]`、`.agents/amadeus/amadeus-common/protocols/` |
| ワークフロー入口 | v1 の `.kiro` ワークフロー | `/aidlc` orchestrator skill | `/amadeus`（全面 rename #526。意味論は v2 互換） | PR #553、`AMADEUS.md` |

## scope 集合

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| scope 数 | 対象外（v1 系） | 9 scopes | 10 scopes（適応 9 + `pdm`） | b67798c3 の `ls core/scopes` = 9、`ls .agents/amadeus/scopes` = 10 |
| Amadeus 独自 scope | — | — | `pdm`（企画・要求定義止まり。Construction / Operation を持たない） | Issue #429、`.agents/amadeus/scopes/amadeus-pdm.md`、parity 例外宣言 |
| 合成 scope | — | Adaptive Workflows composer（2.2.0） | 採用済み（`/amadeus compose`、`amadeus-composer-agent`、`recompose`、`validate-grid`） | Issue #428 / PR #539、codekb architecture |

## エンジンツール群

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| ツール数 | 対象外（v1 系。scripts のみ） | 26 tools（`core/tools/*.ts`） | 26 tools（`.agents/amadeus/tools/*.ts`）。`aidlc-*` → `amadeus-*` 改名 | b67798c3 で両側 `ls *.ts | wc -l` 実測 |
| 名前・path 写像 | — | — | `parity-map.json` の `nameMappings` が機械的対応を定義 | `dev-scripts/data/parity-map.json` |
| 意図的差分 | — | — | `engineFileExceptions`（path）+ `exceptions[]`（理由）でファイル単位宣言。例: #504 cid marker、#534 PR gate ポインタ | `dev-scripts/data/parity-map.json`、`npm run parity:check` |

## hooks

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| hook 数 | 対象外（v1 系） | 11 hooks（`core/hooks`） | 11 hooks（`.agents/amadeus/hooks`） | b67798c3 で両側実測 |
| 健全性の表面化 | — | drops + doctor | 同等 + doctor の修正提示（#432） | Issue #432、codekb architecture |

## sensors

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| sensor 集合 | 対象外（v1 系） | 4（linter、required-sections、type-check、upstream-coverage） | 同一 4 種（manifest は `amadeus-` prefix） | 両側実測、`.agents/amadeus/sensors/` |
| linter sensor の挙動 | — | 設定済み linter をラップ | 隔離 workspace の 2 段検出（#538）= 実装適応 | Issue #538、`dev-scripts/evals/linter-sensor/` |

## audit イベント

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| Event Registry | 対象外（v1 系） | 70 events | 71 events（70 + docs-only ガード免除の `GUARD_EXEMPTED` #499） | b67798c3 の上流 `core/knowledge/aidlc-shared/audit-format.md` ヘッダ、`.agents/amadeus/knowledge/amadeus-shared/audit-format.md`（71 events） |
| Registry へのローカル追記 | — | — | Evidence Verification Boundary 節（#506） | 同 audit-format.md、`parity-map.json` の `exceptions[]` |

## 質問プロトコル

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| 質問ファイル | v1 の `.kiro` プロンプト | `[Answer]:` タグ + question-rendering annex | 同一プロトコル | `amadeus-common/protocols/stage-protocol.md` §3 |
| 対話提示 | — | ハーネスの question rendering | `amadeus-grilling` へ結線（1 問ずつ、推奨回答つき）= 38 stage skill の宣言済み適応点 | `AMADEUS.md`（skill 適応方針）、`core/skills/amadeus-grilling/` |

## 多体連携運用

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| 複数 worktree のチーム運用 | 対象外 | 対象外（単一セッション前提） | 独自: agmsg 上の leader + engineers、ピア協議プロトコル、中継承認、ロール固定 worktree | `amadeus/spaces/default/memory/team.md`（並行運用ポリシー / 多体連携の運用）、Issue #497 #502 #551 |

## validator

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| 実行時構造の validator | 対象外 | 対象外 | 独自: `amadeus-validator` skill（record 構造、traceability、codekb 参照解決 #501） | `.agents/skills/amadeus-validator/`、Issue #501 |

## インストーラ

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| 配布 | v1 は手動コピー | packager（`scripts/`、dist ベース） | 独自インストーラ: `scripts/amadeus-install.ts` がエンジン 7 dirs + `amadeus*` skills を対象 workspace へコピー | Issue #451、`scripts/amadeus-install.ts` の MANIFEST |

## harness

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| ハーネス層 | `.claude/` のみ | `harness/{claude,codex,kiro,kiro-ide}` + 生成 `dist/<harness>` | `.claude/` symlink 配線（claude）。`harness/codex/` Phase 1 = 契約 + provenance、skill 別 `agents/openai.yaml` guard は source skills へ採用 | 上流 tree 実測、Issue #552、`harness/codex/README.md`、`harness/codex/provenance.md` |
| Codex guard ファイル | 対象外 | `dist/codex/.agents/skills/aidlc-*/agents/openai.yaml`（38 件、生成物） | 38 件を `core/skills/amadeus-*/agents/openai.yaml` へ採用（+ 昇格コピー）。guard 内容の同一性は sha256 で検証済み | `harness/codex/provenance.md`（写像表 + ハッシュ） |

## 上流にあって Amadeus に無いもの

| 観点 | 上流 main | 上流 v2 | Amadeus | 出典 |
|---|---|---|---|---|
| build / emit 機構 | 対象外 | `harness/*/emit.ts` + packager による `dist/` 生成 | 未取り込み: 三層化（core/harness/dist）の Phase 2 として計画済み（設計確定済み、実装は後続 Intent） | Issue #552 の設計確定（feasibility Q1〜Q6）、`harness/codex/README.md` |
| kiro / kiro-ide ハーネス | `.kiro` ネイティブ | `harness/kiro`、`harness/kiro-ide` | 未採用（現時点で対象ハーネスなし） | b67798c3 の上流 tree 実測 |
| 上流ドリフト項目 | — | 8 件の追跡中差分（すべて「上流未修正。忠実コピー維持」） | 追跡のみ（ローカル修正せず parity を維持） | Issue #428 のコメント群（ドリフト判断表 1〜8）、PR #539 |

## 基準 commit 更新時の追従手順

1. fresh clone の基準を更新する: `dev-scripts/generate-parity-baseline.ts` で `dev-scripts/data/parity-baseline.json` を再生成し、`npm run parity:check` を実行する（provenance 検証つき再生成の前例は PR #542）。
2. 宣言済み差分を再確認する: `parity-map.json` の `exceptions[]` は各項目が「上流が取り込んだら解除」を持つ。新基準で項目ごとに照合する。
3. Issue #428 のコメント群にあるドリフト項目を再検証する（次回の基準更新 Intent が引き継ぐ）。
4. 本文書を更新する: 上の基準 commit を書き換え、各軸の件数（scopes / tools / hooks / sensors / audit events）を両側で再実測する。機構ごとの再取り込み実務は各機構の文書（Codex guard は `harness/codex/provenance.md` など）にある。
5. `docs/amadeus/lifecycle/` と言語方針との整合を保つ（`.md` と `.ja.md` を同じ PR で更新する）。
