# Security Design — u9-docs-norms

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 公開情報境界

文書へworktree絶対path、credential、private audit内容を載せない。Release Asset取得説明はHTTPS、host allowlist、checksumの役割を誤って署名保証と表現しない。

## 承認

norm PRの起草とmergeを分離し、mergeは人間承認なしに行わない。文書PRとnorm PRを混載しない。
