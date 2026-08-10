# Functional Design Questions — candidate-evidence-inventory

## Interaction mode

- Mode: Guide me
- Decision: `auto-decision-d32232d75463e2c79834b61ebcb66e9a`
- Intent autonomy: semi

## Questions and answers

追加質問は0件。`requirements.md`、`components.md`、`component-methods.md`、`services.md`、`unit-of-work.md`、`unit-of-work-story-map.md`がcanonical dedup、Event Set検証順、全family inventory、明示intent/stage、fixed precedence、Unit境界を一意に固定している。未確定事項を実装者へ委譲しない。

## Evidence

- FR-EVT-1〜5がcandidate family、Event Set、explicit evidence、pairing、reason taxonomyを規定する。
- C-03 method contractが`buildAttributionCorpus`、`decodeEventSetEnvelope`、`decodeCandidateInventory`の責務と順序を固定する。
- U-02はcandidate source/testだけを所有し、interval accounting、report、rendererへ責務を広げない。
