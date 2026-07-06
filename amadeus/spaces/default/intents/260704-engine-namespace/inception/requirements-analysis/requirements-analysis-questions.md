# Requirements Analysis — 質問

Intent: 260704-engine-namespace
対象 Issue: https://github.com/amadeus-dlc/amadeus/issues/445

Issue #445 で境界（エンジン内部のみ）と順序（#438 merge 後、refactor scope）は確定済みである。
ここでは Issue の未確定事項 3 点を確認する。

## Q1. tool ファイル名の対応則

`.agents/aidlc/tools/` の 26 ファイル（`aidlc-orchestrate.ts` など）と hooks 11 ファイル（`aidlc-stop.ts` など）の改名規則を確認する。

A. 単純置換（`aidlc-orchestrate.ts` → `amadeus-orchestrate.ts`）。#438 の agent 改名（aidlc-X-agent → amadeus-X-agent）と同じ規則で、parity の path mapping も機械的に書ける
B. 接頭辞なし（`aidlc-orchestrate.ts` → `orchestrate.ts`）。短いが、上流との対応則が「接頭辞除去」という別ルールになり、`.agents/amadeus/tools/` 配下という文脈頼みになる
C. tools は改名しない（ディレクトリだけ `.agents/amadeus/` へ）。参照更新は最小だが、名前空間の二層状態が残る
X. Other (please specify)

[Answer]: A. 単純置換（`aidlc-orchestrate.ts` → `amadeus-orchestrate.ts`）。hooks も同じ規則で改名する

## Q2. `.agents/rules/aidlc.md` と hooks を今回の境界に含めるか

parity baseline は `rules/aidlc.md` を専用照合（`rulesAidlcMd`）しており、hooks（`.agents/aidlc/hooks/aidlc-*.ts` 11 個）は `.claude/settings.json` から参照される。

A. 両方含める（`rules/aidlc.md` → `rules/amadeus.md`、hooks も Q1 の規則で改名）。エンジン内部の統一という境界に対して一貫する
B. hooks だけ含め、`rules/aidlc.md` は据え置く（rulesAidlcMd の専用照合を触らない）
C. 両方据え置き、後続 Issue にする
X. Other (please specify)

[Answer]: A. 両方含める（`rules/aidlc.md` → `rules/amadeus.md`、hooks も Q1 の規則で改名）

## Q3. parity-check の正規化層の設計

#438 は agent 用に `subAgentNameMapping` + `normalizeSubAgentContent` を個別追加した。今回 engine ディレクトリ名、tool 名、common/shared ディレクトリ名の mapping が増える。

A. トークン対応表による一般化（`nameMappings: [{prefix, replacement, kind}]` のような単一機構に統合し、path 解決と内容正規化を対応表駆動にする）。#438 の subAgentNameMapping もこの機構へ吸収する
B. #438 と同様に種類ごとの個別関数を追加する（変更は局所的だが、正規化関数が 4〜5 個並ぶ）
X. Other (please specify)

[Answer]: A. トークン対応表による一般化。#438 の `subAgentNameMapping` もこの機構へ吸収する
