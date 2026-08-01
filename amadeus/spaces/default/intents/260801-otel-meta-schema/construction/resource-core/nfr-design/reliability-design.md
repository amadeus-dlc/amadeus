# Reliability Design — U1 resource-core

上流入力(consumes 全数): reliability-requirements ほか performance-requirements / security-requirements / scalability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— 信頼性要件は requirements.md NFR-1(fail-open)+ NFR-3(blocking gate 全適用)から代替導出。business-logic-model.md(実在)の fail-open/fail-closed 面区別を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## 失敗面の分類と方針(error-classification 準拠)

- **回復可能(fail-open 省略)**: 解決不能キー(git 不在・env 未設定・package.json 読取失敗)は当該キーを省略し emit を継続(BR-U1-2 / NFR-1)。telemetry の欠落がワークフロー本体を止めることは構造的にない
- **呼出し側バグ(fail-closed throw)**: supplier 二重設定・閉集合外キー供給は即 throw(BR-U1-3/U1-5)。これは defect であり retry 対象にしない
- circuit breaker / retry with backoff / failover は非適用 — resource 解決に外部ネットワーク呼出しが存在しないため(nfr-design:c1)

## 部分故障の非伝播

- buildResource 内の per-key 解決は key ごとに独立 try — 1キーの解決失敗が他キーの解決を落とさない(全称でなく層別の保証: 中立8+vcs2 の各解決子は互いに独立、supplier 4 は供給時検証済みのため構築時は無失敗)
- memo 無効化(supplier 後着)と再構築の間に例外が出た場合、旧 memo を保持せず「その時点で解決できた bag」を返す — 半端な状態を後続 emit へ引き継がない

## 検証

- 落ちる実証: 各 fail-open 経路(git 不在 / env 未設定)を注入して省略動作+emit 継続を assert、throw 経路(二重設定/閉集合外)を注入して例外を assert。失敗ケース注入は org.md Mandated の「実際に赤くなる実証」に従う
