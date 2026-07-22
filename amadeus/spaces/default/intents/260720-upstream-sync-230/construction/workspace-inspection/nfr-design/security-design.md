# Security Design — workspace-inspection

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。workspace entries、metadata、`.gitmodules`をuntrusted filesystem inputとして扱う。

## Trust boundaries

| Boundary | Control | Rejected behavior |
|---|---|---|
| root→entry enumeration | read-only I/O、single listing | write、repair、consumer rescan |
| candidate→nested scan | relative depth-1 directory only | depth>1、symlink/hidden/excluded traversal |
| `.gitmodules`→submodule entry | non-empty safe relative path | absolute、drive absolute、`..`、empty path |
| scan→birth/state | `classified | inconclusive` exhaustive match | incomplete observationのGreenfield commit |
| snapshot→projectors | immutable shared result | birth reject後audit emit、consumer別mutation |

## Fail-closed classification

root列挙、signal metadata、candidate readが失敗した場合、または`.gitmodules`にunsafe entry・parse不能が一つでもあれば`inconclusive`とpath/reason advisoryを返す。このfailure resultはroot signal、safe submodule、nested hitより優先し、safe+unsafeやroot+unsafeの混在でも読めた断片からGreenfield/Brownfieldを確定しない。

birth/stateはclassifiedだけをcommit pathへ渡し、inconclusiveをstate/plan/graph/audit/workspace全mutation前にtyped errorとして拒否する。detect/doctorは両variantをread-only表示できるが、birth reject時はaudit emitterを呼ばない。

## Submodule safety

parserはsafe pathだけをprobeし、unsafe pathのroot外I/Oを0にする。unsafe entry検出後は他のsafe entryをclassification成功の根拠へ昇格させない。initialized状態は`root/path/.git`の観測だけで決め、`git submodule update --init --recursive`はremedy文字列としてのみ表示する。url/nameから未取得codeのlanguageを推定しない。

## Supply-chain boundary

authored sourceから6 harnessへgenerator投影し、dist手編集を禁止する。new credential、permission、network、database、service、UI、dependency、event、retentionを追加しない。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U06-01〜05、`performance-requirements.md`のbounded scan、`scalability-requirements.md`のdepth boundary、`reliability-requirements.md`のbytes不変、`tech-stack-decisions.md`のread-only port、`business-logic-model.md`のFail-closed boundaryへ対応する。
