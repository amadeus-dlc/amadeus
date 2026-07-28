# Requirements Analysis 質問ファイル — 260727-mirror-project-status

**モード**: Guide me
**前提**: Issue #1560(2026-07-27 改訂版+仕様変更 B)と上流成果物(intent-statement / scope-document / team-practices)で大半は既決。実装側の実測前提は RE codekb に依拠する — architecture(設計分岐点4点: MirrorOperation 3値5面連動・phase seam・Parked 未読・GraphQL ゼロ)、code-structure(mirror 16ファイル/9,208行地図と config/state の closed schema 所在)、business-overview(本 intent の業務位置づけ = Project ボード面への拡張)。未決は以下4問のみ(cid:intent-capture:c1 / requirements-analysis:c5 — 既存流儀で決まる事項は実装読みで確定し、真に新規の判断のみ質問)。

---

## Q1. auto-mirror 同意境界への Project 同期の包含

project.md の affirmed Mandated は `auto-mirror: auto` の standing consent を「bounded な create / sync / close」と規定。Project item 追加+Status 設定をこの同意にどう位置づけるか(practices-discovery からの送付事項)。

A. Project 同期(追加+Status 設定)は create/sync 操作の bounded な一部と定義し、既存同意がそのまま適用される(推奨 — Intent 自身のライフサイクル投影であり disallowed な「unrelated external action」(PR/release/deploy 類)に該当しない。操作単位の同意粒度は現行のまま)
B. Project 同期は別同意とする(新設定キーで独立に opt-in。同意が二重になり prompt モードの UX が複雑化)
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## Q2. Status 選択肢名の照合規則

既定マッピング(Ideation/Inception/Construction/Operation/Done)と上書き設定の選択肢名を、実 Project の選択肢へどう照合するか(feasibility の発見事項: 選択肢は Project 管理者が変えうる外部可変値)。

A. exact match(大文字小文字含む完全一致)のみ。不一致は解決不能として safety-blocked+診断に「期待名 vs 実在選択肢一覧」を表示(推奨 — fail-closed(parse-don't-validate)で意図しない選択肢への書込を構造排除。名前差異は上書き設定で吸収)
B. case-insensitive 照合(大文字小文字のみ吸収。それ以外の差異は safety-blocked)
C. trim+case-insensitive(前後空白も吸収)
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## Q3. 追加対象 Project とフェーズ Status 名上書きの設定形式

仕様変更 B の「設定済み対象 Project」と Issue の「Project 別 Status 名上書き」の設定面。既存流儀(実測): mirror config は 3層 config.json(global/space/intent、closed schema、最後の有効層が勝ち、`auto-mirror` 単一キー)。

A. 既存 3層 config.json へ closed-schema 拡張で新キーを追加(例: `"mirror-projects": [{"project": "amadeus-dlc/5", "status-names": {"ideation": "Ideation", ...}}]` — 対象 Project と Project 別上書きを1キーに同居。キーの正確な形は application-design で確定、requirements は「3層 config.json・closed schema・層は全置換(マージしない)」の契約のみ固定)(推奨 — 既存 auto-mirror と同じ置き場所・同じ fail-closed 流儀)
B. 別ファイル(mirror-projects.json 等)を新設する
C. amadeus-state.md のフィールドとして intent ごとに持つ(git 共有されるが intent 単位でしか設定できない)
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## Q4. parked 判定源

「parked では Status 維持」の判定に使う情報源。実測: mirror は現在 `Parked` フィールドを読んでおらず(82df115ae で旧読み手削除)、registry 由来の `registryStatus`(値 `parked` あり)のみ MirrorSnapshot に届く。boundary には `parked` kind も実在。

A. boundary kind + registryStatus の二重判定: `parked` boundary で発火した同期、または registryStatus が `parked` の間は Status 更新を skip(推奨 — 既存 landingEvidence が registryStatus を使う流儀と一致し、state フィールド読みの復活(新規 seam)を避ける)
B. `Parked` フィールド読みを lifecycleSnapshot に復活させて判定する(旧 buildSnapshot の再導入)
C. boundary kind のみで判定(parked boundary の同期だけ skip — park 中の manual sync では Status が動いてしまう)
X. Other (please specify)

[Answer]: A (2026-07-27, Guide me モード)

## 裁定の記録

- Q1=A(Project 同期は create/sync の bounded な一部)/ Q2=A(exact match)/ Q3=A(3層 config.json の closed-schema 拡張)/ Q4=A(parked boundary + registryStatus)。Guide me バッチ1回で取得し、確認サマリーでユーザーが確定した。
- ユーザー承認: 2026-07-27T05:39:15Z(確認サマリー「はい、生成へ進む」の実受領後に記入)
