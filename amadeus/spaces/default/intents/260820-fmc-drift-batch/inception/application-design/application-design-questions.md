# Application Design — 質問と裁定

Intent: 260820-fmc-drift-batch / Depth: Standard(予算 最大8問、本ステージは3問)
回答モード: Intent Autonomy `full` — `amadeus-bolt decide-question` 梯子で裁定。
承認エビデンス: full autonomy grant は 2026-08-20T07:18:02Z にユーザー承認済み(grant_id intent-grant-79f28345c4f20469c2ec87c6a12aeffa)。以下の各 [Answer] は grant 下の AUTO_DECIDED 裁定。

導出元: `requirements.md`(FR + §12a Review 節の FOLLOW-UP)から、コンポーネント境界に効く未決3点のみを質問化。RA で裁定済みの事項(RA Q1〜Q4)は再質問しない。

## Q1: AUTHORING_ROUTES 1定義集約の正本方向は?(RA §12a MAJOR-1 の設計解)

- A. `tla-registration.ts:87` の定義を正本として export し、`tla-applicability.ts` は import に切り替える。作業分担: export 追加は revise-model-commit unit(自己所有ファイルのみ)、import 切替は applicability-arms unit(自己所有ファイルのみ、直列末端で実施)— ownership 交差ゼロ、XR refinement 5 の「両方の棚卸し」は両 unit の受け入れ基準に分割して明記
- B. `tla-applicability.ts:302` を正本として export し、registration 側を import 化(applicability-arms unit が tla-registration.ts へ書込 → 交差が残る)
- C. 第3の共有モジュールを新設して両者が import
- X. Other (please specify)

[Answer]: A — 交差を構造的に除去できる唯一の方向(各 unit が自己所有ファイルだけを書く)。B は MAJOR-1 が指摘した交差の再生産。C は新モジュール追加で P5 違反(2ファイル間の共有は export/import で足りる)。route 依存化(FR-REG-1)の消費点は registration 側にあり、意味論の所有者も registration が自然。(AUTO_DECIDED auto-decision-fd623316cdc2e9e775a34a433a6f97f0, 2026-08-20T12:19:31Z)

**改訂裁定(2026-08-20T12:38Z)**: §12a 新 invocation のレビューが「循環なし」前提の未実測を指摘し、実測(`tla-registration.ts:18-19` が `tla-applicability.ts` を既に import — 逆方向 0 hit/exit 1、対照健全)により **A 案は循環 import を作るため不成立**と確定。改訂裁定 = **C(leaf モジュール `authoring-routes.ts` 新設、両者が import)**。leaf 新設 + registration 側 import 置換 = revise-model-commit unit、applicability 側 import 置換 = applicability-arms unit(交差ゼロは維持)。B 案は export が直列末端まで存在せず実装順序と矛盾するため不採用。(AUTO_DECIDED auto-decision-c056d2fd631a02129620618b46eda672, 2026-08-20T12:38:00Z — 初回裁定 A の撤回理由と実測述語は ADR-1 Context に記録)

## Q2: FR-BND-2 の境界1定義化の共有形は?

- A. `IMPLEMENTATION_PATHS` と containment 判定関数を `amadeus-formal-verif-model-map.ts` から export し、`tla-model-loader-internal.ts` が import して `implementationRoot` ハードコードを置換する(loader は既に model-map の parse 面へ依存しており、依存方向は既存と同じ)
- B. 境界定義だけの小モジュールを新設し validator / loader 双方が import
- X. Other (please specify)

[Answer]: A — 既存の依存方向のまま最小変更で1定義化が成立する。B は「テストが大型ファイルを import して coverage 母集団が膨張する」場合の対処(bt-coverage-universe-inflation)だが、loader/validator とも既に相互依存圏内にあり新規 import による母集団膨張は発生しない — 実装時に patch coverage が実測で膨張を示した場合のみ B へ切替(その判断は observed 数値を根拠にする)。(AUTO_DECIDED auto-decision-7bc0bb2fbf16fb0044870850dc95db44, 2026-08-20T12:19:31Z)

## Q3: FR-ARM の2本の腕はどこに配置するか?

- A. `tla-applicability.ts` の既存判定 pipeline 内、terminal route 確定の直前に「腕チェック」段として統合する(新コンポーネント・新 CLI を新設しない)。腕の入力(model-map vocabulary / issue-evidence)は既存の読取面を再利用し、drift/再発検出時は revise-model 評価の強制(既存 route 語彙のまま)へ接続する
- B. 独立した新 CLI(tla-drift-check.ts 等)を新設し、判定器から呼び出す
- C. sensor として実装(PostToolUse 発火)
- X. Other (please specify)

[Answer]: A — FR-ARM-7 が「既存の分類クラス(a)・強制規則(c)は変更せず発火述語(b)のみ追加」と定めており、判定 pipeline 内の段追加が最小かつ receipt 契約(FR-ARM-3、#3262)を自然に再利用できる。B は配線面(spawn・plugin.json tools 宣言・t3078)が増え、C は advisory 止まりで「強制」の契約(#3186 期待結果)を満たさない。(AUTO_DECIDED auto-decision-40f18c2f2ae89619ddf5a31d31fcae3d, 2026-08-20T12:19:31Z)
