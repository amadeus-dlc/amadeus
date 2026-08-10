# Security Design — attribution-domain-contracts

## Scope and upstream applicability

本設計はengine directiveでpresentな `business-logic-model.md` のC-02 domain contractだけを対象とする。`security-requirements.md`と`tech-stack-decisions.md`はNFR Requirements stageのscope skipに伴うexpected-absentであり、新しいNFR IDは発明しない。`performance-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`はlibrary kindの本Unitでは非適用で、対応するdesign outputもpruneされている。

Requirements AnalysisのNFR-3（`requirements.md:291-293`）、NFR-6（同`:303-305`）、NFR-7（同`:307-309`）を代替正本として参照する。Application Designは新しいnetwork、credential、storage、PII sourceを導入せず、audit read-onlyを維持する（`decisions.md:58-60`）。

## Trust boundaries and threats

唯一のtrust boundaryは、C-01/C-03が取得した未検証primitiveをC-02の公開constructorへ渡すin-process callである。C-02はfilesystem、process、renderer、audit writer、networkへ到達せず、認証主体・権限・secret・persistent dataを所有しない。

| Threat | Failure shape | Control | Result |
|---|---|---|---|
| unsafe stage/outlier input | path-like slug、範囲外数値、値欠落 | `TargetStage` / `OutlierLimit` smart constructorだけを公開生成経路にする | `usage` error、reportなし |
| forged or incomplete interval | 非integer、逆転、zero length | `SecondInterval` constructorで`start < end`を証明する | `accounting-invariant` error |
| evidence ambiguityの正常値化 | missing identity/stage/terminalをacceptedへ混入 | closed reason tupleと固定precedence、空findingsはprogrammer fault | explicit rejectionまたはfail-fast |
| raw evidence leakage | error/debug textへaudit payloadを混入 | domain errorはcategory、subject identity、invariantだけを持ち、raw row本文を保持しない | rendererへ機密payloadを渡さない |
| mutable aliasing | consumerがdomain valueを後から改変 | readonly record、readonly tuple、入力配列のcopy/freeze境界 | 同一入力から決定的結果 |
| boundary bypass | brandをcastしてconstructorを回避 | production call siteはconstructor resultだけを受け、direct castをfocused test/lint reviewで禁止 | invalid stateの流入を検出 |

## Input validation and error architecture

1. C-01/C-03はuntrusted primitiveをC-02 constructorへ渡す。
2. constructorはshape、ASCII grammar、range、integer、orderingを検査し、証明済みbrandまたはtyped errorを返す。
3. expected input failureは`AttributionResult<T,E>`で伝播し、exceptionへ変換しない。
4. `candidatePrimaryReason`の空集合だけはcall-site invariant違反として`TypeError`を投げ、candidate rejectionへ偽装しない。
5. C-01だけが`usage`をexit 2、`accounting-invariant`をexit 1へ写像する。C-02はexit、stdout、stderrを知らない。

この境界は `business-logic-model.md` のConstructor workflow、Primary rejection algorithm、Result propagationを変更せず具体化する。検証結果をbooleanで捨てず型として運ぶため、同じvalidationをdownstreamへ複製しない。

## Authentication, authorization, encryption, and secrets

認証・認可は非適用である。本UnitはCLI process内のpure libraryで、remote principal、multi-tenant resource、privileged operationを持たない。TLS、at-rest encryption、security header、CSRF/XSS対策もnetwork/browser/storage境界がないため非適用である。

secret管理も非適用であり、環境変数、credential provider、AWS KMS/Secrets Managerを追加しない。将来C-02がI/Oまたはcredentialを要求する変更はこの設計のblast radiusを越えるため、C-01 adapter側の別Intentで再設計する。

## Data safety, diagnostics, and verification

- 入力object/arrayを変更せず、新しいreadonly valueだけを返す。
- audit、intent state、memory、codekbへのwrite APIをimportしない。
- domain errorの公開文字列はclosed categoryとsafe identityに限定し、raw event JSONを含めない。
- table-driven testでsafe/unsafe slug、0/100/out-of-range outlier、interval境界、全17 primary reason、input-order independenceを検証する。
- forbidden import testまたはsource inspectionで`node:fs`、process、renderer、audit writerへのedgeがないことを確認する。
- malformed inputをrepair、overwrite、silent coercionせず、typed errorまたはrejectionへ変換する。

## Residual risks

TypeScript brandはruntimeでは消去されるため、`as TargetStage`のようなexplicit castを言語機構だけでは防げない。production codeでconstructorを唯一の生成経路にし、focused testsとreviewでcast bypassを拒否する。pure library境界を越える認証・暗号化・resource isolationの残余riskは本Unitには存在しない。


## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:32:57Z
- **Iteration:** 1
- **Scope decision:** none

両成果物はrequired sectionsとpresentなbusiness-logic-model.mdの主要契約を満たし、入力検証、closed vocabulary、typed error、依存方向、failure domain、blast radius、isolation、shared resource非保有を一貫して具体化している。未解決BLOCKERはない。

### Findings

- FOLLOW-UP | security-design.mdは認証・認可、暗号化、secret、security header、監査writeの非適用理由を示しているが、出力契約が名指すcompliance controlsだけは適用・非適用を明記していない。pure libraryで追加統制が不要なら、その理由を一行明示するとsecurity completenessがより機械的に確認できる。
- NIT | business-logic-model.md由来の設計判断は節名で参照されているが、stage definitionが推奨するfile:line形式ではない。次回更新時にConstructor workflow、Primary rejection algorithm、Result propagationへの参照を行番号付きにすると追跡性が上がる。
