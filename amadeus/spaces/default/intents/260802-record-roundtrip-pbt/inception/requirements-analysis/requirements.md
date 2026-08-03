# Requirements — record-roundtrip-pbt (#1980)

上流入力(consumes 全数): intent-statement.md(問題定義・成功指標・ユーザー裁定3件)、scope-document.md(In/Out 境界・順序方針 Q1=A・AC-2 第一候補 Q2=A)、business-overview.md(7ハーネス配布の製品前提)、architecture.md(4境界 seam ペアと読み側3層の硬さ分布)、code-structure.md(患部配置・区間 touch 判定・行シフト再解決表)

測定 ref: 本書の file:line はすべて RE observed `9750f8aea`(= 作業ツリー HEAD の患部同一断面)で再解決済み(codekb/amadeus/re-scans/260802-record-roundtrip-pbt.md の引用再確認テーブル準拠)。

## Intent analysis

記録系(mirror / state / audit / election)の永続化境界では、書き手側だけがバリデータを通り、読み戻し側が素通りする非対称が実在する。決定的実測: `Election.parse` のプロダクション呼出は発行側 `packages/framework/core/tools/amadeus-election.ts:310`(open)/ `:433`(vote)の2箇所のみで、消費側(status/tally/verify)が通る `Store.load`(`amadeus-election-store.ts:503-510`)は `readJson<T>` の `:80` `return ok(JSON.parse(text) as T);` による無検査キャスト。#1459 で `Election.parse` に入った硬化(重複 internalNo 検出 `amadeus-election-model.ts:65` / 空 choices 拒否 `:77` ほか)を読み戻し経路が一切通らない。この「修正しても読み側が素通りする」構造を、(1) 発行⇔消費が同一バリデータを食う一本化+読み側 fail-closed 化、(2) write⇔read round-trip PBT + fail-closed PBT の常駐、(3) 非経由経路の静的ガード、の3層で閉じる。

ゴールは機能追加ではなく再発様式の根絶であり、姉妹施策(#1979 無音化ゲート / #1981 形式検証)との分担は Out of scope 節に固定する。

## Functional requirements

### FR-1: election 境界の読み側 fail-closed 一本化(Must・Bolt 1 = walking skeleton)

- FR-1a: `Store.load` が経由する election ファイルの読み戻しは `Election.parse`(`amadeus-election-model.ts:100`)を必ず通る構造へ改修する。無検査キャスト `JSON.parse(text) as T`(`amadeus-election-store.ts:80`)を election ファイルの読取経路で廃す(他ファイル種の readJson 利用は FR-3 のガード母集団で扱い、本 FR では election に限定)。
- FR-1b: 不正な台帳(重複 internalNo・重複 voter・空 choices・壊れた JSON・型不一致)の読取は fail-closed で棄却し、既存の `err("corrupt")` 系の loud な失敗経路へ落とす。無音の部分受理を作らない。
- FR-1c: 受け入れ = fail-closed プロパティ(FR-4)が読取経路経由で green、かつ #1459 の再現入力(重複 internalNo 等)が読取経路で棄却されること(AC-2)。

### FR-2: state 境界の round-trip 対象化(Must)

- FR-2a: 構造フィールド層 — `serializeMirrorBoundaryReceipts`(`amadeus-state.ts:278`)⇔ `parseMirrorBoundaryReceipts`(`:239`)。読み側は既に fail-closed(5 throw 分岐 = 重複 phase `:248` / 不正 JSON `:257` / 非オブジェクト `:261` / 未知 phase `:266` / 不正 status `:270` — いずれもメッセージ実文行)。書き手は `MIRROR_BOUNDARY_PHASES`(`:225`)順への正規化書き手であるため、round-trip プロパティは「正規化後の同値」(`parse ∘ serialize = normalize`、正規化済み入力上では id)で張る。
- FR-2b: テキストフィールド層 — `setField`(`amadeus-lib.ts:5237`)⇔ `getField`(`:5179`)。round-trip はフィールド実在ドメイン上の条件付き(`getField ∘ setField = value`、`.trim()` 込みの現行意味論)で張る。**`setField` のフィールド不在時サイレント no-op という現行挙動は本 intent では変更しない**(Assumptions A-2)。
- FR-2c: fail-closed 側は既存 throw 分岐(FR-2a の5分岐)を否定側プロパティでピンする(任意の非適合入力が必ず throw)。

### FR-3: バリデータ非経由経路の静的ガード(Must)

- FR-3a: 「共有バリデータを経由しない読み戻し経路」の残存を検出する専用静的ガードを `tests/callsite-guard.ts`(shrink-only ratchet、`:4` `:21-22` の既習様式)同型の allowlist ratchet として追加する — 新規違反のみ fail、既存残存は allowlist に固定して縮小方向のみ許す。
- FR-3b: 検出述語の候補母集団は `JSON.parse(...) as` 型の無検査キャスト(RE 実測: 8箇所/5ファイル — 単一行正規表現の限界は成果物に明記済み)。正確な述語設計(AST か regex か)は application-design で確定する。
- FR-3c: 落ちる実証必須 — 違反を注入して実際に赤くなること、注入は「テストが実際に読む面」かつ実行時に消費される行へ(cid:code-generation:injection-surface-verify / inject-runtime-consumed-lines)、赤の実測→revert までを不可分1セットで(falling-proof-injection-one-set)。

### FR-4: PBT の常駐(Must)

- FR-4a: state / election の各1境界以上に **round-trip プロパティ**(符号化層の全単射性 — メタモルフィックで独立オラクル不要)と **fail-closed プロパティ**(任意の非適合入力を被検バリデータ自身が棄却 — 棄却規則をテスト側で再実装しない。cid:build-and-test:pbt-oracle-cancellation)の2種を書き分けて追加する。
- FR-4b: `test:ci`(= smoke+unit+integration、`tests/run-tests.ts:117`)で実行される。純関数層は `tests/unit/`、実 FS を使う検証は `tests/integration/`(cid:code-generation:fs-tests-integration-first)。arbitrary は `tests/helpers/arbitraries/` へ追加。
- FR-4c: seed / numRuns は既存規約準拠 — PR CI = `PBT_SEED` 固定・numRuns 100、深掘りは `AMADEUS_PBT_DEEP=1` 階層で分離し失敗 seed をログ化(t204:16-28 の規約ヘッダが canonical。既存記録系 PBT 4本が規約第4項未充足という RE 所見があるため、新規分は4項全充足で書く)。
- FR-4d: 既知バグ再現 — #1459 の shrink 最小反例を読取経路の fail-closed プロパティで実測しテストへ固定する(AC-2 第一候補 = scope-definition Q2=A。#1547 pre-fix 面切替は第二候補であり必須にしない)。

### FR-5: 深掘り実行の最小形(Must)

- FR-5a: `workflow_dispatch` の手動トリガで `AMADEUS_PBT_DEEP=1` 階層を実行し、失敗 seed をジョブログへ可視化する最小 CI 面を新設する(intent-capture Q3=C。schedule 化は Out)。
- FR-5b: 既存 CI のブロッキング集合には加えない(非 blocking の手動 QA モード)。

### FR-6: 軽量台帳(Must・文書)

- FR-6a: 直接根拠9件(#1904 #1878 #1946 #1953 #1906 #1860 #1459 #1547 #1871)+射程判定(射程内/部分/射程外→分担先)を `amadeus/spaces/default/intents/260802-record-roundtrip-pbt/bug-scope-ledger.md` として固定する(intent-capture Q1=C。44件全量は #1979 へ)。合否 = 当該パスの実在+9件全 Issue 番号の記載+各件の射程判定1行。

### FR-7: mirror property 化(Could)

- FR-7a: 余力がある場合のみ、t274 の render→parse round-trip(`:58`、example-based)の property 版+妥当 snapshot の arbitrary を追加する(intent-capture Q2=B)。未実施でも本 intent は完了とする。

## Non-functional requirements

- NFR-1(投影同期): FR-1 のコア改修は `packages/framework/core/tools/` 配下のため、dist **7ハーネス全て**の再生成(project.md Mandated — 5面で止めると kiro/kiro-ide DIFFERS)+ `dist:check` / `promote:self:check` green を出荷条件とする。
- NFR-2(coverage): コア改修行は coverage patch ゲートの母集団に入る。spawn 盲点を踏まないよう in-process seam を実装時点で設計し(cid:requirements-analysis:bun-coverage-spawn-blindspot)、push 前にローカル lcov で diff 追加行未カバー 0 を実測する(cid:code-generation:local-lcov-pre-push)。
- NFR-3(境界契約): 出荷 core/tools は `scripts/` を参照しない(`t258-boundary-guard`)。コメント・文字列にも repo-only パストークンを書かない(cid:code-generation:c1-1569-shipped-comment-vocab)。
- NFR-4(決定性): PR CI の PBT は固定 seed で決定的に再現可能であること。実行時間の合否基準: 新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**(実測基準: 既存 PBT 4本 = unit 側 t204/t352/setup-semver/setup-manifest の直接実行 151ms — `Ran 23 tests across 4 files. [151.00ms]`、測定 ref = 作業ツリー 2026-08-02。10倍超のマージンを持つ上限として設定した派生値)。
- NFR-5(既存ゲート): coverage(project/patch/relative)・complexity・dist/self-install drift・plugin-conformance-e2e を含む現行ブロッキング集合全緑を維持する。

## Constraints

- C-1: TDD 既定(cid:code-generation:tdd-default-with-narrow-exceptions) — 実行可能な振る舞いの追加・変更(FR-1 の fail-closed 化、FR-3 のガード)は失敗テスト先行の Red→Green で実装する。PBT 追加自体も対象境界の seam へ失敗プロパティを先に張れる場合は Red を実測する。
- C-2: 正本は `packages/framework/core/tools/`、dist は生成物(手編集禁止)。`bun scripts/package.ts` + `bun run promote:self` で同期。
- C-3: walking skeleton — self-feature スコープのため Bolt 1(election スライス)は単独・ゲート付きで実行し、ユーザー承認後に残り Bolt へ進む(org.md)。
- C-4: バリデータ一本化は境界ごと(4境界で単一の汎用バリデータは作らない — Issue 本文の確定裁定)。
- C-5: リリース非接触 — バージョン・バッジ・リリースノートに触れない(project.md Mandated)。

## Assumptions

- A-1: import 流儀(dist 出荷コピー import = t204/t352/t364 系 vs core 正本 import = t274 系)の統一方針は application-design で確定し成果物に明記する(Issue 本文が設計段判断と明示。cid:code-generation:golden-regen-from-shipped-surface の判断を実装段へ丸投げしない)。
- A-2: `setField` のフィールド不在時サイレント no-op(`amadeus-lib.ts:5237` — 呼び手が `setFieldStrict` `:5271` と使い分ける現行設計)は仕様として維持する。挙動変更はユーザー可視契約の変更に当たるため本 intent では行わない(必要なら正準リスト(4)のユーザーエスカレーション事項として別途起票)。
- A-3: `readJson<T>` の汎用形は他ファイル種(ledger.json 等)でも使われる。FR-1 は election ファイルの読取経路のみを一本化し、残余は FR-3 の allowlist ratchet が可視化・縮小方向で管理する。
- A-4: レビュー対象 SHA `8e5dc6c4` と observed `9750f8aea` の間で患部の実質変更はない(RE 区間 touch 判定: 患部10パス中 touch は amadeus-lib.ts/amadeus-audit.ts 各1、いずれも患部外変更。行シフトは再解決済み)。

## Out of scope

- #688/#697 完了済み領域(setup manifest/semver、audit escape、journal codec)の再拡充
- mirror / audit のコーデック層の再被覆(既存 t274 / t204 / t352 / t364 の内側)
- 射程外バグ族: #1878(戻り値破棄=無音化)→ #1979 / #1860・#1906(状態機械・並行性)→ #1981 / #1953(意味論的鮮度)→ 個別修正
- 44件全量の分類台帳化(#1979 へ)
- 深掘りジョブの schedule 化(別 Issue)
- crash-consistency(`writeStoreFile` `amadeus-election-store.ts:60` の tmp→rename に対する読み側耐性)— 将来課題として記録のみ
- `setField` の意味論変更(A-2)
- Amadeus ランタイム・ステージ挙動の変更、ハーネス出力の意図的変更

## Open questions

- OQ-1(設計段へ): 新規 PBT の import 流儀の統一先(A-1)— application-design の ADR で確定する。
- OQ-2(設計段へ): FR-3 の検出述語の実装形(AST 走査 か 多行対応 regex か)と allowlist の粒度(ファイル単位か callsite 単位か)。
- OQ-3(実装段へ): FR-5 の workflow ファイルを既存 ci.yml への job 追加とするか独立 workflow ファイルとするか(既存 workflow 二重生成禁止 — cid:ci-pipeline:c2 — に反しない形を design で確認)。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T17:07:28Z
- **Iteration:** 1
- **Scope decision:** none

必須7節が全て揃い、上流成果物からのユーザー裁定・境界確定は file:line 付きで転記済みで無申告逸脱なし。Minor 2件(NFR-4 の実行時間閾値・FR-6a の格納パス)は conductor が実測基準値とパス指定で是正済み。GoA 1-2 相当の READY。

### Findings

- [Minor] requirements.md NFR-4 — 「同水準」が測定可能な閾値を伴わない曖昧表現(是正: 既存4本 151ms 実測を基準に2秒上限を明記)
- [Minor] requirements.md FR-6a — 台帳の格納パス未指定で合否判定が緩い(是正: bug-scope-ledger.md のパスと合否基準を明記)
