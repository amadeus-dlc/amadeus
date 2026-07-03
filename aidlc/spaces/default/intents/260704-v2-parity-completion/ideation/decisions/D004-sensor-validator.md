# D004：sensor と validator の併用

## 判断

本家 sensor（required-sections、upstream-coverage、linter、type-check）をエンジンごとコピーして stage 完了時の即時検査に使い、amadeus-validator は横断構造検査と CI に特化させる。
必須節定義は両者で共有する。

## 根拠

- 検査の軸が違う（stage 局所の即時検査と、workspace 横断の永続検査）。併用で検査の穴がほぼ消える。
- Issue #393 の sensor 不採用判断は「hook 実行基盤を含める判断が確定した場合は再検討」と明記しており、C 柱（エンジンコピー）がその条件を成立させる。

## 影響

- `docs/amadeus/aidlc-v2-sensor-learn-mapping.md` の不採用判断を上書きする。
- validator の必須節定義を sensor の定義と共有する形へ再構成する。

## 由来

G001 の GD004。
