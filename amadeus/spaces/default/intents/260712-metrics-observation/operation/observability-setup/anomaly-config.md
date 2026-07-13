# Anomaly Configuration

## Applicability

`performance-design.md`、`security-design.md`、`reliability-design.md`、`monitoring-design.md`、`infrastructure-services.md`にCloudWatch anomaly detector対象はなくN/A。

## Existing detection

snapshotは時系列比較の入力を提供するが、閾値・自動alarm・trend判定は本Intentの範囲外。誤データはjob failureとschema validationで防ぐ。

## Future condition

十分なsnapshot履歴と承認済み閾値が得られた場合のみ、別Intentでanomaly detectionを設計する。
