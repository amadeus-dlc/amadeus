# Components — amadeus-mirror ツール

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## 構成方針

単一ファイル CLI `scripts/amadeus-mirror.ts`(既習様式 = scripts/metrics-timeseries.ts の単一ファイル形。ADR-1)。内部は関数境界で6コンポーネントに分割し、すべて export して in-process テスト可能にする(seam-export-handler-amend 準拠)。

## コンポーネント一覧(規模は概算行数 — 数値必須、inception ガードレール)

| # | コンポーネント | 責務 | 概算行数 |
|---|---|---|---|
| C1 | args-parser | argv → 判別ユニオン ArgsOutcome(parse-don't-validate)。サブコマンド+--intent フラグ | 40 |
| C2 | state-snapshot | 3ソース(summary --json / intents.json / state.md)→ MirrorSnapshot 型の組み立て。park 判定(Parked フィールド非空)含む | 90 |
| C3 | mirror-template | MirrorSnapshot → 定型3要素本文(FR-5)。状態行の生成(ADR-3) | 50 |
| C4 | gh-gateway | GhRunner port(spawn seam)。既定実装 = Bun.spawnSync(ADR-2)。認証/不在検出(FR-1.3) | 45 |
| C5 | commands | handleCreate / handleSync / handleClose(FR-2/3/4)。GhRunner 注入で純関数寄りに保つ | 120 |
| C6 | entry | main(argv): number + import.meta.main 起動(:236 様式) | 15 |

- 実装合計: **約360行**(±20%)
- テスト: unit(C1-C3 の純関数)約150行 + integration(C5 を fake GhRunner+実 FS fixture で駆動)約200行 — fs-tests-integration-first 準拠

## Reuse Inventory(再利用棚卸し)

| 既存資産 | 再利用方法 |
|---|---|
| `amadeus-lib.ts` の読み取り/純変換7シンボル(readIntentRegistry :1615 / getField :3588 / activeIntent :1059 / recordDirMatches :1574 / intentsDir :1004 / setOrInsertField :3671 / IntentRegistryEntry 型) | **import 再利用**(ADR-5、実装確定の実測値) |
| `scripts/metrics-timeseries.ts` の main/USAGE/判別ユニオン様式 | 様式踏襲(コード共有はなし — 意図が異なるため重複排除しない) |
| biome/tsconfig の scripts 配線 | そのまま収容(追加配線なし、NFR-3) |
| CI(typecheck/lint/tests) | 既存ジョブに自動収容 — 新規ジョブ・機構の導入ゼロ |

新規機構の導入は gh-gateway(gh 呼び出し)のみで、既存で代替不可(RE 重点6: repo 内に gh 前例なし)。adapter・外部契約の先行着地なし(実装+配線を同一 intent で完結)。

## Review

**Verdict: READY**

独立レビュアー(architecture-reviewer)として、5成果物(components.md / component-methods.md / services.md / component-dependency.md / decisions.md)と上流(requirements.md、scan-notes.md)を実測で突き合わせた。

### 1. 要件との整合(FR-2.2 / FR-4.1 / FR-5 / O-R1 / O-R2)

- FR-2.2(重複ガード)・FR-4.1(AND 検査)は `component-methods.md:60` に「handler 内の実行行に置く」と明記され、`MirrorSnapshot.mirrorIssue`(:31)が入力として設計に存在する。実装詳細を Functional Design へ委ねる粒度として妥当 — application-design の責務(メソッドシグネチャまで、業務ルールの詳細は含めない)と整合する。
- FR-5(定型3要素テンプレート)は C3 `renderBody` / `renderStatusLine` / `renderTitle`(component-methods.md :35-40)へ写像され、他の場所に本文生成ロジックが分散していないことを `grep -n "renderBody\|## 概要\|## Record" amadeus/.../application-design/*.md` で確認した(C3 のみに集約)。
- O-R1(状態行フォーマット)は `decisions.md` ADR-3 で確定(`**<STATUS>** — <PHASE>/<stage>(approved <n>/<total>)、更新 <ISO日時>` の具体形式まで記述)。O-R2(gh spawn 様式)は ADR-2 で確定(`Bun.spawnSync` の引数配列形・`env: process.env` 明示)。要件の Open Questions 2件は両方とも design 段で閉じている。
- FR-1.5 / C-R2(intents.json へは書かない)は5成果物全体で `grep -n "intents.json" *.md` を実行し、参照は読み取り専用の型コメント(`component-methods.md:22,30`)のみで、書き込み経路がどこにも設計されていないことを確認した。

### 2. inception ガードレール

- ADR の Context/Decision/Consequences/Alternatives Rejected は5件全てに揃っており、ADR-1・ADR-2・ADR-4・ADR-5 は代替案2件、ADR-3 は代替案2件(いずれも最低2件の基準を満たす)。Security/Compliance 欄も5件全てに記載がある。
- 規模見積り(概算360行、コンポーネント別行数の表)、reuse inventory(4行の表+新規機構の限定明示)は具備。
- **欠落(Minor)**: ステージ定義(`.claude/amadeus-common/stages/inception/application-design.md` Step 5 decisions.md 節)が要求する「Reversibility assessment(easy to change vs. locked in)」が5件のADRいずれにも存在しない(`grep -n "Reversib\|可逆\|不可逆" decisions.md` は0件)。inception phase ガードレール(`phases/inception.md`)自体はこの項目を明示要求していないため READY 判定は妨げないが、次回是正の候補として明記する。
- adapter・外部契約の先行着地なし、要求外の後方互換レイヤーなし(gh-gateway は要件 NFR-1/O-R2 に根拠を持つ唯一の新規機構)。

### 3. 機構引用の実在(独立実測)

以下をすべて実行して検証し、全件一致を確認した:
- `grep -n "^export function readIntentRegistry" packages/framework/core/tools/amadeus-lib.ts` → `1615:export function readIntentRegistry(...)`(ADR-5 引用と一致)
- `grep -n "^export function getField" packages/framework/core/tools/amadeus-lib.ts` → `3588:export function getField(...)`(FR-1.4/ADR-5 引用と一致)
- `grep -n "^export function main" scripts/metrics-timeseries.ts` → `188:export function main(argv: string[]): number {`、`grep -n "import.meta.main" scripts/metrics-timeseries.ts` → `236:if (import.meta.main) process.exit(main(...))`(components.md C6 引用と一致)
- `sed -n '3140,3153p' packages/framework/core/tools/amadeus-orchestrate.ts` → `switch (subcommand) { case "next": ... case "report": ... case "park": ... default: ... }`(FR-1.1 switch idiom 引用と一致)
- `grep -n "scripts" biome.json tsconfig.json` → `biome.json:41` の `"scripts/**"`、`tsconfig.json:19` の `"scripts/*.ts"`(NFR-3 の既存配線主張と一致)
- `packages/framework/core/tools/amadeus-lib.ts` の module-level 実測(`awk` で全トップレベル文を抽出): const/let/function/type/interface/export 宣言のみで、裸の式文(IIFE や副作用を伴う呼び出し)は0件。ADR-5 の「モジュールレベル副作用なしを実測確認済み」の主張を裏付ける。
- `grep -rn "gh" scripts/*.ts packages/framework/core/tools/*.ts` に既存の `"gh"` CLI 呼び出しは無く(0 hit)、Reuse Inventory の「RE 重点6: repo 内に gh 前例なし」と整合。加えて `scripts/package.ts:53` が `packages/framework/core/tools/amadeus-version.ts` を import している既存事例を確認し、ADR-5 の「scripts → core の import 依存」パターンに repo 内の直接前例があることも合わせて確認した(ADR-5 の Alternatives Rejected 判断を補強)。
- citation-semantics-check(引用先の意味論適合): `getField` は正規表現マッチで値が無ければ `null` を返す実装であり(:3588-3598)、FR-2.2/FR-3.3 の「フィールド不在 → exit 1」という fail-closed 判定は `snapshot.mirrorIssue === null` 分岐として自然に成立する — 引用元の分岐意味論と要件の前提が一致している。

### 4. 依存グラフの健全性

- `component-dependency.md` の Mermaid(`graph TD`)を目視構文検証 — ノード定義・矢印とも標準構文で、循環は無い(entry → {args-parser, commands} → {state-snapshot, mirror-template, gh-gateway} → state-snapshot は末端で amadeus-lib import に到達し逆流なし)。Text fallback も併記されており、フェールセーフとして機能する。
- 変更理由の凝集(表示=C3のみ、GitHub面=C4のみ、状態源=C2のみ)が明記されており、amadeus-lib への依存面も「2関数+1型のみ」に限定されている(狭い API 面)。

### 5. 実装可能性

- component-methods.md のシグネチャは判別ユニオン(`ArgsOutcome`/`SnapshotOutcome`/`GhResult`)を一貫して用い、functional-domain-modeling-ts の parse-don't-validate に沿っている。exit code 契約は `usage→2`、`handleCreate/Sync/Close→0/1`、`main→0/1/2` で一貫し、矛盾や欠落した分岐は見当たらない。
- builder が追加で判断すべき点(状態行の具体的書式、gh 引数配列の詳細、重複/AND 検査の配置)はいずれも ADR または component-methods のコメントで確定済みで、実装時に architecture へ立ち戻る必要のある未決事項は残っていない。

### 総評

Critical/Major 指摘は無し。Minor 指摘(Reversibility assessment 欄の欠落)はステージ定義の様式要求に対する軽微な不足であり、ブロッカーではない。要件トレーサビリティ、機構引用の実在性、依存グラフの健全性、実装可能性のいずれも実測で裏付けが取れたため、READY と判定する。
