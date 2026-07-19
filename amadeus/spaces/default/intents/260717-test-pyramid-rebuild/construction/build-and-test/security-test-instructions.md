上流入力(consumes 全数): U1-size-ledger/code-generation/code-generation-plan.md, U1-size-ledger/code-generation/code-summary.md, U2-layer-spec-gate/code-generation/code-generation-plan.md, U2-layer-spec-gate/code-generation/code-summary.md, U3-migration-coverage/code-generation/code-generation-plan.md, U3-migration-coverage/code-generation/code-summary.md

# Security Test 手順

## 適用判定

- U1〜U3はdependency、credential、network path、runtime attack surface、IaCを変更していない。専用SAST/DAST/dependency/IaC scanのproject scriptやCI jobも存在しないため、新規実行型security testはN/A。
- lint、typecheck、complexityをsecurity PASSの代用品にしない。
- 適用対象は、U1/U3 recordのpath containment、exact ref、digest、全単射、承認provenance、機微データ最小化という証拠完全性である。

## フレームワーク・データ・環境

- 専用SAST/DAST/dependency/IaC frameworkと外部service fixtureはN/Aであり、追加しない。
- Bun 1.3.13でversioned validatorを実行し、入力はU3 `code-summary.md` 内のcanonical EvidencePayloadだけとする。
- 一時validatorはsystem temp配下に作り、versioned treeへ生成物を残さない。coverage targetはpayload契約8/8であり、line coverageや脆弱性scanの代替ではない。

## 実行コマンド

U3 summary内のversioned `U3_REPLAY_VALIDATOR_V1`を一時ファイルへ抽出し、read-onlyで実行する。

```bash
amadeus_u3_validator_tmp="$(mktemp "${TMPDIR:-/tmp}/amadeus-u3-validator.XXXXXX.ts")"
awk '/^\/\/ U3_REPLAY_VALIDATOR_V1_START$/{capture=1} capture{print} /^\/\/ U3_REPLAY_VALIDATOR_V1_END$/{capture=0}' \
  amadeus/spaces/default/intents/260717-test-pyramid-rebuild/construction/U3-migration-coverage/code-generation/code-summary.md \
  > "${amadeus_u3_validator_tmp}"
bun "${amadeus_u3_validator_tmp}"
```

## 合格条件

- exit 0、`verdict=PASS`、errors 0。
- exact ref `3917a283a953165866170d235d3dc25ad2fd3643`、U1 ledger 442行、U3 candidates 163件、review 68件、migration 95件、coverage contract 8/8が一致する。
- canonical EvidencePayload SHA-256が `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` のまま不変。
- ApprovalProofはdigestを持つ`QUESTION_ANSWERED`と直前`HUMAN_TURN`を対で検証し、単独event proofにしない。

## N/A境界

認証、認可、PII、外部API、container、IaC、deployed endpointがないため、penetration test、DAST、IAM scan、image scanはN/A。これは既存必須CI検査を省略する根拠ではない。
