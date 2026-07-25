# Performance Design: harness-contract-and-regression

## Inputs and Budget

U3のNFR RequirementsとFunctional Designを入力とする。生成・検証は既存Bun toolchainだけを使う。

## Design

- canonical generatorは1回、generated fileの手編集は0回。
- semantic fixtureはmanifest全harnessをtable-drivenに各1回実行する。
- fallback continuationではbody、reviewer、sensor、learnings invocation増分0。
- focused、type、full、drift checkを同一working treeで各1回以上実行する。

## Verification

generator invocation、manifest coverage、quality counters、tree fingerprintをblocking assertionにする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:53:54Z
- **Iteration:** 1
- **Scope decision:** none

6 harness共通のdirective/state/audit意味論、Reservation Id明示carrier、trusted hook mint、identity不足時fail-closed、team/policy/per-unit回帰、同一treeでのfull/type/drift収束はMinimal depthとして十分に定義されている。ただし、harness projectionと6 adapterの実装ownerが具体的なpath/interfaceへ解決されず、特にKiro IDE/OpenCodeのblocking prerequisiteを開発者が着手できない。

### Findings

- MAJOR: logical-componentsのSingle owner pathが2箇所で実パスになっていない。Harness projectionはexisting manifest/generator、Adapter capabilityは各harness native adapterとだけ記載され、canonical manifest、generator、Claude/Codex/Cursor/Kiro CLIの既存adapter、Kiro IDE/OpenCodeの新規実装先が解決不能である。6 harness同義性の変更範囲とKiro IDE/OpenCode acceptance blockerを実装可能にするため、各ownerのliteral canonical pathと共通session-capability interfaceを列挙する必要がある。
- CONFIRMED: target_intent_idとpresence_reservation_idはawait directiveから次turnのreportへ明示的にforwardされ、Reservation Idは認可値ではなくsession digest・target・stage・owner HUMAN_TURN座標との相関値として検証される。
- CONFIRMED: HUMAN_TURN mintは既存registered UserPromptSubmit trust boundaryだけに限定され、general audit/state CLIへmint APIを公開せず、machine injection・別session・Reservation Id tamperはmutation 0となる。
- CONFIRMED: Claude、Codex、Cursor、Kiro CLIは既存session identity seamを使用し、Kiro IDE/OpenCodeはstable native adapterとfixtureがgreenになるまでfeature acceptanceを満たさない。identity欠落時に共有key、PID、active cursorへ縮退しない。
- CONFIRMED: team leader/delegation、通常human、phase-boundary、walking-skeleton全stance、amadeus-feature、per-unit uncovered/all-coveredをmanifest-driven golden/matrixで全harnessへ適用し、fallback時のquality ritual再実行0を検証する。
- CONFIRMED: canonical generation後の同一working treeでfocused、team/human regression、全6 harness integration、typecheck、full test、dist:check、promote:self:check、git diff --checkを実行し、失敗時は完了しない収束条件が定義されている。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-25T07:55:37Z
- **Iteration:** 2
- **Scope decision:** none

前回指摘は解消された。scripts/package.ts、6 manifest、各harness adapter、Kiro IDE既存adapter更新、新規OpenCode pluginのliteral ownerが定まり、共通HostSessionCapabilityを介して6 harnessのsession identityを同一契約へ投影できる。Minimal depthで実装着手可能である。

### Findings

- RESOLVED: Harness projectionの単一ownerはscripts/package.tsに固定され、6 harnessそれぞれのliteral manifest pathとprojection漏れを拒否するbun scripts/package.ts --checkが定義された。
- RESOLVED: Claude、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCodeのcapability ownerがliteral pathへ割り当てられた。Kiro IDEは既存adapter/runtime/hook registrationを更新し、OpenCodeはpackages/framework/harness/opencode/amadeus-opencode-plugin.tsを新設してmanifest expected setへ登録するため、両blocking prerequisiteとも着手点が明確である。
- RESOLVED: 共通interfaceはHostSessionCapability available/unavailable unionとしてcore mint側が所有する。各adapterはraw payloadの変換だけを担当し、authorizationを持たないため、harness固有のfail-openや循環依存を導入しない。
- CONFIRMED: 空またはstableでないidentityはunavailableとなり、core mintはaudit/runtime delta 0で終端する。共有key、PID、active cursorへのfallbackは禁止されている。
- CONFIRMED: Reservation Idはtargetとともにdirective/reportで明示的にturn間伝播され、session identityはHUMAN_TURN mint対象markerの選択に使用される。Reservation Id単独を認可値として扱わない。
- CONFIRMED: manifest-driven全6 harness E2E、team/human baseline、policy/per-unit matrix、canonical generation後のfocused/type/full/dist/promote/drift検証が同一treeのblocking pipelineとして維持されている。
