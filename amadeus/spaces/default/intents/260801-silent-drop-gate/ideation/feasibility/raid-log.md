# RAID Log — no-silent-drop

**Upstream:** `ideation/intent-capture/intent-statement.md`

## Risks

| ID | リスク | 可能性 | 影響 | 対応 | Owner |
|---|---|---|---|---|---|
| R-01 | 戻り値破棄の検出対象が広すぎ、通常の副作用呼び出しを誤検出する | Medium | High | 対象語彙と成否契約を明示し、偽陽性率5%以下を gate にする | Architect / Quality |
| R-02 | `intentional-drop` が実質的な新規 allowlist になる | Medium | High | 非空理由、1ノード限定、免除件数 ratchet を強制する | Developer / Quality |
| R-03 | ベースライン更新で新規違反を既存債務へ偽装できる | Medium | Critical | bootstrap と shrink-only 更新を分離し、増加テストを赤で固定する | Developer / DevSecOps |
| R-04 | PR #1970 統合時に同じ `amadeus-lib.ts` 周辺で競合する | Medium | Medium | 実装前に最新 `main` を統合し、#1963 の回帰契約を先に確認する | Delivery / Developer |
| R-05 | #1878 / #1874 の loud 化が既存 callsite の戻り値契約を壊す | Medium | High | callsite 全数棚卸し、失敗注入、state バイト不変、呼び出し元テストをセットにする | Architect / Developer |
| R-06 | コア修正と生成済みハーネス投影がドリフトする | Low | High | 正本だけを編集し、packager と promote check を必須にする | Developer |
| R-07 | ast-grep の導入・走査が lint ジョブを遅くする | Low | Medium | 単独15秒上限を計測し、超過時は走査方法を最適化する | Quality |

## Assumptions

| ID | 仮定 | 確信度 | 検証 |
|---|---|---|---|
| A-01 | ast-grep は Bun 管理下で固定でき、Ubuntu CI と主要ローカル環境で実行できる | High | clean install と CI matrix |
| A-02 | 手書き正本3領域が配布物の変更源を網羅する | High | packager の入力境界と走査一覧の照合 |
| A-03 | 初期検出母集団は人手分類可能な規模に収まる | Medium | 最初の census 件数を計測 |
| A-04 | #1963 の修正契約は PR #1970 統合後も維持される | High | t407 系回帰テスト |
| A-05 | 新規 AWS 資源・規制対象データは発生しない | High | Scope Definition と差分レビュー |

## Issues

| ID | 現在の問題 | 影響 | 対応方針 | 状態 |
|---|---|---|---|---|
| I-01 | #1878: `persistBlocked` が永続化結果を破棄する | safety-blocked 記録喪失が無音になる | 戻り値契約と全呼び出し元を修正 | Open |
| I-02 | #1874: state 行不在時の無言 no-op が複数経路に残る | state と audit の乖離 | 存在保証を棚卸しし、非保証経路を loud 化 | Open |
| I-03 | #1963 はリモートで修正済みだが本 worktree 基点に未包含 | 重複実装・競合の恐れ | PR #1970 を含む `main` を統合し、回帰検証のみ実施 | Open dependency |
| I-04 | no-silent-drop の初期 census と偽陽性率が未計測 | ベースライン規模が未確定 | 検出器の walking slice で最初に計測 | Planned |

## Dependencies

| ID | 依存 | 種別 | 必要時点 | 完了条件 |
|---|---|---|---|---|
| D-01 | PR #1970 を含む最新 `main` | Source | 実装開始前 | #1963 回帰テスト green |
| D-02 | 固定バージョンの ast-grep CLI | Tooling | 静的ゲート実装時 | frozen install と version 出力確認 |
| D-03 | 既存 GitHub Actions lint ジョブ | CI | 統合時 | 新規ステップが15秒以内で blocking |
| D-04 | callsite guard / complexity gate の ratchet パターン | Internal pattern | 設計時 | baseline 欠落・不正・増加のテストを再利用 |
| D-05 | packager / promote-self drift guard | Distribution | コア修正後 | 全生成物が正本と byte-consistent |

## RAID 運用

- R-01〜R-07 は後続の要件・設計・Build and Test に追跡する。
- A-03 が成立せず初期 census が人手分類不能な規模の場合、無理由ベースライン化せず、ルールを分割して段階評価する。
- I-03 は実装前の hard dependency とし、未解消のまま #1963 相当コードへ変更を加えない。
- D-02 の導入が再現可能な固定を満たせない場合、別の AST 検出手段を比較して再判断する。
