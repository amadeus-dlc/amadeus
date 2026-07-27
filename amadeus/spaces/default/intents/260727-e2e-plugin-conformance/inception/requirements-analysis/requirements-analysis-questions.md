# Requirements Analysis 質問(260727-e2e-plugin-conformance)

<!-- E-OC1 証跡ヘッダ: ソロモード運用。以下の質問はいずれも既決ノルム・既存実装の流儀から一意に導出できない真の未決事項であり、ユーザー直接裁定の対象。[Answer] 記入は裁定受領後にのみ行う。 -->

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md — 各質問の背景 file:line は RE 差分リフレッシュ(observed 0c4709102)の実測に基づく。

## Q1. 開発者視点 E2E の CI 実行トリガー

背景: `tests/run-tests.sh --ci`(run-tests.ts:125-126)は smoke+unit+integration のみで e2e 層を含まず、`ci.yml:163` は `test:ci` を呼ぶ。`tests/e2e/` に置くだけでは #1589 のリグレッションガードにならない(RE 確定事項)。

- A. PR blocking の専用 CI ジョブを新設し、plugin conformance E2E をオフライン様式で実行する(実行時間は bounded に設計)
- B. 既定 `test:ci` プロファイルへ e2e 層ごと組み込む(全 e2e が CI 対象になり影響範囲が広い)
- C. 非 blocking ジョブ(nightly / workflow_dispatch)とする(ガード力は弱いが CI 時間への影響ゼロ)
- D. CI へ載せずローカル実行手順のみ文書化する(#1589 の趣旨に反するため非推奨)
- X. Other (please specify)

[Answer]: A. PR blocking の専用 CI ジョブ新設(オフライン様式・bounded 実行時間)(ユーザー承認: 2026-07-27T11:37:24Z、AskUserQuestion 直接裁定・ソロモード)

## Q2. 「baseline 復元」の境界定義(#1586 の受け入れ基準)

背景: drop の `baselineRestored` 判定(amadeus-plugin.ts:377)は composition record のみを根拠に FS を見ない。compose→drop 後に `plugins/<name>/stages/` を含む空ディレクトリ3階層が残存し、`.amadeus-plugin-drops.json` も残る(RE 決定的再現)。

- A. FS 完全復元を基準とする: plugin 所有の空ディレクトリも除去し、判定に FS 実測を含める。`.amadeus-plugin-drops.json` は監査データとして残存を許容し、その旨を契約に明記
- B. ファイル bytes の一致のみを基準とし、空ディレクトリ残存を仕様として文書化する(#1586 を wontfix 化 — 非推奨)
- C. FS 完全復元+`.amadeus-plugin-drops.json` も削除(drop 監査証跡が失われる)
- X. Other (please specify)

[Answer]: A. FS 完全復元(空ディレクトリ除去+判定に FS 実測。drops record は監査データとして残存許容を契約明記)(ユーザー承認: 2026-07-27T11:37:24Z、AskUserQuestion 直接裁定・ソロモード)

## Q3. E2E がカバーするハーネス面の範囲

背景: 元 intent の FR-2 はハーネスごとの導入経路 E2E を要求していたが未達。folder-drop 6面は #1543 監査で手動実証済み、claude marketplace 経路の discovery 着地と active intent 下の stage 実行到達は未検証面(RE 確定事項)。E2E 駆動の既習様式は setup-install 系(オフライン・実バイナリ spawn)が live gate なしで成立。

- A. claude 面の folder-drop 導入 → auto-compose → 実 recompile → 通常 scope 実行での stage 到達 → doctor → drop → baseline 復元、の1本を最小核として実装(未検証面のうち「通常 scope 実行到達」を昇格)
- B. A+claude marketplace 経路の discovery 着地も E2E へ昇格(未検証面2点とも閉じる)
- C. 全ハーネス面の導入経路 E2E(元 FR-2 の完全充足 — amadeus-bugfix の規模を超過する懸念)
- X. Other (please specify)

[Answer]: A. claude 面の folder-drop 最小核1本(通常 scope 実行到達を昇格)(ユーザー承認: 2026-07-27T11:37:24Z、AskUserQuestion 直接裁定・ソロモード)

## Q4. 通常 scope 実行での stage 到達の検証深度

背景: FR-4 合否(統合)の名指しは「通常 scope 実行からプラグインステージへ到達できる」。engine の到達配線は `emitComposedPluginStageIfInstalled`(amadeus-orchestrate.ts:1017-1019)。完全な動的実証には intent birth を伴うワークフロー駆動が必要(#1543 監査は静的確認のみで未実施)。

- A. E2E 内で使い捨てワークスペースに intent を birth し、engine `next` が composed plugin stage の run-stage directive を実際に emit するところまで実測する(名指し経路の完全充足)
- B. compose 済みホストで engine `next` を `--single` なしで呼び、directive emit を確認する(intent birth は省略 — 到達の実測としては部分的)
- C. 静的配線確認+in-process seam 呼び出しで足りるとする(現状追認 — #1589 の趣旨に反するため非推奨)
- X. Other (please specify)

[Answer]: A. intent birth 込みの完全実測(engine next の run-stage directive emit まで)(ユーザー承認: 2026-07-27T11:37:24Z、AskUserQuestion 直接裁定・ソロモード)
