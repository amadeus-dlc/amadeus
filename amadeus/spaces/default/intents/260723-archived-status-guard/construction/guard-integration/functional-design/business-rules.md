# Business Rules — guard-integration

`unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`から、archived guardと公開境界の規則を定義する。

## Common guard rules

- BR-01: guardはpreflight recovery後のstrict statusだけを判断材料にする。
- BR-02: 対象不在とarchived拒否は別のtyped variantにする。
- BR-03: archived rejectionはintent、status、operation、unarchive復旧手順を持つ。
- BR-04: 対象不在はselector、operation、不在理由、利用可能な復旧操作を持ち、存在しないstatusを要求しない。
- BR-05: 共通dataを使うが公開形式は維持する。`next`はerror directive、selector/unparkはnon-zero CLI errorである。
- BR-06: reject pathは副作用前に終了し、silent no-opや汎用parse errorへ丸めない。
- BR-06a: `intent-not-found`はselector、operation、reason、recoveryをすべて必須とする。
- BR-06b: archived recoveryはplaceholderでなく、resolved dirNameを含む実行可能なcommand文字列にする。

## Operation rules

- BR-07: selectorはarchived intentをactive cursorへ設定しない。
- BR-08: selectorにforce、implicit unarchive、read-only selection迂回を追加しない。
- BR-09: stale cursorがarchivedを指す`next`はrun-stage/print/ask directiveを返さない。
- BR-10: `next`拒否はstage stateまたはauditを変更しない。
- BR-10a: `archivedNextGuard`の`ErrorDirective`は`kind="error"`とrender済みmessageだけを持ち、`handleNext`がstage resolution前に即returnする。
- BR-11: archived intentの`unpark`はpark marker有無にかかわらず拒否する。
- BR-12: `unpark`拒否はstatus、marker、state、auditを変更しない。
- BR-13: archived intentのlist、history、read-only artifact参照は禁止しない。

## Delegation rules

- BR-14: utilityはselector解決中のlockを保持したままstate subprocessを起動しない。
- BR-15: utilityはlock解放後にdirNameだけをstate verbへ渡す。
- BR-16: state subprocessは新しいlock内で対象、status、journal、human-presenceを再検証する。
- BR-17: utility解決後のTOCTOU変化はstate観測を正とし、安全側のnon-zero rejectionにする。
- BR-18: subprocessのstdout、stderr、exit codeをutilityがwrap、rewrite、downgradeしない。

## Verification rules

- selectorはintent name、record-dir、cursor writer内部callerを網羅する。
- `next`はarchived stale cursor fixtureでdirective生成前に拒否する。
- `unpark`はarchived + parked、archived + unparkedの双方を拒否する。
- 各拒否testはregistry、cursor、state、auditの該当bytes不変をassertする。
- coverageで目的guard branchへの到達を確認し、別parse errorによる同一exit codeを成功扱いしない。
- corpus discoveryでcursor writer、directive開始点、marker writer、status writerを列挙し、guard/transition迂回0件を確認する。
- corpus analyzerはcore toolsのTypeScript ASTとsymbol graphを使用し、named import/re-export/direct wrapperを追跡する。dynamic/解決不能pathや未分類sinkは検査失敗にする。
- coreから6 harness配布物とself-install treeを生成し、drift 0を確認する。
