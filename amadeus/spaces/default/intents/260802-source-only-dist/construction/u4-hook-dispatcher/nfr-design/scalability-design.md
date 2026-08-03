# Scalability Design — u4-hook-dispatcher

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` は nfr-requirements SKIP により不在。`business-logic-model` のsettings.json参照集合から導出する有限slug集合を対象とする。

## 拡張方針

hook追加時はsettings.jsonの新しい直接参照を検査が検出し、dispatcher表と同一変更で更新する。ディレクトリ列挙から未参照実体を自動公開しない。実行ごとの計算量はO(1)、slug数増加時の表lookupは小規模MapでO(1)を維持する。

## N/A

常駐service、load balancer、queue、data partition、auto-scalingは存在しない。複数hookの同時実行は各processが状態非共有で独立し、dispatcher内の共有mutable stateを作らない。
