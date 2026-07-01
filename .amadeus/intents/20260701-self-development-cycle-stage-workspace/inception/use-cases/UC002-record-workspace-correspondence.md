# UC002: workspace 対応を記録する

## システム境界

- Agent が build workspace、host environment、target workspace、target artifacts の対応を追跡できる成果物候補へ整理する。
- GitHub は Issue、PR、CI、review comment の参照元として扱う。

## 事前条件

- stage 判定方針が整理されている。
- 対象の GitHub Issue と Intent が存在する。

## 基本フロー

1. Agent が build workspace の path と commit を確認する。
2. Agent が target workspace の path と commit を確認する。
3. Agent が利用した skill、validator、開発用スクリプトを記録候補として整理する。
4. Agent が stage 判定と人間の stage0 採用判断の有無を記録候補として整理する。
5. Agent が validator と標準検証結果を証拠候補として整理する。

## 代替フロー

- workspace 対応が未確認の場合は、対象項目を `未確認` として Construction へ渡す。

## 事後条件

- workspace 対応記録が Requirement、Use Case、Unit、Bolt から追跡できる。

## BCE候補

| 種別 | 候補 | 責務 |
|---|---|---|
| 境界 | Workspace Provenance Record | workspace 対応と検証結果を読む入口。 |
| 制御 | Provenance Shaping | workspace、skill、validator、検証結果を対応づける。 |
| エンティティ | Workspace Correspondence | build workspace、target workspace、stage 判定を表す。 |

## 責務候補

| 候補 | 判断 | 保持 | 依頼 |
|---|---|---|---|
| Workspace Provenance Record | 採用候補 | workspace 対応、stage 判定、検証結果 | Construction で記録先を確定する。 |
