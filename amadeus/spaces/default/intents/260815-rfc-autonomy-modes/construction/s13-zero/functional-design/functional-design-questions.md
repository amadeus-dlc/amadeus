# Functional Design — Questions(unit s13-zero)

> 承認: 2026-08-15T16:50:00Z — full 梯子 AUTO_DECIDED auto-decision-e12ac85dc9b1f60a37ea07aa12d2b556(全 unit の定型質問は RFC-0001 + 選挙 E-260815-RFC0001-DESIGN + ADR 留保 + Q6/Q9 人間裁定から一意導出 — 既決事項の再質問回避)。

## Q1: 「0 件」判定の機械化の実装点

- A. `amadeus-learnings.ts` の `SurfaceOutput`(:114-121)に `surfaceDigest`(candidates + parked_open_questions の内容から算出する digest)フィールドを新設し、`handleSurface`(:203-267)がこれを常に出力する。0 件確定 API(`confirmZeroCandidates`)はこの digest を受け取り、`candidates.length === 0` かつ digest が実際の surface 実行結果と一致することを条件に `ZeroReceipt` を発行する
- X. Other

[Answer]: A — ADR-6「0 件確定の唯一根拠は `amadeus-learnings surface` 出力(digest 束縛・監査記録)」。現状の `SurfaceOutput` は digest を持たず(stage-protocol.md:1220 の記述どおり conductor が JSON を読んで「0 件」と自己申告するだけの構造)、digest 束縛が ADR-6 の核心である。

## Q2: conductor 追加候補の許容範囲

- A. `addConductorCandidate(candidate, diskEvidencePath)` は候補を**増やす方向のみ**受け付ける — 既存 `candidates[]` の削除・置換は不可。`diskEvidencePath` は追加候補の根拠となる disk 上のファイル(memory.md の当該断面、会話ログの record 化断面など)を指し、そのパスが実在し追加候補の主張と対応することを機械検査する。パスが実在しない、または内容が候補主張と無関係な場合は追加を拒否する
- X. Other

[Answer]: A — ADR-6「conductor 追加候補は『増やす』方向のみ許可、disk 上の記録から再導出可能であることを要件に」。「対応することを機械検査する」の具体的な照合方法(完全一致 / 部分文字列 / LLM 判定)は本 unit の実装詳細に委ねる(RFC は方式まで指定していない)。

## Q3: §13 儀式スキップの発火位置

- A. `confirmZeroCandidates` が `ZeroReceipt`(0 件確定)を返した場合のみ、選定裁定(structured question の提示・選挙トリガ)を発火しない。1 件以上の候補が存在する限り(conductor 追加を含む)、既存の選定裁定フロー(stage-protocol.md §13 の手順3・ソロ自動選挙フック含む)は無改変で走る
- X. Other

[Answer]: A — ADR-6 は 0 件時のみを対象とし、既存の選定裁定フロー自体(1 件以上のケース)の変更は要求していない。RFC-0001 確認ポイント#10「§13 学習選定」の ToBe(付録の表)も「候補 0 件なら儀式を開かない」という条件付きのみを規定。

## Q4: 監査記録の対象

- A. 0 件確定・追加候補集合のいずれも監査へ記録する(ADR-6 の decision 文言どおり)。新規イベント種は追加せず、既存の §13 監査経路(persist が使う `withAuditLock` トランザクション、`RULE_LEARNED` 系)に相乗りするのではなく、surface 実行時点の digest を surface 呼出のログ(既存の stdout JSON)に確定的に含めることで「再導出可能」性を満たす — 0 件確定という事実そのものの専用イベント種の要否は監査フォーマットの後方互換を保つため、既存 `RULE_LEARNED` 系のゼロ件版(0 selections の persist 呼出、または新規の軽量イベント)のどちらにするかは code-generation 側の実装選択に委ねる
- X. Other

[Answer]: A(一部 handed-off) — ADR-6 は監査記録を要求するが監査イベントの新設可否までは裁定していない。event-registry への新規追加が必要な場合は既存の登録手順(`unregisteredEventRejection` ゲート — `amadeus-audit.ts:573`)に従う旨を code-generation への明示申し送りとする(新しいルーリングの捏造ではなく、確定していない実装細部の委譲)。
