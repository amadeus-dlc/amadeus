# Intent Capture Questions

**Mode:** chat  
**Captured:** 2026-07-25T00:42:58Z  
**Confirmed:** 2026-07-25T00:51:32Z  
**ユーザー承認:** 2026-07-25T00:51:32Z  
**Primary source:** Issue #1466 とユーザー提示の前提・受け入れ条件

## Q1. 解決する問題は何か

[Answer]: solo modeでは、通常stageのgateごとに新しい`HUMAN_TURN`が必要であり、時間制限付きのstanding grantが存在しても承認へ利用できない。大きなscopeでは承認頻度が過剰になる一方、単純に`HUMAN_TURN`要件を弱めると人間統制と監査証跡を損なう。対象gateに有効なstanding grantを、既存の監査イベントモデルのまま安全な認可根拠として利用できるようにする。

## Q2. 主な利用者とステークホルダーは誰か

[Answer]: 主利用者はsolo modeでAmadeusのintentワークフローを運用する人間のオペレーター。保護対象は同じオペレーターの承認権限と監査可能性である。互換性の利害関係者として、既存のteam mode利用者、全ハーネスのconductor実装者、state・directive・audit契約を保守するAmadeusメンテナーがいる。

## Q3. 成功をどのように測定するか

[Answer]: 有効かつ対象をカバーするgrantで、追加の`HUMAN_TURN`なしにsolo modeの通常gateを承認できること。`GATE_APPROVED`にcommit時に再検証した正確なGrant Idが残ること。route後の失効・取消・対象外ではstageを完了せず、`STAGE_COMPLETED`や`ERROR_LOGGED`を誤記録せずhuman gateへ戻ること。team mode、phase-boundary、walking-skeleton、per-unit Constructionの現行規則が回帰しないこと。directive・state transition・auditのテスト、型チェック、関連テスト、全テスト、生成物drift checkが通ること。

## Q4. このinitiativeを今開始する理由は何か

[Answer]: Issue #1466で、team modeには既にstanding grantによる承認頻度の償却経路がある一方、solo modeでは明示的に利用できない機能差が特定されたため。PR #1468は凍結済みの試作であり、問題理解の参考にはできるが、その実装形状を設計上の前提にはしない。

## Q5. 初期scopeと非交渉制約は何か

[Answer]: `amadeus-feature` scopeで、現行team modeのstanding grant発行・探索・委任・gate approval・監査記録をコードから先に解明し、solo modeとの差分、ドメインモデル、認可境界、失効競合、監査不変条件を成果物化してから実装する。gateの有無と認可主体を分離し、route時に選んだGrant Idを明示的にcommitへ渡して同一grantを再検証する。standing grant専用の擬似gate値、stderr文字列判定、新しい設定モデル、team mode委任処理の流用は導入しない。重要判断はgateで確認し、設計承認前に実装しない。
