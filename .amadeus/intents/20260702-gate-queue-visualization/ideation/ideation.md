# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | 承認待ちの判定材料は `state.json` に揃っている（各 phase の `gate` 値、Task Generation の `ready_for_approval` など）。横断スキャンの先例として `amadeus-construction` 同梱の `list-unfinalized-intents.ts` が、`.amadeus/intents/*/state.json` を走査する Bun と TypeScript の同梱スクリプト方式を確立している。 |
| 運用 | feasible | フェーズパイプラインでは人間の役割がゲート審査官へ寄るため、1 回の実行で承認待ちを一望できることが承認の律速と見落としの解消につながる。承認待ち 0 件の表示により、詰まりがないことも確認できる。 |
| セキュリティ | feasible | workspace 内の JSON と Markdown の読み取りだけで成立する。秘密情報や認証情報を扱わない。 |
| 依存 | feasible | 横断スキャンが読むゲート語彙は Intent 20260702-phase-gate-approval-contract で確定した契約に従い、`state.json` の構造は 20260702-state-json-scaffolding の雛形生成で安定している。待機条件だった共有インデックスの生成物化（Issue #334）は cycle 完了済みで解消している。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | 承認待ち判定の条件、一覧の出力形式、実行入口の配置先を判断する。一覧を見て承認の順序を決める主要利用者でもある。 |
| Agent | 実行者 | 並行作業中に一覧を実行し、`ready_for_approval` で停止した Bolt や gate 待ちの Intent を人間へ提示する。 |
| Reviewer | 参照者 | 一覧から承認待ちのゲートと待ち理由を読み、承認の見落としがないか確認する。 |
| Validator | 構造検出者 | 一覧が前提にする `state.json` の構造（gate 語彙、approval evidence）の崩れを fail として検出する既存の検査を提供する。 |
| Evaluator | 品質評価者 | 承認待ち判定の決定論性（同じ `state.json` の集合から同じ一覧）を確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 複数 Intent が異なる phase のゲートで承認待ちの workspace に対して、1 回のスキャン実行で承認待ち一覧（Intent、phase、ゲート、待ち理由）を得る流れと、承認待ち 0 件時の表示を示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- 「承認待ち」と判定する `state.json` の条件（各 phase の gate 値と `taskGeneration.status` の対応）は Inception で判断する。
- 待ち理由として一覧に表示する情報の出どころ（`state.json` のどのフィールドを根拠にするか）は Inception で判断する。
- 実行入口の配置先（どの skill に同梱するか、`list-unfinalized-intents.ts` との統合か併置か）は Inception で判断する。
- 一覧の出力形式と列は Inception で判断する。
- 既存の examples snapshot への影響（承認待ちを含む snapshot の要否）は Inception で判断する。

## 学習候補

- `state.json` を走査するスクリプトが増えるため、ゲート語彙の契約変更時にスキャン系スクリプトの判定規則を同時に見直す運用が必要になる可能性がある。
- 承認待ちキューの一覧は、ゲート承認のバッチ化を扱う並行運用ポリシー（Issue #351）の判断材料として再利用できる可能性がある。
