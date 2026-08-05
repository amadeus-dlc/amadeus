# Requirements: PR 収束 opt-in プラグイン(pr-convergence)

上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure

測定 ref: observed = origin/main `8409c2039c52`(RE と同断面。行番号引用はすべてこの断面。rebase 後 base = `1043b7e67857` — 前進1コミットは memory/project.md のノルム退役のみでコード患部に非交差)

## Intent Analysis

intent-statement の Problem Statement を要件化する: PR 収束(競合解消→レビュースレッド対応→CI green→収束通知)を Bolt 完了条件として指令ループへ fail-closed に接続する。実現形は opt-in プラグイン `pr-convergence`(ユーザー裁定 2026-08-02: 自動付与不可)。ガード本体は新設せず、core 既存の `unitCovered` 述語(amadeus-orchestrate.ts:3452-3472 — produces 全件 existsSync、承認状態非参照)を compose 時の produces overlay でデータ点火する(architecture / code-structure の codekb 現在節が患部断面を確定済み)。

ゴールは「install した環境ではレポート不在の Bolt の batch が前進しない」「install しない環境のワークフローは一切不変」の対保証である(business-overview の記す機械実行可能性・監査可能性の原則と整合)。

## Functional Requirements

### FR-1: opt-in 境界(install / uninstall)

- FR-1a: plugin `pr-convergence` の install(compose)を opt-in 境界とする。install しない workspace のワークフロー・compiled graph・produces は一切不変
- FR-1b: uninstall(drop)で overlay が消え素の挙動へ戻る(可逆)。既存 drop 機構の FS 実測復元(空親ディレクトリ残骸ゼロ検査を含む)に相乗りする
- FR-1c: 適用範囲は code-generation を EXECUTE する全 scope の全 Bolt(裁定 Q1 = auto-decision-28cf30a55acfa5f2d95e0b839243873b。scope 名指しの絞り込みは行わない)

### FR-2: produces overlay(compose 拡張 — 要拡張1点)

- FR-2a: compose は install 時に既存ステージ `code-generation` の produces へ `pr-convergence-report` を overlay 追記できること。RE 実測(re-scans/260805-pr-convergence-plugin.md §2c)により、seam 語彙(`SEAM_NAMES` = produces/consumes/sensors/required_sections、amadeus-plugin-compose.ts:74)・merge・台帳・drop 復元は既存、**host stage 認識面が実 Markdown frontmatter に未接続**(`parseHostStageSeams` は合成バイト形 `stage: <slug>` のみ受理、実ステージは loud reject「unknown-seam」)であることが確定している。本要件は「実ステージへの seam 接続が成立すること」を capability として固定し、実装機構の選択((a) frontmatter 保存型 parse/serialize の新設 / (b) QualityRequiredOutputDescriptor(amadeus-quality-repair.ts:125-130、現状 fail-closed 未接続)の接続 / (c) 他)は application-design の ADR へ委譲する
- FR-2b: overlay 後の `pr-convergence-report` は `unitCovered` の必須 produces 判定に入り、レポート実在パスは `<record>/construction/<unit>/code-generation/pr-convergence-report.md`(resolveArtifactPath :1916 の per-unit 形)であること
- FR-2c: **produces_kinds fail-open の封鎖**: 本 intent の変更は code-generation へ `produces_kinds` を導入しない。導入する設計変更が生じる場合は全 unit kind への適用を明文の受け入れ条件とする(根拠: unitCovered :3465 `if (names.length === 0) return true;` / approve 側 kindAwareArtifactsExist :1678・:1676 / ANY :1691-1694 の3経路 fail-open — cid:nfr-design:c1-engine-produces-all-five 追補として persist 済み)
- FR-2d: trust は formal-model-check の3層(compose 時 TrustGrant digest / compile 時 plugin stage 発見+provenance stamp / run 時 O_NOFOLLOW 同一 inode 再検証)を踏襲する

### FR-3: 収束述語(単一定義)

- FR-3a: thread 4区分 — `resolved`(isResolved=true)/ `outdated`(force-push で行が消えた thread — 独立区分、無音で落とさない)/ `replied-unresolved`(非 bot 返信ありだが未 resolve — 収束を満たさない)/ `ignored`(非 bot 返信ゼロ)
- FR-3b: 収束 = `replied-unresolved` と `ignored` が 0 件 ∧ `mergeStateStatus == CLEAN` ∧ `mergeable` の UNKNOWN は不成立として retry(`statusCheckRollup.state` は必須/非必須を区別しないため使わない)。retry の回数上限・間隔の数値は既存コードに対照定数が無いため application-design で確定する(OQ-4 へ明示委譲 — constants-from-code: 実在しない要約帯をここで発明しない)
- FR-3c: canonical 1定義 — `mergeStateStatus` の正規化は既存 `parseMergeability`(scripts/metrics-publication-domain.ts:256-262、UNKNOWN→pending・未知値 throw の fail-closed)と二重定義しない。再利用(共有定義への抽出を含む)か、意図的別定義+根拠の ADR 明記かを application-design で確定する
- FR-3d: severity は bot コメントの構造化値を台帳へ転記する

### FR-4: thread 台帳生成器(機械導出)

- FR-4a: thread 台帳は GitHub GraphQL 実測から機械導出する(手書き禁止)。`reviewThreads` の全数取得(`pageInfo.hasNextPage` ページング必須)、bot 判定は `__typename=="Bot"`(静的列挙禁止)
- FR-4b【申告改訂 2026-08-05、E-PCP-ADDEV 2-0】: gh 実行は gateway と同一契約の4点 — (i) readiness 検査(runnable+auth) (ii) argv 配列実行 (iii) token 非保持 (iv) 非0 exit の loud fail — に準拠する plugin 内最小実装とする。不在・未認証・API/rate-limit 障害は loud fail(exit 非0)とし、無音の空台帳を作らない(gh-scripts-boundary 準拠)。4点はテスト可能な assertion として functional-design で固定する。承認系譜: 初版「既存 amadeus-github-gateway.ts へ相乗り」は plugin tools→core の import が import-closure guard(scripts/import-closure-guard.ts:169-189 checkManifestClosure の declared/owned 二重被覆、scripts/plugin-projection.ts:920 owned = posix.join(pluginHostPrefix(name), rel) — core パスは owned に入り得ない)で構造不可と実測確定したため、設計逸脱選挙 E-PCP-ADDEV(2-0、両票 choice 1)で契約準拠形へ改訂(ADR-6 参照)
- FR-4c: 後続 PR で是正した thread は終端処理(却下返信+resolve、対応 PR/commit 記載)を要求する — 永久 violating の残置は #1887 の捕捉者別集計を汚染する

### FR-5: 収束ループ工程(plugin 出荷のステージ本文断片)

- FR-5a: 工程 (0) 競合解消の先行(mergeable 確定まで review/CI 工程へ進まない)→ (1) PR 作成 → (2) 監視(checks+reviewThreads 全数)→ (3) 是正(トリアージ基準による実測処分)→ (4) 再監視(push ごとに再取得 — bot は新 head へ再指摘する)→ (5) 収束通知(機械集計値)
- FR-5b: トリアージ基準は Issue #1971 の2軸機械判定(自 diff 起因か = base 対照実測 / 変更面が閉じるか)+3処分(本 PR で修正 / Issue 化・着地優先 / 却下+resolve — 契約の file:line 引用付き反証を返信に必須)+境界規則((i) Security・正しさの実弾は本 PR が当該面を触っているなら本 PR 修正 (ii) 迷ったら escalate (iii) Issue 化は起票番号記載の resolve で終端)を工程本文へ固定する
- FR-5c: Guardrail 本文(失敗優先・flat comments 禁止・リモート書込み前の承認境界・flake の扱い)は plugin 出荷の工程本文へ self-contained に正本化する(裁定 Q4 = auto-decision-74bc4838aa905efdcb0b2dabf298924c。外部スキルへのポインタ参照は未 install 環境・別ハーネスで空文化するため不採用。出典クレジットは記載可)

### FR-6: センサー(advisory 可視化のみ)

- FR-6a: レポート様式・台帳整合の可視化センサーを追加する。執行はセンサーに置かない(センサーは advisory — amadeus-sensor.ts:29-31/:271/:573-574、出荷8センサー全件 advisory の実測)
- FR-6b: sensor manifest は core 側(`packages/framework/core/sensors/`)へ置き、plugin stage の frontmatter `sensors:` が宣言する — 参照実装 formal-model-check の既習形(RE 実測: plugin manifest schema は stages/seams/fragments/tools のみで sensors を持たない。Issue 役割分担表の「plugin が manifest 同梱」はこの既習形へ訂正)

### FR-7: GitHub 不達時の挙動

- FR-7a: 収束レポートが GitHub 不達で生成できない場合、engine park(人間へ帰還)を既定とする(裁定 Q2 = auto-decision-55760c28f6c89a1ead33a2d5ad3966a6)
- FR-7b: 人間の明示承認を記録する override 経路を設ける — override の行使は「収束未確認のまま前進した」事実を台帳と audit に残す(無音バイパス禁止 — 検証劇場 Forbidden との区別は記録の実在)
- FR-7c: いずれの経路でもワークフローを恒久停止させない(gh-scripts-boundary)

## Non-Functional Requirements

- NFR-1: **対実証(受け入れの目安1)** — install 済み workspace で compose 後 produces に `pr-convergence-report` が載り、レポート1件削除で `next` が同 batch を再発出する(落ちる実証)。未 install workspace で produces が不変であることを対で実証
- NFR-2: **述語の赤実証(受け入れの目安2)** — `replied-unresolved` を含む fixture で収束判定が赤くなることを実証
- NFR-3: **台帳の機械導出実証(受け入れの目安3)** — ページング・bot 判定・severity 転記・終端処理を含む GraphQL 実測からの導出をテストで固定
- NFR-4: **import-closure** — plugin が tools を出荷する場合、`plugins/pr-convergence/plugin.json` の `tools[]` が import 閉包の全数を覆い `assertPluginImportClosure`(scripts/plugin-projection.ts:880-946、#2240 で新設)を通過する
- NFR-5: **テスト規律** — TDD 既定(tdd-default-with-narrow-exceptions)。tNNN は **t444 以降**を予約(RE 実測: observed 最大 443)。実 FS を使うテストは integration 層(fs-tests-integration-first)。既存ブロッキングゲート(typecheck / lint / 再現性 / source-only / graph invariant / coverage 両ゲート / patch / complexity)全通過
- NFR-6: **全ハーネス同一** — ガード本体は core 1定義所有のまま(検証劇場を作らない)。`bun run build` で全ハーネス(packager 検出集合)の dist 再生成が成立

## Constraints

- C-1: PR マージの人間承認(no-AI-merge)は不変 — 収束述語は merged を要求しない
- C-2: 新規ガードコードを書かない — fail-closed の実現は core 既存 `unitCovered` のデータ点火のみ(Issue 却下案 (b)(c)(d) を再検討しない)
- C-3: batch 境界の直列化(次 batch の開始が前 batch の PR 収束を待つ — wall-clock 増)は設計上の受容трейドオフとして明記
- C-4: approve 時ガードの fail-open 3経路は本 intent の対象外(裁定 Q3 = auto-decision-5fcc82b161a49d05df340d30113386af)— RE 実測(unitCovered :3465 / kindAwareArtifactsExist :1678・:1676 / ANY :1691-1694)を Issue #1902 へ申し送る
- C-5: `AMADEUS_PBT_DEEP` 等の既存 CI 面へ新設ジョブを足す場合は正準ランナーの暗黙既定値を逐語継承(c6-runner-bypass-loses-defaults)

## Assumptions

- A-1: GraphQL フィールド語彙(reviewThreads / isResolved / mergeStateStatus / statusCheckRollup / `__typename`)は外部 seam — 実装前に実 PR での実測で確定する(external-seam-vocab-measurement。phase-check-ideation WARNING 3 の引継ぎ)
- A-2: `scopes: []` の opt-in stage 形は本 intent の達成手段にならない(RE 実測 §4a: plugin stage は stock scope の per-unit ループへ不参加)— seam overlay 経路が critical path であり、FR-2a 不成立時は実装前停止して人間へ escalate する
- A-3: 収束レポートの生成主体は conductor(収束 CLI の実行結果からの機械生成)であり、手書きレポートは NFR-3 の様式検査対象外の偽装として扱う

## Out of Scope

- #1902(PR 発行の保証)の実装 — 責務分担リンクのみ。approve 側ガード(C-4)も同 Issue へ
- #1887(収束結果の台帳化・計測)の実装 — 本レポートを一次入力にできる様式互換のみ配慮
- 既存負債(過去 PR の未収束スレッド)のトリアージ(別対応中)
- 要求されない後方互換レイヤー・移行シム(org.md Forbidden)
- Issue 却下済み代替案(config 階層必須化 / optional_produces+散文 / 独立ステージ+scope grid)

## Open Questions

- OQ-1: seam 実装機構の選択(FR-2a の (a)/(b)/(c))— application-design の ADR で最低2案の実質トレードオフ比較により確定
- OQ-2: `parseMergeability` の canonical 化方式(FR-3c の再利用 or 意図的別定義)— application-design で確定
- OQ-3: override 経路(FR-7b)の受理面(CLI verb か state フィールドか)— application-design で確定
- OQ-4: FR-3b の mergeable UNKNOWN retry の回数上限・間隔の数値 — application-design で確定(既存対照定数なし)

## 裁定の記録

Q1〜Q3 は scope-document の「Requirements への送付事項」3件(適用 scope 絞り込み / GitHub 不達時 / #1902 R3 所有権)に基づき、Q4 は RE 裁定候補10に基づき起草した。

- Q1〜Q4 は自律モード full グラント(intent-grant-fd0ed2b79c48204d342920ce3b4b67f0)の decide-question で確定し、auto-decision 記録(unreviewed)として後日レビュー可能: auto-decision-28cf30a55acfa5f2d95e0b839243873b / auto-decision-55760c28f6c89a1ead33a2d5ad3966a6 / auto-decision-5fcc82b161a49d05df340d30113386af / auto-decision-74bc4838aa905efdcb0b2dabf298924c(詳細は requirements-analysis-questions.md)
- ユーザー承認: 2026-08-05T05:33:39Z(グラント発行の実 HUMAN_TURN、audit シャード実測)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T06:33:11Z
- **Iteration:** 1
- **Scope decision:** none

必須7節・裁定転記・上流トレーサビリティは良好。scope-documentの本文未参照とFR-3bのretry無閾値をFOLLOW-UPとして指摘しREADY。

### Findings

- FOLLOW-UP | requirements.md冒頭のconsumes全数にscope-documentが列挙されているが本文中に明示参照が一度も無く、upstream-coverageセンサーFAILEDのおそれ。scope-document由来の裁定根拠を明示引用する一文を追加すべき。
- FOLLOW-UP | FR-3bの「mergeableのUNKNOWNは不成立としてretry」に回数・タイムアウトの数値閾値が無く曖昧。既存定数の引用かapplication-designへの明示委譲を追記すべき。
