# Formal Model Check — 結果記録

上流入力(consumes 全数): 本ステージは登録済み model-map の全モデルを検査対象とし、requirements.md の NFR-2(回帰なし)の形式検証面を担う。

- 実行日時: 2026-08-12T05:10Z 台 / 実行者: conductor
- 実行環境: mise x java@temurin-26.0.1+8 + --provider docker(pinned eclipse-temurin:26-jdk@sha256:939e3577…)
- コマンド: `bun .claude/plugins/formal-model-check/tools/run-model-check.ts --model <M>.tla --cfg <M>.cfg --out <scratch> --provider docker`

## 結果(exit code 実測)

| モデル | outcome | exit |
|---|---|---|
| FormalElection | NOT_DETECTED | 0 |
| MirrorLifecycle | NOT_DETECTED | 0 |

登録2モデルとも counterexample 不検出(有限領域の完全探索完走)。spec identity は plugin-activation record で記録済み。本 intent は specs/tla を無変更のため、これは NFR-2 の回帰なし確認である。

## 備考

- 初回実行時に docker の `tag@digest` 参照が解決不能になる環境事象を2度観測(pull 済み digest に対する tag 連想の消失)。`docker pull <tag>@<digest>` の再実行で回復。コード変更なし。
