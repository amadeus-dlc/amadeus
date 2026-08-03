# Scalability Design — u2-installer-asset

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 拡張軸

payload file数/byte数に対しstreaming hashとextractをO(n)で行う。harness選択はmanifest列挙ではなく展開後のliteral harness pathだけをlocateする。

## N/A

client CLIの単発installであり、server auto-scaling、queue、database、cacheはない。GitHub CDNの容量設計を本repositoryで複製しない。
