# Requirements — 260805-xrev-bug-batch

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

- 測定 ref: RE observed `1043b7e67857494f38a4c9020709528e859c641b`（= origin/main、worktree HEAD 一致を実測）
- クロスレビュー: run `xrev-20260805-openbugs`、対象 SHA `8409c2039c5281e533db88a637649276d8bc4a73`。全6 Issue が2名成立
  （収束 `ESTABLISHED_WITH_REFINEMENTS` ×6）。`review..observed` の実 diff は `memory/project.md` 1件のみで患部と交わらず、
  全 file:line 引用は observed で有効（`cid:reverse-engineering:E-XBB-RE-S13-c2`）
- 裁定: 本書の全確定事項は `requirements-analysis-questions.md` のユーザー裁定（2026-08-05T07:56:44Z）に遡る
- Intent autonomy: `full`（grant `intent-grant-bd63c4ce5991149e6a2ba1677cefbbfc`）。禁止効果
  `new-permission` / `irreversible` / `scope-out` / `norm-waiver` / `quality-waiver` は自動化対象外

## 意図分析

オープンバグゼロ目標（`cid:requirements-analysis:bug-zero-goal`）に向け、クロスレビューで実在が確立した6件を
1 intent のバッチで修正する。6件のうち4件は RE の合成（codekb `architecture.md` の現在節）が特定した同一欠陥クラス —
**検査述語は正しいが、その到達可能性・結合軸・計数単位が無関係な条件に従属しているため、守るべきケースで発火しない** —
に属する。したがって本 intent の価値は個別修正の総和ではなく、ゲート系機構の「検査が実際に届くこと」の回復にある。

`business-overview.md` が示すとおり本リポジトリは AI-DLC フレームワーク自体であり、修正対象はいずれも
フレームワークの信頼境界（reviewer 契約・選挙台帳・監査・coverage ratchet・SWARM 突合）に当たる。
`code-structure.md` の正本配置（`packages/framework/core/tools/` 編集 → `bun run build` 再生成）に従う。

## 機能要件

### FR-1: #2147 — reviewer invocation の永続化と全経路照合（S2-CRITICAL 昇格対象）

裁定: Q1=A（永続化 + fail-closed）。

- FR-1a: `runScope` は発行した `invocationId` + `iteration` を intent record 配下の invocation store へ永続化する。
- FR-1b: `checkRead` と `completeReview` は、受け取った `invocationId` を store と照合する。**store に存在しない
  invocationId は fail-closed で拒否**し、READY を確立しない。spot-check 辞退（transcript 空）経路でも照合は執行される。
- FR-1c: replay 検査（同一 invocation/iteration の再提出拒否）は transcript の有無に依存せず全経路で執行される
  （現行の早期 return `amadeus-reviewer-runtime.ts:443` の従属を解消）。
- FR-1d: 受け入れ基準 — レビュー実測の再現手順を verbatim 再適用する:
  (i) `scope` を呼ばず捏造 v4 UUID で `check-read` → 非0 exit / 承認決定を返さない。
  (ii) 同様に `complete-review` → 非0 exit / READY 不成立。
  (iii) `scopeTranscript: []` の通常経路で先行 iteration の id を再利用 → 非0 exit。
  (iv) 正規の `scope`→`check-read`→`complete-review` 往復は従来どおり exit 0。
- FR-1e: テスト — `t245` 系へ `scopeTranscript: []`（通常経路）ケースを追加する（現行 0 hit の盲点を閉じる）。
  修正前実装 × 新テストの赤（対角実測、`cid:code-generation:c6-260803-state-integrity`）を記録する。

### FR-2: #1946 — ballot submittedAt の受理側刻印（S2-CRITICAL 昇格対象）

裁定: Q2=A（受理側で刻印）。

- FR-2a: `vote` 受理時、CLI が受理時刻を権威として ballot へ刻む。投票者自己申告の `submittedAt` は
  集計・順序決定の軸として使わない（保持する場合は参考フィールドへ降格）。
- FR-2b: `resolveBallots`（`amadeus-election-model.ts:307-313`）の最新票選定軸を受理時刻へ移す。
  未来日時の原票が真正な後続 amend を破棄する経路（レビューで決定的再現）を構造的に閉じる。
- FR-2c: late 票レーンの `at: ballot.submittedAt`（store `:633`）も同一変更で受理軸へ閉じる（書込点2箇所の同時是正）。
- FR-2d: **テスト契約の明示改訂** — `tests/unit/t234-election-model.test.ts:310-315` のピン
  （「開票前に受理された未来の submittedAt は on-time」）を「自己申告値は集計軸として使わない」旨へ改訂する。
  改訂は申告付きで行い、改訂理由に本裁定（Q2=A、2026-08-05T07:56:44Z）を引く。
- FR-2e: 受け入れ基準 — レビュー実測の再現（原票 submittedAt=2099 + amend GoA8）で、修正後は amend が勝ち
  `hold(block)` に至ること。既存 626 行の歴史的矛盾 58 行は遡及修正しない（監査 append-only、Q2 スコープ外）。
- FR-2f: `specs/tla/FormalElection` が本領域の並行プロトコル spec に当たるため、実装後に formal-model-check を
  再実行し、ベースライン（2026-08-05 取得、`NOT_DETECTED`）との差分を確認する
  （`cid:build-and-test:two-layer-verification-posture`）。spec 本体の改訂が必要になった場合は model-map の
  entries 更新と model-completeness センサーの整合を同一変更で行う。

### FR-3: #2251 — completion 待ち窓の typed directive 化

裁定: Q3=B（実発火面まで）+ Q3b=A（新 kind 導入）。

- FR-3a: completion 未コミット窓の `next`（`amadeus-orchestrate.ts:3005` 近傍）は、`error` ではなく
  新設の typed directive kind で「正規の待ち状態」を返す。`ERROR_LOGGED` / `amadeus.operation.failed` を emit しない。
- FR-3b: 同一変更で、実発火を確認済みの同型面 `:585` と `amadeus-state.ts:2510` / `:2522` も同じ kind へ移す。
  未発火の `:3020` / `:4970` はスコープ外とし、別 Issue として起票する。
- FR-3c: 新 kind は全ハーネスの SKILL.md（forwarding-loop 表）と `docs/reference/12-state-machine.md` へ
  同一変更で同期する（ALWAYS 規定: framework source / 全 harness 面 / tests / docs の同一変更同期）。
- FR-3d: 抑止側修正の禁止 — `ERROR_LOGGED` の emit 条件を狭める方式は #839 / #878 を退行させるため採らない。
- FR-3e: 受け入れ基準 — 起票時の再現（completion 未コミット窓での bare `next`）で、監査シャードへ
  Error 行が追記されないこと、新 kind の directive が返ること、`next` を N 回叩いても監査行が増えないこと
  （現行は randomUUID の idempotencyKey で N 行追記される）。#839/#878 のピンテストがグリーンのままであること。

### FR-4: #2145 — verification.md の正本2行修正（documentation へ再分類）

裁定: Q4=A（正本2行のみ）+ Q4b=A（documentation）。

- FR-4a: `packages/framework/core/knowledge/amadeus-shared/verification.md` の `:15` / `:25`（`amadeus-docs/` 参照2行）を
  現行の record レイアウト（`<record>/verification/`）へ是正する。機械契約（`amadeus-state.ts:388` の
  phase 境界 guard、ステージ3ファイルの指示）と一致させる。
- FR-4b: Issue #2145 の受け入れ条件を現行コマンド（`bun run source-only:check` / `bun run distribution:check`）へ
  書き直すコメントを Issue へ投稿し、ラベルを `bug` → `documentation` へ変更する（S ラベルは documentation では不要のため除去）。
- FR-4c: 同根の陳腐化（sensor manifest 4件・knowledge 3件）は本 intent で修正せず、別 Issue として起票する。
  起票時に `matches:` glob が生きている旨と `audit-format.md` の legacy fallback 意図保持を明記する。
- FR-4d: 受け入れ基準 — `git grep -n 'amadeus-docs/' packages/framework/core/knowledge/amadeus-shared/verification.md` が 0 hit。
  `bun run build` 後の追跡ファイル不変。

### FR-5: #1953 — SWARM 実績突合への世代キー導入

裁定: Q5=A（世代キー + legacy fail-closed）+ Q5b=A（bug 維持）。

- FR-5a: Bolt DAG と SWARM 実績の3 emitter に generation（現行計画の識別子）を持たせ、approve 側の突合は
  世代一致を要求する。世代不一致の実績は fail-closed で拒否する。
- FR-5b: generation を持たない legacy 実績行も fail-closed（受理しない）。是正手段として計画の再突合
  （現行計画での実績再生成）を loud なエラーメッセージで案内する。
- FR-5c: 本 Issue の対応要件を FR-4 から **FR-2**（`260801-cg-plan-guard` の `requirements.md:31-37`）へ正しく紐づけて記録する。
- FR-5d: 受け入れ基準 — stale 実績（過去計画由来）を注入した approve が非0 exit で拒否されること（落ちる実証）。
  現行計画の実績は従来どおり通過。世代キーは `cid:code-generation:c1-degree` 系の運用（unit dir 遅延作成・directive 捕捉）と両立する。
- FR-5e: レビューが別 Issue と判定した SR-1（carrier approve の swarm ガード迂回）はスコープ外・別起票。

### FR-6: #2112 — cast guard の最外1サイト化と逆方向の穴の封鎖

裁定: Q6=B（最外1サイト + 逆穴も同一変更）+ Q6b=A（unknown 経由も1サイト）。

- FR-6a: `unchecked-cast-guard` の計数を「`as` 連鎖の最外1サイト」へ是正する。`JSON.parse(x) as A as B` は 1。
  `JSON.parse(s) as A as unknown as B` も 1（unknown 経由でも無検査キャストとして数える。BR-CG-2 との関係は
  「unknown 経由の別扱いは単独 `as unknown as` の既存規定に限る」と明文化する）。
- FR-6b: 逆方向の過少カウントを同一変更で塞ぐ — `<A>JSON.parse(s)`（角括弧アサーション）と
  `JSON.parse(s) satisfies A`（satisfies 単独）を検出対象に加える。
- FR-6c: 台帳（`.coverage-patch-allowlist` 系ではなく cast 台帳）の再ベースは**マージ先の最終 base**で採る
  （`cid:code-generation:c5-ratchet-census-at-final-base`）。shrink-only 方向は維持する。
- FR-6d: 受け入れ基準 — fixture で (i) 多段連鎖 = 1 サイト (ii) 角括弧 = 検出 (iii) satisfies = 検出
  (iv) 正当な既存コーパス全数で赤にならない（`cid:code-generation:corpus-sweep-for-new-guards` の両側実測）。
- FR-6e: Issue 本文の件数（33/18）を実測値（再ベース後の値）へ訂正するコメントを投稿する。

### FR-7: ラベル・Issue 運用の同期

- FR-7a: #2147 を S3→**S2-CRITICAL**（P2→P1 への引き上げを含む）、#1946 を S3→**S2-CRITICAL** へ再分類する（Q7=A）。
- FR-7b: 各 Issue へ、本 intent の裁定（方式・スコープ・除外）を要約したコメントを修正 PR 発行時に投稿する。
- FR-7c: スコープ外として確定した別起票候補は「スコープ外（別 Issue 起票）」節に列挙のとおり。

## 非機能要件

- NFR-1: 全修正は TDD 既定（`cid:code-generation:tdd-default-with-narrow-exceptions`）。合意済み seam へ失敗テストを
  1件ずつ追加して Red 実測 → 最小実装で Green。ゲート系修正（FR-1/FR-5/FR-6）は落ちる実証
  （失敗ケース注入で実際に赤くなること）を必須とする。
- NFR-2: PR/CI 基準は現行のブロッキング集合全体（typecheck / lint / 隔離2回ビルド再現性 / source-only:check /
  グラフ不変量 / run-tests --ci / Project & Patch Coverage Gate / plugin-conformance-e2e）。
- NFR-3: `packages/framework/core/` 変更後は `bun run build` を実行し追跡ファイル不変を確認（manifest 発見の全ハーネス対象）。
- NFR-4: 監査 append-only を破らない。歴史的データ（選挙 58 行・監査 Error 1 行）の遡及 rewrite はしない。
- NFR-5: FR-3 の公開契約変更は SKILL.md・docs・tests を同一 PR で同期し、`cid:requirements-analysis:docs-language-ownership`
  に従い docs は英語正本（`amadeus/**/*.md` の record は日本語）。

## 制約

- C-1: 1 Issue = 1 Unit を原則とし（`cid:reverse-engineering:free_text_1`）、複数 Issue を単一 PR に束ねない。
- C-2: Bolt ごとに PR（`cid:units-generation:c1`）。ソロモードでも Bolt 実装は worktree 分離
  （`cid:code-generation:solo-bolt-worktree-required`）。
- C-3: PR マージは人間承認（no-AI-merge）。full autonomy の禁止効果 `irreversible` に該当し自動化されない。
- C-4: FR-2 と FR-1 は `amadeus-election-*` / `amadeus-reviewer-runtime` で patch 面が交差しないが、
  FR-3 は `amadeus-orchestrate.ts` + `amadeus-state.ts` を触るため、同ファイルを触る他 Bolt と直列化判定を行う
  （交差判定は静的目録でなく実 diff、`cid:code-generation:c6`）。
- C-5: coverage 計測は branch ごとに単独所有（`cid:code-generation:c1-coverage-single-owner`）。

## 前提

- A-1: クロスレビュー2名の実測（fabrication 再現・58行走査・AST 全数走査・blame）は RE で verbatim スポット再実測済みであり、
  requirements の一次根拠として有効。
- A-2: `review..observed` 区間で患部無変更のため、本書の file:line は observed でそのまま解決する。
  実装時に base が前進した場合は `cid:code-generation:base-advance-regrounding` に従い再接地する。
- A-3: formal-model-check のローカル実行は JDK 26.0.1（mise `java@temurin-26.0.1+8` を `mise exec` で束ねる）で可能。
  グローバル mise が 26.0.2 を aggressive activate しているため、素の `JAVA_HOME` export は上書きされる。

## スコープ外（別 Issue 起票）

1. #2251 の未発火同型2面（`amadeus-orchestrate.ts:3020` / `:4970`）の typed directive 化
2. #2145 の同根陳腐化 — sensor manifest 4件（`amadeus-docs/.amadeus-sensors/` 記載）と knowledge 3件
   （`ai-dlc-principles.md:13` / `audit-format.md:146,:232`（legacy fallback 意図保持）/ `worktree-info-schema.md:42`）
3. #1953 レビューの SR-1 — carrier approve が swarm ガードを迂回する経路
4. `pi` ハーネスに §12a reviewer 契約が丸ごと不在（ハーネス parity 差）
5. Traceability Matrix の実装（#624 へ委譲済み）
6. 選挙台帳の歴史的矛盾 58 行の遡及是正（監査 append-only）
7. formal-model-check の JDK パッチ版ピン（26.0.1 固定）が Temurin patch bump でローカル実行を壊す件
8. advisory run-now receipt が環境不能時に in-band で引き返せない件（correct-misattributed は未提示専用）
9. Intent autonomy が「full 指示 + Autonomy: none」の不整合を無警告で通す件（本セッションで実測）

## 未解決の質問

- OQ-1: FR-3 の新 directive kind の名称・payload 形状は functional-design で確定する（本書は「error でない typed な待ち状態」までを固定）。
- OQ-2: FR-1 の invocation store の配置（record 配下のパス・gitignore 対象か）は functional-design で確定する。
- OQ-3: FR-5 の generation の具体形（計画 SHA か単調カウンタか）は functional-design で確定する。
- OQ-4: FR-2f の spec 改訂要否は実装差分を見て判定する（受理軸への移行が FormalElection の状態機械に影響するか）。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-05T08:52:58Z
- **Iteration:** 1
- **Scope decision:** none

All 7 mandated Step-10 sections present and substantive; every FR traces to its recorded ruling (Q1-Q7 incl. Q3b/Q4b/Q5b/Q6b); no undeclared decisions; consumed codekb artifacts substantively used; t234 pinned-test revision declared explicitly. Two FOLLOW-UP clarifications, neither blocking. READY.

### Findings

- FOLLOW-UP | requirements.md FR-1e: state whether any existing t245 assertion pins the vulnerable early-return behaviour (declare an explicit contract revision like FR-2d) or whether the t245 change is purely additive — resolve in functional-design.
- FOLLOW-UP | requirements.md FR-7: add a checkable acceptance line (GitHub label state for #2147/#1946; each Issue's PR references the ruling) and clarify FR-7 items execute per-Bolt at PR time, consistent with C-1 (1 Issue = 1 Unit).
