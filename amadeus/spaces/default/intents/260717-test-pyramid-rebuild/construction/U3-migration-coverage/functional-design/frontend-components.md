上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md, scan-notes.md

本ユニット U3 のユーザー価値は「是正計画を materialize する — 何を・どの順で直すかを seam 化可能性で優先度付けし、カバレッジ経路と整合させる」(unit-of-work-story-map.md の U3 段)。

# フロントエンドコンポーネント — U3 移設選定台帳 + #683 層別カバレッジ整合計画

## 該当なし(N/A — 反証可能な不存在根拠)

本ユニット(U3 移設選定台帳 + #683 層別カバレッジ整合計画、FR-4/FR-6)は **UI を持たない設計・計画成果物**(選定台帳データ・整合計画データ)であり、フロントエンド/UI コンポーネントは存在しない。したがって本書の対象(画面・コンポーネント階層・状態管理・ユーザーインタラクション)は **該当しない(N/A)**。

この N/A は「未検証」でも「PASS」でもなく、**反証可能な不存在** である(project.md deployment-execution:c3 の N/A / NOT EXECUTED / PENDING / PASS 分離、observability:c3 / environment-provisioning:c3 の N/A 分離規律に倣う):

- **反証可能根拠1**: 本ユニットの成果物は 移設選定台帳(`MigrationCandidate[]`、domain-entities.md D1、component-methods.md C4、components.md C4「移設対象選定台帳」)と #683 tier キー整合計画(`CoverageTierBinding[]`、domain-entities.md D3、component-methods.md C5、components.md C5「#683 層別カバレッジ整合計画」)であり、いずれも決定的な純関数出力の **データ構造**である。レンダリングされる view・DOM・クライアント状態を一切持たない。components.md のコンポーネント境界サマリでも C4/C5 は「選定計画」「整合計画」種別であり UI コンポーネントではない。
- **反証可能根拠1b(RE 実測データも非 UI)**: 本ユニットが扱う母集団 163件・signal 内訳(FS 153/spawn 99/network 1/timer 1、scan-notes.md:34-35)はすべて `classifyTestSize` 決定的スイープの計測データ(scan-notes.md「テストサイズ分類台帳(計測導出)」)であり、画面表示物ではなく台帳データである。scan-notes.md には UI/画面/フロントエンドの記述は一切ない。
- **反証可能根拠2**: 対象フレームワークは利用者向けランタイムサービス・UI を持たない CLI/ツール系である(services.md「ランタイムサービスは存在しない」節、project.md「Deployment: デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理」)。
- **反証可能根拠3**: requirements.md の FR-4/FR-6 はすべて選定台帳・整合計画に閉じ、UI/画面/フロントエンドの記述は一切ない(requirements.md:24-38)。
- **反証可能根拠4**: 移設選定台帳・整合計画の提示形態は(実移設・#683 配線を行う後続 intent 側で)CI ログ・カバレッジレポート・機械可読の計画データであって画面ではない。**その実移設・CI 配線すら本 intent Out**(FR-4 AC-4b requirements.md:27、FR-6 AC-6a requirements.md:38、services.md S3「CI 配線=#683」)。

## 出力提示形態(UI の代替 = 計画データ + 後続 intent の消費)

UI が無い代わりに、本ユニットの利用者向け提示は次の面である。既存の兄弟様式(選定台帳・整合計画=機械可読データ)に揃え、新規 UI 様式を発明しない(ui-less-mockups-as-output-contract の系列 — 出力は計画データであって画面ではない):

- **本 intent の提示 = 計画・台帳データ + 設計文書**: 移設選定台帳(`MigrationCandidate[]`、priority 付き)・#683 tier キー整合計画(`CoverageTierBinding[]`)・選定/整合フロー(business-logic-model.md)・分類ルール(business-rules.md)・型契約(domain-entities.md)。人間可読の台帳表と機械可読の計画データ。
- **後続 intent の消費(Out)**: 移設 intent は `MigrationCandidate[]` を是正母集団・着手順として消費し(FR-4)、#683 カバレッジ担当は `CoverageTierBinding[]` を層別カバレッジ配線の tier キー整合先として消費する(FR-6)。いずれも **実移設・CI 配線は本 intent Out**。
- **インタラクション無し**: 選定・整合はいずれも決定的(U1 台帳の突き合わせ・機械抽出、services.md S3 決定的処理)。ユーザー操作・イベントハンドラ・遷移は存在しない。
- **N/A を PASS と偽装しない**: 本書は「フロントエンド検証成功(PASS)」を主張しない。フロントエンドが **存在しないこと** を反証可能根拠付きで記録するのみ(deployment-execution:c3 の分離 — N/A ≠ PASS ≠ NOT EXECUTED)。

## 実装スコープ境界(Out 明記)

- 本ユニットに UI 実装は存在せず Out 以前に対象外。移設選定台帳の実移設(テスト書き換え・移動・retier)は別 intent(FR-4 AC-4b、unit-of-work.md:151)、#683 層別カバレッジの CI 配線・強制ゲート化は #683 スコープ(FR-6 AC-6a、unit-of-work.md:152)。
- 将来 UI(移設進捗ダッシュボード・層別カバレッジ可視化等)を作る計画も本 intent には無い。必要になれば別 intent の新規スコープとして扱う。adapter/登録スロットの先行着地はしない(N3、unit-of-work.md:156)。
