# Security Design — ts-arm

## 上流と blind boundary

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。public contract/healthy baseline/opaque subject/frozen manifestsだけを許す。

## ArmSFilesystemSandbox

read allowlistはimmutable Bun runtime/package tree、Arm S source/tests、public contract、grant-bound opaque subjectだけ、writeはrevision output/tempだけにする。Arm T/U5/Registry/fixture/prior evidenceをnamespaceから除外し、network denyとfilesystem enforcement probeが失敗すれば起動しない。denied openはpath hashだけをtyped failureへ残す。

`RuntimeSnapshotVerifier` はBun distribution、package.json/bun.lock、fast-check 4.9.0 tree、source/test/arbitrary manifestsをone-time freezeでhashし、read-only snapshot capabilityへbindする。runはroot identity/seal/clean snapshotをO(1)再検証し、元pathを参照しない。

closed environment、array argv、canonical cwdを使い、eval/Function/dynamic import/child shellを禁止する。counterexampleはabsolute path/credential/sealed contentを含めない。

## Verification

forbidden path、sandbox unavailable/escape、lockfile/package drift、PATH/network、eval/dynamic import、subject driftをred fixtureにする。secret/personal/external election store read=0である。

