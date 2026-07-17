# Application Design — 明確化質問(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## 選挙不要判定(E-OC1 3段順序)

判定: 全6論点を選挙不要(0問)とする。2026-07-17T19:57Z頃にconductor e1かleaderへ申告し、leaderが2026-07-17T19:57:37Zに常任グラント `de2842f3` を根拠として承認した(agmsg出典)。回答の先取り記入はなく、本承認後にこの証跡を作成した。

| 論点 | 判定 | 既決の所在 |
|---|---|---|
| Component boundary | 既決 | 既存CodeKB 2ファイルとlifecycle recordのartifact境界のみ。新規application componentは作らない |
| Architectural style | 既決・非該当 | runtime topologyを変更せず、既存one-core-many-harnessesとrepository構成を温存 |
| Communication pattern | 非該当 | service、API、event、network callを追加しない。証拠はMarkdownとgit metadataでhandoff |
| Data ownership / storage | 既決 | 公開Markdownとgit metadataは既存repository所有を維持。DB・AWS resource・secretなし |
| Brownfield integration | 既決 | fix祖先性とcontent cleanを分離し、盲目的再適用を禁止。検証→human landing→main再検証→closeの順序を維持 |
| UI component structure | 非該当 | user-facing UIとinteractionの変更なし。新規accessibility判断なし |

AWSのservice選定、scale、cost、Well-Architected trade-offはresource追加がないため非該当。未決のArchitect / AWS / Design判断はない。

## 質問

なし(0問)。

## §13選定

persist 0件。surface確定値は `memory_entries_total=3`、`candidates=[c1,c2,c3]`、`open_questions=[]`。c1 / c2はstage固有の既決・非該当整理、c3はIssue #1129固有のADRであり、既存 `cid:reverse-engineering:diff3-marker-vocab` およびno-AI-merge / landing後close規則の適用である。新規の再利用可能学習・未解決論点がないため重複学習を作らない。leaderが2026-07-17T20:06:26Zに常任グラント `de2842f3` に基づき承認した(agmsg出典)。
