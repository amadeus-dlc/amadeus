# Requirements — formal-verif-value-chain

上流入力(consumes 全数): intent-statement, scope-document, business-overview, architecture, code-structure

## 承認系譜

- intent-statement(`../../ideation/intent-capture/intent-statement.md`)の成功指標5件と Won't 境界(Q2 裁定 2026-07-31)を本要件の枠とする
- scope-document(`../../ideation/scope-definition/scope-document.md`)の WS-A〜WS-D 分類と順序裁定(dependency+risk-first)を継承する
- 本ステージのグリリング Q1〜Q5(2026-07-31、questions ファイル参照)が RE 裁定事項8件のうち4件を確定(Q1=群B/C帰属、Q2=群D削除範囲、Q3/Q4=advisory 発火点・チャネルの姉妹質問で同一 RE 項目、Q5=多ハーネス方式)。残り4件は §「設計段への委譲」に列挙(4+4=8)
- codekb 引用の測定 ref: HEAD `16486d3c` / observed `da51af375`(architecture.md・code-structure.md の 260731-formal-verif-value-chain 節、business-overview.md の価値チェーン3切断点節)

## FR-A: 配布自立化(#1829、WS-A — 先行)

- **FR-A1(移設)**: `scripts/formal-verif/` の分類 A(16)+B(7)+C(1)= 24 ファイルをプラグイン所有ツリー `plugins/formal-model-check/tools/` へ移設する(Q1=A 全移設)。**移設対象ファイルの台帳エントリ(coverage-patch-allowlist / complexity-baseline)の機械 remap は本 FR に含める** — 移設により旧パスが LCOV から消えた時点で stale 検査が fail-closed で赤になるため、remap は移設と同一変更でなければ FR-A1 自体の検証(全ゲート green)が成立しない(FD u1 reviewer の実測指摘による帰属改訂 2026-07-31、ユーザー裁定 — 当初は FR-A5 帰属)。ディレクトリの完全消滅は FR-A5(残骸削除)完了時に成立する(units-generation reviewer 指摘による帰属精密化 2026-07-31 — intent 全体の終状態は不変)。
  - AC: 移設 24 ファイルがプラグイン配下に実在し、`bun` で runner が実行可能。移設対象分の台帳エントリが新パスへ remap 済みで stale 0。`test -d scripts/formal-verif` exit 1 は FR-A5 の AC へ帰属。
- **FR-A2(stage 参照書き換え)**: stage 本文の `scripts/formal-verif/` 参照 2 箇所(`plugins/formal-model-check/stages/formal-model-check.md:12` / `:41`)をプラグイン相対パスへ書き換え、compose 済みコピー・staging・stage-graph.json・dist 全変種へ同一変更で伝播する。
  - AC: `grep -rn "scripts/formal-verif" plugins/ dist/plugins/ .claude/plugins/ .claude/.amadeus-plugin-src/` が 0 件(検査面は plugin 配布面に限定 — codekb・record の説明散文は対象外: cid:requirements-analysis:c1-ac-grep-surface-scope)。
- **FR-A3(tools 配布経路)**: compose がプラグイン tools を host へ配布できる機構を新設する(現状 manifest に tools 語彙なし・composeWriteSet は stage/seam/fragment のみ — 実測 amadeus-plugin-compose.ts:330-334 / :1021-1037)。スキーマの具体形(`tools` フィールド新設か別形)は設計段判断。
  - AC: compose 後の host に runner 一式が実在し、stage 本文の指示コマンドが配布先で解決する。
- **FR-A4(CI 付け替え)**: `.github/workflows/ci.yml`(job キー :545、消費 :584/:600)を移設後パスへ付け替える。ジョブの検証意味論(run→verify、evidence upload、exit 分岐)は不変。
  - AC: workflow_dispatch での formal-model-check ジョブが移設後パスで green(または等価のローカル再現で run/verify exit 0)。
- **FR-A5(残骸削除)**: 分類 D 30 ファイル+参照テスト・fixture・support を削除する(Q2=A 全削除)。complexity-baseline・coverage-patch-allowlist の**分類 D 分エントリの削除**を同一変更で整理する(対象は実装時 grep で機械算出 — 固定行番号列挙はしない)。分類 A/B/C(移設・非削除)の台帳エントリの remap は FR-A1 へ帰属改訂(2026-07-31 ユーザー裁定 — 上記 FR-A1 参照。cid:code-generation:c1-allowlist-mechanical-remap)。
  - AC: 削除後に `bash tests/run-tests.sh --ci` green、baseline/allowlist に stale エントリ 0(stale 検査+reason 直読照合)、`test -d scripts/formal-verif` が exit 1(FR-A1 から帰属移動)。
- **FR-A6(境界ガード)**: 配布 plugin(dist/plugins/ 全変種+plugins/ 正本)が repo-only パス(`scripts/` 等)を参照したら赤になる検査を t258 同型で新設する。落ちる実証(注入→赤→revert の1セット、falling-proof-injection-one-set)必須。
  - AC: ガードテストが CI に載り、`scripts/` 参照の注入で実際に赤くなる実証記録が record に残る。

## FR-B: 価値到達面(#1738 (a)(b)、WS-B)

- **FR-B1(一括 compose verb)**: 検出された全現存ハーネスツリーへの一括 compose verb を新設する(Q5=A。個別 compose は維持)。導入は明示 verb 実行時のみ(SessionStart 自動化はしない — P4)。
  - AC: 本 repo の全現存ハーネスツリーで composition record が composed を示し、stage 到達が成立する。
- **FR-B2(advisories 構造化フィールド)**: `next` の directive JSON に `advisories: [...]` フィールドを追加し(Q4=A)、conductor がユーザーへ提示する規範を stage-protocol 側に追記する。stderr 1行は併用維持。既存 directive 消費側(テスト・ツール)の parse 方式は変更前に repo grep で棚卸しする(stderr-addition-consumer-grep の stdout 面適用)。
  - AC: advisory 発火条件下で next の stdout JSON に advisories が載り、既存 directive parse テストが green。
- **FR-B3(発火点3点+ラッチ)**: チェックポイント1(requirements-analysis directive 発行前)・チェックポイント2(functional-design directive 発行前)を新設し、既存の build-and-test 前は最終安全網として維持する(Q3=A)。複数呼出化に伴い run 単位ラッチ(同一 advisory の重複提示抑止)を導入する。
  - AC: 各発火点の発火/沈黙(changed / never-run / current)がテストで固定され、同一 run 内の重複が抑止される。

## FR-C: モデル工程(#1738 (c)、WS-C)

- **FR-C1(モデル追従工程)**: model-completeness sensor の検出(SOURCE_DRIFT / ドリフト)を是正へ繋ぐ工程を文書化し、FR-D の `--impl-only` を正規復旧手段として組み込む。
- **FR-C2(モデル供給工程)**: 新規プロトコルへモデルを供給する工程(題材選定→有限ドメイン縮約→invariant 導出→model-map 登録→TLC 完走→落ちる実証→人間ゲート)を文書化する。invariant には出典(FR/cid/裁定)をコメントで焼き込む(#1738 (c) 裁定)。
- **FR-C3(mirror lifecycle 新規モデル)**: mirror lifecycle の TLA+ モデル(.tla + .cfg + model-map エントリ)を1本書き起こす(scope Q2=A)。invariant 候補は (i) close-after-landing 順序クラス(#1816/#1607)(ii) 重複 create 禁止(#1838: issueNumber 記録済みなら create を再選択しない — 実測機序 amadeus-mirror-coordinator.ts:235 の固定写像)。有限ドメインは RE 実測(operation 3 / boundary 6 / receipt status 7・終端4 / effect 3 / 遷移 21 種 / ガード4本)から縮約する。
  - AC(完成条件、#1738 (c) 裁定どおり): (i) TLC 完全探索の完走(completion marker + state 統計 — finite-exploration-not-detected-proof 準拠)(ii) 落ちる実証 — 既知バグ(#1816 または #1838 の順序/重複クラス)を注入したモデル変種で invariant 違反の反例トレースが実際に出る (iii) 人間ゲートのレビュー承認。
  - 注: #1838 の**実装修正**は本 intent スコープ外(scope-document Won't)。モデルは現実装の欠陥を invariant 違反として検出する側に立つ — モデルが「あるべき仕様」を、実装トレースが反例を与える。

## FR-D: 運用経路(#1510、WS-D)

- **FR-D1(--impl-only モード)**: `updateModelMap` に impl-hash-only refresh モードを追加する(intent-capture Q1=A)。モデル意味論に影響しない旨の明示宣言を要求し、拒否でなく監査行付きで entries[].sha256 を更新する。model/cfg identity が変わっている場合は従来経路(MODEL_UNCHANGED 判定は amadeus-sensor-model-completeness.ts:650-659 実測)。
  - AC: impl のみ変更 → SOURCE_DRIFT 赤 → `--impl-only` 実行 → 監査行が記録され check green、の一連がテストで固定される。宣言なし実行は拒否される。
- **FR-D2(案内メッセージ)**: SOURCE_DRIFT 検出時の案内(tla-model-loader-internal.ts:232 系の detail またはセンサー manifest 文書)に正規手順(`--impl-only`)を明記する。
  - AC: SOURCE_DRIFT の利用者可視メッセージ/文書から正規手順へ到達できる。

## FR-E: e2e 受け入れ実測(#1738 (d))

- **FR-E1**: 実 spec 変更 → advisories フィールド消費 → formal-model-check ステージ起動 → 検証結果到達を、audit イベント(formal-model-check ステージイベント ≥1 件)で実測する。
- **FR-E2**: チェックポイント1経由(要件矛盾の検出→是正)とチェックポイント2経由(設計矛盾の検出→是正)の両貫通を実測に含める。
- **FR-E3**: FR-C3 の新規モデルが実プロトコル(mirror lifecycle)で検証結果に到達する。
- 機構テスト green のみでの完了扱いは不可(cid:intent-capture:ux-first-scope-for-distribution-intents)。

## NFR

- **NFR-1(検証二層)**: 日常 CI は既存の typecheck / lint / dist:check / promote:self:check / run-tests.sh --ci を維持し、TLC 完全探索は専用ジョブ(workflow_dispatch)のまま(two-layer-verification-posture 既決)。
- **NFR-2(TDD)**: 実行可能な振る舞いの追加・変更は TDD 既定(cid:code-generation:tdd-default-with-narrow-exceptions)。純移設(挙動不変)は適用外だが前後 green+drift check 必須。
- **NFR-3(配布同期)**: 正本変更は 7 ハーネス dist+self-install を同一変更で再生成(bt-dist-regen-seven-harnesses)。
- **NFR-4(台帳整合)**: allowlist は行シフトを跨ぐ変更で全エントリ機械 remap+reason 直読照合(c1-allowlist-mechanical-remap)。complexity-baseline は ordinal 照合(complexity-baseline-ordinal)。
- **NFR-5(ゲート実効)**: 新設ガード(FR-A6)は落ちる実証+正当な既存データで赤くならない corpus sweep の両側実測(corpus-sweep-for-new-guards)。

## 設計段への委譲(RE 裁定事項の残り4件)

1. manifest スキーマ拡張の形(`tools` フィールド新設か stages の一般化か)— FR-A3 の実現手段
2. `canonical.ts` の外部依存1本(`packages/framework/core/tools/amadeus-formal-verif-model-map.ts`)の扱い(同伴複製 / core 残置参照 / 逆向き移設)
3. mirror モデルの有限化定数(receipts 数の上限 — 実装は MAX_RECEIPTS=1000、モデル値は小さく採る)
4. mirror model-map エントリの正準 impl 集合(第一候補: amadeus-mirror-state-reducer.ts + amadeus-mirror-types.ts — RE 実測で骨格が閉じる)

## Won't(再掲・変更なし)

#1543 / #1735 / #1838 実装修正 / telemetry・汎用 adapter・外部 messaging(scope-document 準拠)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-31T10:01:57Z
- **Iteration:** 1
- **Scope decision:** none

READY(GoA 2 条件付き)。上流全数トレース成立・裁定転記誤帰属なし・引用全数逐語一致。Finding 1 Major(裁定件数 5→4 の算術誤り)と Finding 2 Minor(contract.ts baseline remap 未明記)は conductor が即時是正し独立再検証済み(4+4=8 表記化・contract.ts 2 件の実測確認)。UTC 2026-07-31T10:00:32Z

### Findings

- Major: requirements.md:9 の「8件のうち5件確定」は算術不成立(正=4件、Q3/Q4 は同一 RE 項目)— 是正済み
- Minor: FR-A5 に分類 A(contract.ts)の complexity-baseline エントリ 2 件の remap 未明記 — 是正済み
