# Decision Log — Ideation（260705-engine-installer）

上流入力: [initiative-brief.md](initiative-brief.md)

## 確定した判断の一覧

| ID | 判断 | 種別 | 出典・記録 |
|---|---|---|---|
| D1 | 配布単位 = フルセット（.agents/rules/ 除外） | grilling 確定 1 | Issue #451 転記コメント、intent-capture Q5 |
| D2 | Claude + Codex 両対応（Codex は配置のみで成立を検証） | grilling 確定 2 | 同上、user-flow.md |
| D3 | symlink 再作成方式（実体化・OS 判定切替は不採用） | grilling 確定 3 | 同上、CON-3 |
| D4 | 導入形態 = リポジトリ内 TS スクリプト | grilling 確定 4 | 同上、build-vs-buy.md |
| D5 | 上書き更新型 + aidlc/ 不可侵、settings.json は hooks 限定マージ | grilling 確定 5 | 同上、CON-1・CON-2 |
| D6 | 検証 3 層分担（スモーク / 専用 eval / README 手順） | grilling 確定 6 | 同上、CON-6 |
| D7 | 単一 PR（インストーラ + eval + README は不可分） | 構造判断 | scope-definition gate 承認（2026-07-06 04:12 JST） |
| D8 | CLI = 工程逐次表示、非対話 1 コマンド完結 | 構造判断 | rough-mockups gate 承認（2026-07-06 04:16 JST） |
| D9 | settings.json マージ対象は hooks 配線のみ（一次結論、eval A-1 で担保） | 調査結論 | feasibility gate 承認（2026-07-06 04:10 JST） |

## 未確定（Inception へ引き継ぎ）

| ID | 論点 | 確定先 |
|---|---|---|
| O1 | スクリプトの置き場所と命名 | requirements-analysis 以降（構造判断または軽いピア協議） |
| O2 | AMADEUS.md の利用者向け再構成の程度 | 同上 |
| O3 | D9 の最終確定（マージ実装詳細） | requirements-analysis + eval 実装 |
