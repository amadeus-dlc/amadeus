# Pi 利用者・保守者ガイド — Business Rules

## 目的と上流トレーサビリティ

この設計は `unit-of-work` の `pi-user-maintainer-guides`、`unit-of-work-story-map` の SCN-009 / FR-VAL-003〜004 / NFR-SEC-003、`requirements` の M10 を実装可能な規則へ落とす。`components` と `component-methods` が定める manifest / lifecycle / child driver / doctor / distribution の公開契約を説明対象とし、`services` が定める短命 CLI・extension・child process の境界を変えない。文書 Unit は runtime service を追加せず、実装 catalog の読み取りと文書検査だけを所有する。

## 文書集合と責務

| Document ID | 予定配置 | 読者 | 必須責務 |
|---|---|---|---|
| `pi.user.en` | `docs/guide/harnesses/pi-coding-agent.md` | Pi 利用者 | 安全な導入、起動、gate、診断、更新、削除 |
| `pi.user.ja` | `docs/guide/harnesses/pi-coding-agent.ja.md` | Pi 利用者 | `pi.user.en` と同じ contract ID 集合 |
| `pi.maintainer.en` | `docs/harness-engineering/10-pi-coding-agent.md` | 移植・保守担当 | registration / event / driver / test / generated inventory |
| `pi.maintainer.ja` | `docs/harness-engineering/10-pi-coding-agent.ja.md` | 移植・保守担当 | `pi.maintainer.en` と同じ contract ID 集合 |

英語を既存 `docs/` の正本言語、`*.ja.md` を日本語投影とするが、片側だけを遅延更新してよいという意味ではない。四文書と該当 index は同一変更で着地させる。

## 利用者ガイド必須規則

### BR-GDE-001 前提条件

利用者ガイドは Pi Coding Agent `>=0.83.0`、Bun、macOS / Linux、利用可能な provider / auth を明示する。native Windows は正式非対応であり、成功手順として表現しない。version は `pi --version` の出力で確認させ、install path のディレクトリ名から推定させない。

### BR-GDE-002 Trust 境界

project-local `.pi/settings.json`、resource、package、extension は Pi の project trust 後に読み込まれることを説明する。`--approve` は当該 command の trust、`--no-approve` は project-local 面の無視であり、Amadeus が trust を自動承認・迂回しないことを明記する。trust は sandbox ではなく、モデルが利用できる host tool 権限も制限しない。

### BR-GDE-003 二つの導入経路

setup CLI と Pi Package の local / git を別手順として説明し、同時に両者が同じ正準 candidate content を投影することを明記する。利用者が混在導入を避けられるよう、どちらを選ぶか、現在の導入元を `pi list` と doctor で確認する方法、source identity が一致しない二重登録を解消する方法を示す。

Pi Package の例は Pi 0.83.0 の公開 CLI 契約に従い、project-local 導入では `-l` を使う。git の再現可能な例は `git:<repository>@<commit-or-tag>` 形式で pin し、可動 branch を正式検証の基準にしない。local path はコピーではなく settings から参照されるため、source directory の移動・削除が導入を壊すことも説明する。

### BR-GDE-004 起動と workflow command

Pi TUI で Amadeus skill を発見し、status / doctor /通常 workflow を開始する最短経路を示す。実際の skill invocation 名と stage runner 名は `PiHarnessManifestCatalog` から取得し、文書へ手書きした固定 runner 数を置かない。非対話 RPC / print 経路を人間 gate の代用として説明してはならない。

### BR-GDE-005 Gate と human presence

HUMAN_TURN と gate approval は `input.source = interactive` の Pi TUI 入力だけから成立し、RPC、extension-generated input、再生 event は承認にならないことを説明する。gate 未回答の session 終了は awaiting を維持し、再開時に人間が回答する。文書は bypass flag や自動承認手順を提供しない。

### BR-GDE-006 Failure と doctor

失敗節は少なくとも version 不足、native Windows、untrusted project、skill / lifecycle extension / package / child driver の欠落、provider / auth 不足を区別する。doctor の各結果は check ID、observed、expected、remediation を持つ。blocked workflow でも status / doctor は読み取り専用で実行できるが、doctor が trust、file、provider 設定を修復すると記述してはならない。

### BR-GDE-007 Update と uninstall

Pi Package は `pi update --extension <source>` または `pi update <source>`、project-local 削除は `pi remove <source> -l`（`pi uninstall` は alias）を説明する。setup CLI はその CLI が公開する update / uninstall command を正準 manifest から転記する。更新前に source/ref と差分を確認し、更新後に doctor と status を実行する。削除後も利用者管理ファイルや Amadeus record が残る場合は、管理対象と非管理対象を分けて説明し、手動 recursive delete を安易に提示しない。

### BR-GDE-008 対象外

npm publish、native Windows formal support、trust の自動承認、provider credential 配布、日常 CI の skip を正式 green evidence とすること、Pi private API 依存は対象外として列挙する。

### BR-GDE-009 Supply chain

install 手順より前に、Pi Package extension が利用者権限で任意コードを実行し、skill がモデルへ executable 実行を含む操作を指示でき、git / npm package install が依存 install script を起動し得ることを目立つ警告として置く。source review、信頼できる origin、commit/tag pin、更新差分確認、最小権限の実行環境、remove 手順を一連の対策として示す。project trust はこのリスクを除去する sandbox ではない。

## 保守者ガイド必須規則

### BR-MNT-001 Machine catalog が正本

保守者ガイドは次の category を `PiPortingCatalogProjection` から投影する。文書中の ID set と正準 catalog の ID set は完全一致しなければならない。

| Category | 正準 source | 文書が示す内容 |
|---|---|---|
| `registration` | `PiHarnessManifestCatalog` と projection consumer registry | authored source、registration seam、generated destination、owner |
| `event` | lifecycle adapter の versioned canonical event catalog | native event、canonical event、presence / mutation policy、fixture |
| `driver` | child driver capability catalog | RPC handshake、terminal result、deadline / cancel / kill、audit fact |
| `test` | 各 Unit の exported test inventory | contract / integration / live / dogfood の owner と実行条件 |
| `generated` | packager output inventory | authored source、generated path、generator、drift command |

catalog 自体の取得失敗、schema / version / digest 不一致は検査失敗であり、文書内の列挙へ fallback しない。document parser が未知 ID を見つけた場合も、将来項目として無視せず失敗する。

### BR-MNT-002 双方向 completeness

検査は `catalog - document = ∅` と `document - catalog = ∅` の両方を要求する。前者は登録漏れ、後者は削除済み・架空の surface の記載を検出する。固定件数は合格条件にせず、集合そのものを比較する。

### BR-MNT-003 Checklist は検証動詞を持つ

各 registration entry は「追加する」だけでなく、対応する検出 command / test、mutation 時の期待 failure、generated surface を手編集しない規則を含む。チェックボックスの手動確認だけを machine registry parity の代用にしない。

### BR-MNT-004 Evidence の所有境界

保守者ガイドは、どの Unit が captured fixture、transaction test、doctor snapshot、package parity、guide check を所有するかを示す。cross-unit integration / RPC live / TUI dogfood / formal green は `pi-conformance-evidence` 所有とし、未実施の run を green と記載しない。

## 日英同期と文書マーカー

### BR-I18N-001 Contract marker

各文書は machine-readable comment として `document-id`、`contract-version`、section / claim / command / link ID を持つ。ID は翻訳しない。例:

```markdown
<!-- pi-guide: document=pi.user.en contract=v1 -->
<!-- pi-section: prerequisites -->
<!-- pi-claim: compatibility.floor -->
```

parser は fenced code block 内の見本を除外し、本文中の marker だけを数える。marker の重複、nesting 破損、required order 逸脱を失敗にする。

### BR-I18N-002 Typed fact と semantic claim parity

section / claim ID の一致や非空 prose だけでは、同じ marker の隣に反対極性の文章を書けるため合格条件にしない。互換性、support / unsupported、trust、任意コード実行性、source、pin、update / uninstall のような compliance-critical claim は、信頼済み `PiGuideFactCatalog` に versioned typed fact として置く。

各 fact は少なくとも `subject`、列挙型 `predicate`、`operator`、`polarity`、型付き `value`、`requiredCommandIds`、`requiredLinkIds`、英日 `renderTemplateId` を持つ。例として互換性は `supported-platform in [darwin, linux]` と `supported-platform excludes [win32-native]`、supply-chain は `pi-package-extension can-execute arbitrary-code = true` の二値命題で表す。version floor は semantic version、pin は `immutable-ref-required = true` と許可 ref kind の集合で表す。

文書には手書きの marker と自由文を隣接させるのではなく、次の delimit された canonical fact block を置く。

```markdown
<!-- pi-fact:start id=compatibility.platforms schema=v1 digest=<sha256> -->
Pi Coding Agent 0.83.0 以上は macOS と Linux を正式サポートします。native Windows は未対応です。
<!-- pi-fact:payload <canonical-json-base64url> -->
<!-- pi-fact:end id=compatibility.platforms -->
```

fact block の可視文は、verifier と同じ distribution に束縛された locale renderer が typed fact と locale template から決定的に生成する。verifier は (1) 埋込 payload を信頼済み catalog の canonical payload と一致確認し、(2) digest を再計算し、(3) 可視文を再生成して byte-normalized 一致を要求する。文書内 payload を期待値へ採用しない。英日で prose は異なっても canonical payload / digest は同一で、異なるのは catalog に束縛された locale template だけである。

compliance-critical fact の normative な値・極性は canonical block だけで表現する。block 外の説明は fact ID を参照して手順・背景を補足できるが、同じ predicate の値を再定義してはならない。`NormativeFactRestatementGuard` は catalog が宣言する reserved subject / predicate / typed literal を block 外で assertion として再定義する構文を拒否する。これにより反対極性を別段落へ書いて canonical block と併存させる抜けも失敗にする。自然言語全般を推論するのではなく、contract が重要と定めた命題だけを制御された published language へ閉じ込める。

informational claim も同じ claim ID を同じ section に持ち、少なくとも一つの非空 prose block または command blockへ隣接する。空 marker や marker だけの節は失敗する。

### BR-I18N-003 Command safety

command ID ごとに shell token列の canonical form を catalog に持たせ、言語間で実行内容が変わらないようにする。placeholder は明示 token とし、実在 home path、credential、可動未pin ref を fixture へ入れない。破壊的 command は対象と効果を説明する prose claim が先行しなければならない。

### BR-I18N-004 Link integrity

相対 link は両言語で locale 対応先を持つ。外部 link は ID と canonical URL を catalog に持ち、HTTP 到達性検査は network 可用性と分離する。日常 deterministic test は repository 内 target / anchor と URL schema を検査し、外部 network failure を文書内容 failure に丸めない。

## 検証規則

### BR-TST-001 Guide contract test

`PiGuideContractVerifier` は四文書と index を読み、document ID、contract version、必須 section / claim / command / link の集合・順序・一意性、locale pair、相対 link / anchor、catalog parity を一回の structured result にする。failure は document、ID、expected、observed、remediation を返す。

### BR-TST-002 Negative fixtures

少なくとも次を実装と同じ parser で失敗させる。

- 英語だけ section / claim / command を追加または削除
- catalog registration を追加したが checklist を更新しない
- checklist entry だけを追加して machine catalog に存在しない
- target と manifest entry を同時削除する自己整合の試み
- broken relative link / anchor、重複 ID、version 不一致
- supply-chain 警告を install 手順の後ろへ移動または空洞化
- typed fact の polarity を反転し、任意コードを「実行しない」とする
- version floor、supported / unsupported platform、source kind、pin ref kind の typed value を片言語だけ変更する
- fact payload と digest を文書側で同時改変する
- canonical fact block を正しく残したまま、block 外へ反対極性の normative restatement を追加する

### BR-TST-003 Generated inventory

generated inventory は生成後の `dist/pi` を source とせず、authored manifest と generator receipt から期待集合を導出して observed dist と比較する。generated tree とその inventory を同時改変しても pass しない。`bun scripts/package.ts pi --check` と guide catalog test は別々に失敗原因を報告する。

### BR-TST-004 変更時ゲート

Pi runtime / distribution の machine catalog を変える変更は、guide contract test が該当 claim / checklist 更新なしで赤になる。docs-only 変更も当該 test を実行対象に含め、CI の `paths-ignore` で素通りさせない。

## 不変条件

1. runtime / distribution catalog にある Pi surface は、保守者チェックリストから欠落しない。
2. 保守者チェックリストにある Pi surface は、正準 machine catalog に実在する。
3. 英語と日本語は同じ contract version、semantic ID 集合、typed fact payload / digest を持ち、可視 fact 文は信頼済み locale renderer の出力と一致する。
4. install より前に supply-chain と trust 非 sandbox の警告が存在する。
5. ガイドは正式 green evidence を生成せず、`pi-conformance-evidence` の実測結果だけを参照する。
6. 文書検査は欠落 catalog、unknown schema、digest mismatch、parser error を成功や skip にしない。
7. compliance-critical predicate の値・極性は canonical fact block 以外で再定義できない。


## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:22:27Z
- **Iteration:** 1
- **Scope decision:** none

catalog・link・commandの集合検査は閉じているが、日英claimの意味と極性をmarker IDだけで自己整合させられる抜けがある。

### Findings

- BLOCKER | GuideClaimRequirementはclaimId・sourceRefs・content shapeと隣接する非空prose/codeを検査するが、期待する命題の値・極性をmachine-readableに保持していないため、同じclaim markerの隣に「Pi Packageは任意コードを実行しない」「native Windowsは正式対応」のような反対内容を書いても、日英のID集合・順序・非空条件を満たしてpassできる。これはFR-VAL-003、NFR-SEC-003、native Windows unsupported、および日英semantic同期を自己整合で迂回する。翻訳文そのものを正準化せずに閉じるには、各claimへversioned fact schema（predicate、polarity、typed values、required command/link references）を持たせ、両言語文書に同一fact payload/digestを埋めるか、共有factから検証可能なlocale別semantic anchorを定義する必要がある。反対極性・異なるversion/platform/source/pin値を置いたnegative fixtureも必須である。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-03T14:24:45Z
- **Iteration:** 2
- **Scope decision:** none

critical claimが信頼済みtyped factと決定的locale rendererへ束縛され、日英同期・極性・値・参照・警告順序の自己整合迂回が解消されている。

### Findings

- None
