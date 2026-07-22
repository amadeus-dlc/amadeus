# Security Design — routing-and-autonomy-guards

> 入力: `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。CLI tokens、slug、marker metadata、workflow stateを既存trust boundary内で検証する。

## Trust boundaries

| Boundary | Accepted input | Control | Rejected behavior |
|---|---|---|---|
| CLI→routing | normalized tokens | `classifyHelpIntent`共有decision table | 長いfreeform中のhelp横取り |
| namespace→record creation | validated non-reserved slug | intent/space両choke pointのreserved guard | `help` record、`space-create -h`→`h` |
| filesystem→Stop/doctor | 単一markerのstat result | `inspectComposeMarker` | directory scan、stale/unreadable carve-out |
| workflow state→recompose | lock内snapshot | `assertRecomposeAllowed`を最初のdomain guardとして適用 | autonomous mutation、validation bypass |
| authored source→projection | package manifest | generator/check | dist手編集、silent expansion |

## Namespace・recovery controls

global helpは単独help/-hとnamespace helpだけに限定する。intent birthとspace creationはslug生成後の単一reserved vocabularyを共有し、`space-create -h`はslugify前に拒否する。unknown intent/space switchは既存record一覧だけを示し、birth/createを回復手順として提示しない。

拒否時はdirectory、cursor、state、auditを不変にする。new credential、permission、network、database、service、UI、runtime dependencyを追加しない。

## Marker・autonomy controls

non-autonomousではfreshだけがallow-stopで、absent/stale/unreadableはcontinue-enforcementとする。stale cleanupの成功/失敗はdecisionと直交させる。autonomous Constructionはmarker I/O前にcontinue-enforcementを確定し、markerを読まず削除もしない。

doctorはpath/bytes/mtimeを変更しない。probe failureは他doctor checksを継続させるが、unreadableをfreshへ昇格しない。

## Recompose mutation guard

既存audit lock内でstate snapshotを取得した直後、plan suffix、runtime graph、checkbox、auditを触る前に`assertRecomposeAllowed`を呼ぶ。autonomousならhuman gateまたはswarm完了をremediationとしてloudに拒否し、全対象bytesを保持する。gated/unsetだけを既存strict validationへ渡し、known slug、pending、graph、walking-skeleton guardを緩和しない。

## トレーサビリティ

本設計は`security-requirements.md`のSEC-U04-01〜05、`performance-requirements.md`の有界処理、`scalability-requirements.md`のclosed inventory、`reliability-requirements.md`のmutation atomicity、`tech-stack-decisions.md`の既存lock/generator、`business-logic-model.md`のNamespace/Marker/Recompose failure decisionsへ対応する。
