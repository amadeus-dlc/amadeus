# re-scan 記録 — 260719-ballot-failclosed-amend

## 実行メタデータ

- Date: 2026-07-20(Asia/Tokyo)
- Intent: `260719-ballot-failclosed-amend`
- Issue: [#1252](https://github.com/amadeus-dlc/amadeus/issues/1252) / [#1253](https://github.com/amadeus-dlc/amadeus/issues/1253)
- Scope / project type: `amadeus` / Brownfield
- Repository / stage: `amadeus` / `reverse-engineering`(2.1)
- Base commit: `591b6a2a222357f41061128f1b5a93c7f7a877be`
- Observed commit: `6f2455c43b7dbadafec83ab3d0b57d9fc8e5156c`
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。祖先性 `git merge-base --is-ancestor 591b6a2a2 6f2455c43` **exit 0 実測**、距離 `git rev-list --count 591b6a2a2..6f2455c43` = **65**。非祖先 observed(並行 squash tip 等)は base 候補から構造的に除外(cid:reverse-engineering:rescan-base-ancestry)。
- 実施体制: Developer code scan → Architect synthesis の直列(cid:reverse-engineering:c3)。確約級引用は observed HEAD で独立再照合(反証ゼロ、後述)。
- 測定 ref: 行番号・件数は observed HEAD `6f2455c43` の実ファイル直読、区間変更は `git log 591b6a2a2..6f2455c43 -- scripts/` で実測(measurement-ref-in-artifacts)。
- Focus: 選挙 CLI(`amadeus-election*.ts`)の **ballot 受理境界の fail-open / 無差別集計** — 受理チェーン(parse→normalize→append)、amend の投入経路、kind に対する dup/late/tally の区別有無を対称棚卸しする。

## 結論

選挙 CLI の ballot 受理パイプラインには、独立に成立する **3点の fail-open / kind 無差別** がある。いずれも #1231(model-complete)/ #1235(cli-complete)導入時の **設計時ギャップ** であり、区間内退行ではない(base..observed 65コミットのうち欠陥シンボルは全て 4 Bolt 内で導入)。

1. **kind 非読取**: `Ballot.parse`(`scripts/amadeus-election-model.ts:180`)は raw の kind を読まず、成功 return を `kind: "original"` 固定にする(`:194`)。`parseBallotShape`(`:160-178`)も kind 非参照。→ `vote` verb 経由で `kind:"amend"` を投入する経路は **構造的に不在**。amend ballot は Store 直接注入(テストのみ)でしか生成されない。
2. **normalizeAt 素通し**: `normalizeAt`(`scripts/amadeus-election-transport.ts:87-91`)は `new Date(at)` が NaN のとき入力をそのまま返す fail-open(`:90` `// leave unparseable input visible`)。消費6箇所(`transport.ts:101` / `election.ts:43,214,334,354` / `t239:125-129`)。
3. **tally 無差別集計**: dup 判定(`store.ts:131-133`)は `b.kind !== "amend" && ballot.kind !== "amend"` で amend を除外、`classifyLate`(`model.ts:296-298`)と `tally`(`model.ts:321-337`)は kind 非区別の全走査。→ Store 直接注入で生まれた amend が original と **二重計上** され、`verify`(`election.ts:440` recompute)も同一母集団で検出不能。

実データ(leader elections 12件)は **全 ballot kind=original・全 late=[]** で、amend/late lane は本番でゼロ世代。テストは amend を `t235:64`(dup)/ `t235:136-152`(coexistence、Store 直接注入・`Ballot.parse` 非経由)でのみ触り、**amend × submittedAt の二重計上検査は不在**。

## 受理境界の対称棚卸し

| 面 | 正の経路 | kind の扱い | 観測結果 |
| --- | --- | --- | --- |
| parse(vote 受理) | `model.ts:180` `Ballot.parse`、shape 検証 `:160-178` | 非読取 → `"original"` 固定(`:194`) | amend 投入経路が構造的に不在 |
| timestamp normalize | `transport.ts:87-91` `normalizeAt` | — | NaN 素通し fail-open(`:90`) |
| dup 判定 | `store.ts:131-133` `.some()` | amend を除外 | amend が重複検査をすり抜ける |
| late 分類 | `model.ts:296-298` `classifyLate` | 非区別(字句比較のみ) | amend も late lane に無差別に載る |
| tally 集計 | `model.ts:321-337` `tally` | 非区別の全走査 | original+amend の二重計上 |
| verify | `election.ts:440` recompute(同一 `tally`) | 非区別 | 二重計上を再現するだけで検出不能 |

absence claim(amend 投入経路の不在)は marker literal ではなく、**parse の kind 固定(`:194`)と shape 検証の kind 非参照(`:160-178`)を正の側で確定**して裏付けた。

## 実測と独立再照合

| # | 主張 | 検証 | 結果 |
| --- | --- | --- | --- |
| 1 | observed=HEAD | `git rev-parse HEAD` | `6f2455c43…` 一致 |
| 2 | base は祖先 | `git merge-base --is-ancestor 591b6a2a2 6f2455c43` | exit 0 |
| 3 | base 距離 | `git rev-list --count 591b6a2a2..6f2455c43` | 65 |
| 4 | parse kind 固定 | `model.ts:194` 直読 + `parseBallotShape` kind 非参照 | `kind: "original"` 固定を確認 |
| 5 | dup が amend 除外 | `store.ts:132` 直読 | `b.kind !== "amend" && ballot.kind !== "amend"` 確認 |
| 6 | normalizeAt fail-open | `transport.ts:87-91` 直読 | NaN 分岐 `:90` が入力素通しを確認 |
| 7 | tally kind 非区別 | `model.ts:321-337` 直読 | 全走査に kind 参照なしを確認 |
| 8 | normalizeAt 適用点 | `election.ts:334` 直読(handleVote 内) | `submittedAt: normalizeAt(...)` 確認 |
| 9 | dist 投影ゼロ | `git ls-files 'dist/**' \| grep -i election` | 0件 |
| 10 | SKILL 3面 | `git ls-files \| grep -i amadeus-election \| grep -i skill` | `.agents` / `.claude` / `contrib` の3件 |

**再照合結論**: 確約級引用5点超(`model.ts:194` / `store.ts:131-133` / `transport.ts:87-91` / `model.ts:321-337` / `election.ts:334`)を Architect が observed HEAD で直読照合。**相違・反証ゼロ**。dup 判定は Developer が `:131-133` と記したが実体は `:132`(`.some()` 内の1条件行が `:131-133` に跨る)で意味論は一致、訂正不要。

## 区間交差判定

`git log 591b6a2a2..6f2455c43 -- scripts/` 実測:

- election 4 Bolt: #1227(`cf92b6813` walking-skeleton)/ #1231(`654e54b53` model-complete)/ #1233(`773ded00a` io-record-transport)/ #1235(`fdfe1ecd3` cli-complete)。
- 非交差2件: #1198(`cd9865194` mirror countStageProgress)/ #1212(`bf84cdfaf` codex hooks 分離)。

フォーカスシンボルは全て 4 Bolt 内で導入。本欠陥は #1231(5分類に timestamp/kind 分類軸を含めない設計)/ #1235(vote verb 導入時に amend 投入を塞いだまま tally の kind 非区別を残置)の設計時ギャップ。restart-loss regression クラスではない(区間内で「一度直った修正が失われた」経路は不在)。

## CodeKB body 成果物の温存/更新表(9成果物)

diff-refresh の churn 温存原則(cid:reverse-engineering:c1)により、実質の新規知識は「選挙 CLI ballot 受理境界の fail-open 3点」1点のみ。これは本 re-scan と scan-notes に収載し、body 成果物は全点温存とした。

| 成果物 | 判断 | 根拠(1行) |
| --- | --- | --- |
| `reverse-engineering-timestamp.md` | 更新 | 鮮度ポインタ更新 + 旧「最新」を履歴ラベルへ降格(c3-relabel) |
| `re-scans/260719-ballot-failclosed-amend.md` | 新規 | 本ファイル(per-intent record) |
| `architecture.md` | 温存 | ballot 受理境界を扱う選挙 CLI アーキテクチャ節が不在(既存節は contrib overlay 配布チャンネルと learnings gate のみ)。新設は churn — 受理境界の事実は本 re-scan/scan-notes に収載 |
| `business-overview.md` | 温存 | 事業目的・主要機能に変更なし |
| `code-structure.md` | 温存 | core 中立層/表層境界・ファイル配置は区間で不変(選挙資産は scripts/ 既存レイアウト) |
| `component-inventory.md` | 温存 | 選挙 CLI コンポーネントは 4 Bolt で既記録、受理境界の欠陥は仕様レベルで inventory 外形不変 |
| `technology-stack.md` | 温存 | ランタイム・依存に変更なし(Bun/TS、dist 非対象) |
| `dependencies.md` | 温存 | 依存グラフに変更なし |
| `code-quality-assessment.md` | 温存 | 品質観測の新設は requirements 段の裁定対象(欠陥は本 re-scan で観測記録済み、二重記載を避け温存) |
| `api-documentation.md` | 温存 | repository 所有の公開 CLI 外形は未変更。ballot 受理契約の変更は裁定待ちで API 記述に反映しない |

## Delivery boundary

実装、外部サービス操作、main merge/rebase、Issue close、PR 作成/更新は本 scan で未実施。どの fail-open 点を fail-closed 化するか・amend の意味論定義は requirements/選挙で裁定する。
