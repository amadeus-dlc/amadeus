# Business Rules — U001 CodeKB hygiene verification handoff

上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Scope and Invariants

本ルールは`unit-of-work.md` のU001だけに適用し、`unit-of-work-story-map.md` が示すstory 0件の境界を越えない。`requirements.md`、`components.md`、`component-methods.md`、`services.md` で既決のverification contractを精密化するもので、application code、API、schema、service、UIを新設しない。

常に成立しなければならないinvariantは次のとおり。

- 対象pathは2ファイルだけであり、検査中に追加・置換しない。
- すべてのcontent検査は、先に解決した同一full SHAを入力とする。
- Marker件数はpath×4語彙で保持し、全8値が0の場合だけcontent cleanである。
- Heading件数はpathごとに`latest=1`かつ`history260715=1`の場合だけstructure cleanである。
- Ancestry、content clean、record landingは別の事実であり、相互の代理値にしない。
- Pre-landing `gate-ready`とpost-landing `close-eligible`は異なる状態であり、前者からIssue closeを許可しない。

## Validation Rules

| Rule | Condition | Verdict | Required evidence |
|---|---|---|---|
| BR-1 | refがfull SHAへ解決できる | 続行 | refと40桁SHA |
| BR-2 | 対象2 pathがそのSHAに存在する | 続行 | path別read成功 |
| BR-3 | `<<<<<<<`、`|||||||`、`=======`、`>>>>>>>` の行頭一致がpath別に各0 | content clean | 8個の件数 |
| BR-4 | 最新H2と`260715-opencode-cursor-harness`履歴H2がpath別に各1 | structure clean | 4個の件数 |
| BR-5 | fix SHAと測定SHAの祖先性を検査済み | ancestry recorded | ancestor / non-ancestor |
| BR-6 | CI verdictがgreen | pre-landing候補 | check identityとgreen verdict |
| BR-7 | 起票者以外2名の独立reviewがgreen | pre-landing候補 | reviewer identityとverdict |
| BR-8 | 全declared sensorがgreen、§13選定が確定、gateが有効なauthorityでapproved、pushが成果物を含む | pre-landing候補 | sensor全件、§13、gate approval / authority、push SHAのaudit provenance |
| BR-9 | BR-1〜BR-8を同一handoffに保持 | `gate-ready` | `PreLandingEvidence` |
| BR-10 | humanがlandingし、landed main SHAでBR-1〜BR-4を再実行してgreen、かつIssue #1129の観測stateがOPEN | `close-eligible` | landed SHA、新規実測、`IssueObservation(state=OPEN)` |

BR-1〜BR-8のいずれかが成立しない場合、BR-9は`stop`を返す。sensorのfailed、gateのunresolved / rejected、approval時点で失効したgrant、artifactを含まないpushは「記録あり」でもBR-8を満たさない。BR-10が成立しない場合、Issue #1129はOPENを維持する。BR-10の証拠より前にIssueがCLOSEDなら`stop(ordering violation)`としてhuman / leaderへ報告する。

## Conditional Behavior

### Contentとancestry

- Content greenかつ`non-ancestor`: cleanを報告し、系統未着地を別fieldで報告する。marker削除を再適用しない。
- Content redかつ`ancestor`: cleanを拒否する。祖先性をcontent証明へ昇格しない。
- Content greenかつ`ancestor`: 両方を独立したgreen evidenceとして保持する。
- Ancestry検査不能: content結果を保持してもpre-landing判定は停止する。

### Lifecycleとexternal operations

- Engine doneかつmain未着地: lifecycle done / landing pending / Issue OPENを同時に報告する。
- Human landing済みかつ再検証未実施: Issue OPEN。branch実測を再利用しない。
- Landed main再検証green: leader / humanへclose eligibilityを引き渡す。本conductorはIssueをcloseしない。
- Landed main再検証前またはredでIssueがCLOSED: ordering violationとして停止・報告し、正常完了やclose-eligibleと扱わない。
- 明示承認なし: PR merge、main merge、Issue closeを実行しない。

## Error and Edge Rules

| Error / edge | Required response | Forbidden fallback |
|---|---|---|
| 測定ref不明 | `stop(ref unresolved)` | current HEADの暗黙利用 |
| 対象path欠落 | `stop(target missing)` | 類似fileへの置換 |
| Marker 1件以上 | SHAとfile:lineを記録して停止 | 目視で無害判定 |
| H2が0件または複数 | pathと実測値を記録して停止 | 手計数による補正 |
| CI missing / non-green | pre-landing handoff停止 | sensor greenによる代替 |
| Review人数不足 | pre-landing handoff停止 | author reviewの独立review扱い |
| Sensor / gate / push不足 | pre-landing handoff停止 | audit外の口頭確認 |
| Sensor failed、gate rejected / unresolved、approval authority失効 | pre-landing handoff停止 | 存在するaudit rowだけでgreen扱い |
| Refが検査中に前進 | 固定SHAの結果を完結させ、必要なら新しい全検査を開始 | 新旧結果の混在 |
| Main未着地 | `landing pending` | engine doneを着地済み扱い |
| Post-landing証拠前にIssue CLOSED | `stop(ordering violation)`をhuman / leaderへ報告 | close済みをclose-eligibleの代用にする |

## Policy Ownership

Ruleの実行主体は検証時点のconductor、landing判断はhuman / leader、Issue closeはpost-landing evidenceを受領するleader / humanである。`components.md` のHuman landing boundaryとPost-landing verifier、`services.md` のLanding handoff / Issue closeの所有権を変更しない。
