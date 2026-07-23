# Integration Test Instructions — 260723-marker-heading-exemption

上流入力(consumes 全数): code-generation-plan、code-summary

## 対象と実行

センサーは dispatcher(amadeus-sensor.ts)経由の PROCESS 境界で t92(integration)が 46 ケース検証済み — 本修正は dispatcher 配線を変更しない(FR-3 / Out of Scope)ため専用の新規 integration テストは追加しない。統合面の確認は次の2点で行う:

1. `bash tests/run-tests.sh --ci`(smoke+unit+integration 全数)green — 統合スイートでの回帰ゼロ
2. FR-7 閉包の再現コマンド verbatim(配布コピー経由の実 CLI 発火): timestamp / questions 両クラスで `pass:true`+`marker_exempt:true`

## 合否基準

--ci RESULT: PASS+FR-7 両クラス転回の実測(build-test-results.md に記録)。
