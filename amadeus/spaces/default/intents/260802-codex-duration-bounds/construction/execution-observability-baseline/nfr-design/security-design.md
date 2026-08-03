# Security Design — execution-observability-baseline

上流: `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions`、`business-logic-model`

## Trust Boundaries

C2だけがcanonical IDとlifecycle eventを生成する。`HarnessCapabilityPort`はnative factをavailability型へ変換し、policyやIDを返さない。workload入力はdigest、originは許可済みstage／agent／tool metadataだけを保存する。

## Redaction と Egress

`ExecutionRedactor`をaudit投影前とOTel export前の二境界で共有し、prompt、answer、credential、raw pathを拒否する。exporter未設定時はnetwork callを作らず、remote exporterは既存明示設定に従う。
