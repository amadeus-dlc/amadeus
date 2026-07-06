# Code Summary：B004 文書と実証

## 変更ファイル

| 変更 | 内容 | 対応する要求 |
|---|---|---|
| `AMADEUS.md`、`.agents/rules/amadeus-artifacts-and-examples.md`、`docs/amadeus/skill-language-policy.md`、`docs/amadeus/aidlc-v2-sensor-learn-mapping.md` | 規範改定（エンジン駆動入口、補助 3 skill、Operation 採用、英語必須、D004 上書き注記） | R009、R005 |
| モジュールファイル 3 件と `intents.md` の削除、IndexGenerate.ts 退役、validator の「存在する場合のみ検査」化（TDD） | GD009 の実施 | R006 |
| `construction/build-and-test/`（7 ファイル）と `construction/ci-pipeline/`（3 ファイル） | v2 規定位置の 3.6 / 3.7 成果物（エンジン directive の produces に従う） | R006 |
| validator の registry status 許可値に `complete`（エンジン語彙）を追加 | CD008 | R006 |
| dogfooding | park / unpark / resume / ask 応答 / build-and-test / ci-pipeline / PHASE_VERIFIED / WORKFLOW_COMPLETED をエンジン駆動で実行 | R011 |

## 残作業（人間判断待ち。CD005、CD006）

- examples 4 snapshot の real provider 再生成（個人 Codex アカウントのコスト消費 + 生成ハーネスの新アーキテクチャ適応が必要）
- 再生成後の provenance 切替と、旧 stage skill 22 個 + amadeus-steering の削除
