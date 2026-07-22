# Functional Design Questions — routing-and-autonomy-guards

> 上流入力(consumes 全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> 一次同期根拠: upstream commits `ded69da`（help routing / reserved record names）と `45035ea`（compose marker freshness / recompose autonomy guard）。
>
> E-OC1 判定: 当初の質問0問判定は upstream `45035ea` の stale marker janitor 挙動を欠落していたため撤回。leader承認 `2026-07-20T10:35:47Z` は未執行・無効。Q1を `E-USSU04FD1` へ付議済み。

## 既決事項

U04の設計判断は承認済みRequirements Analysis、C2の公開seam、Units Generationとupstream一次差分で閉じている。

- `help` / `-h` の単独入力と `intent help` / `space help` はglobal helpへ分類し、長い自由文中の`help`はintent descriptionとして保持する。
- grammarとrecord namespaceの衝突を避けるため、`help`はintent/space作成choke pointで予約拒否する。未知recordへのswitch失敗は新規workflow作成を誘導せず、既存record一覧だけへ案内する。
- compose markerはmtimeと現在時刻から24時間TTLを判定し、freshだけをinteractive stop carve-outに使う。doctorはmarkerを変更せず、freshをadvisory PASS、staleをFAILとして修復方法とともに報告する。
- autonomous Constructionの`recompose`はstate、plan、runtime graph、auditを変更する前に拒否し、gated/unsetの既存挙動は保持する。
- `classifyHelpIntent`、`inspectComposeMarker`、`assertRecomposeAllowed`を純粋判定seamとし、既存CLI/hook/doctorは結果を薄く投影する。
- verification-first契約に従い、現行の部分実装をcharacterization testで固定してから不足だけをADAPTする。

help routing、freshness判定、doctorのread-only投影、recompose guardはFR-1 items 4–6とNFR-2/NFR-3の既決contractを既存C2 ownershipへ適用する作業であり、新規仕様判断はない。

## Q1: stale compose marker のjanitorをどこまで実行するか

upstream `45035ea` はStop hookでstale判定後にbest-effort `unlink`し、削除失敗でもcarve-outを拒否する。一方、承認済みFR-1 item 5はstaleをcarve-outに使わずdoctorで修復方法を示すことまでを固定するが、自動削除は明記しない。C2のrejected/failed invariantはmarker不変を規定するため、stale観測をjanitor成功として扱うか、人手修復対象として保持するかは単独決定しない。

- **A（推奨）— upstream同型janitor:** Stop hookがstale markerをbest-effort削除する。削除成否にかかわらずcarve-outは拒否し、doctorは実在markerに対してread-onlyのPASS/FAILを返す。ADOPT dispositionとupstream回帰testを最も忠実に保つ。
- **B — 手動修復:** Stop hookはstale markerを保持してcarve-outだけ拒否し、doctorがFAILと削除手順を示す。診断可能性とmarker不変を優先するが、upstream janitorから意図的に逸脱する。

## [Answer]

[Answer]: A。E-USSU04FD1で3–0、GoA favor 3 / against 0、留保なし。Stop hookはstale markerをbest-effort削除し、doctorはread-onlyとする。e2 GoA2留保を全数採用し、stale削除をcarve-out拒否の副作用でなく独立janitor outcomeとして責務分離する。unlink失敗でもblock判断を不変とし、fresh保持 / stale削除 / unlink失敗の3経路を対照testで固定する。根拠: `amadeus/spaces/default/elections/E-USSU04FD1/record.md`。質問0問に対するleader承認 `2026-07-20T10:35:47Z` は未執行・無効。

## Q2: autonomy guard とjanitorの優先関係

初回architecture reviewは、E-USSU04FD1の独立janitor outcomeをautonomous時にも適用するかが曖昧としてNEEDS REVISIONとした。upstream `45035ea` はautonomy guardで先頭returnし、markerを読まずjanitorも実行しないため、次の2案をE-USSU04FD2へ付議した。

- **A（採用）— upstream同型:** autonomous時はjanitor N/A、marker未読、staleも保持する。
- **B — 完全直交:** autonomous時もmarkerを観測し、staleならbest-effort削除する。

[Answer]: A。E-USSU04FD2で3–0、GoA favor 3 / against 0、留保なし。autonomous時は先頭returnでmarker未読・janitor N/A・stale保持とする。fresh保持 / stale削除 / unlink失敗でもblock不変 / autonomous保持の4経路を対照testで固定する。根拠: `amadeus/spaces/default/elections/E-USSU04FD2/record.md`。

## §13 Learnings Gate

E-USSU04FDS13は新規persist候補0件を3–0、GoA favor 3 / against 0、留保なしで採用し、recorded/verified。新規norm persistは不要。根拠: `amadeus/spaces/default/elections/E-USSU04FDS13/record.md`。
