# Stakeholder Map — Intent-scoped Autonomy

## Stakeholder一覧

| Stakeholder | 関心 | 必要な成果 |
|---|---|---|
| Amadeus利用者 | 選択した自律レベルどおりに、不要な停止なくIntentが進むこと | 明瞭なmode、status、停止理由、再開条件 |
| 人間の承認者（principal） | 認可範囲を制御し、自動裁定を後から検証できること | grant scope、監査履歴、事後確認surface |
| Amadeusメンテナー | Coreがharness-neutralで、責務境界が保たれること | 安定したschema、runtime graph、Event Registry、contract tests |
| Quality Repair Plugin保守者 | 品質evidenceと修復方針をCoreから疎結合に寄与できること | 正規化済みcontribution SPI、閉じたroute contract |
| Harness adapter開発者 | harness固有実装を最小化し、新規harnessを追加できること | machine-readable result envelope、capability profile、conformance suite |
| 外部runner / scheduler所有者 | 停止・再開条件を機械的に解釈できること | outcome、reason code、retryability、fingerprint |
| 品質・reviewer契約の保守者 | 自動修復がREADYやsensorの意味を弱めないこと | obligation、iteration、completion conditionの接続契約 |
| 外部integration保守者 | CoreへGitHub等の固有概念を持ち込まず、外部feedbackを接続できること | 正規化入力境界とIntent/Bolt関連付け |

## Decision Makers

- **人間の承認者:** modeのupgrade / downgrade / revoke、grant scope、事前裁定方針、scope拡張、waiver、不可逆操作を決定する。
- **Issue owner / product owner:** #2067、#2095、#2096のcontract不足や矛盾について、仕様変更が必要な場合に裁定する。
- **AI-DLC approval gateの人間:** 各stage成果物がIssue fidelity ruleとIntent完了条件を満たすか承認する。

AI、election、pluginは人間専権の決定主体ではない。既決norm・grant・Issue contractの範囲で裁定または推薦し、その根拠を監査へ残す。

## Influencers and Implementers

- Product Agent: Issueの意図、対象利用者、成功指標、scope境界を維持する。
- Architect Agent: Core / plugin / adapter / external runnerの境界と依存方向を検証する。
- Developer Agent: 承認済みcontractを最小変更で実装し、全harness生成物を同期する。
- Quality Agent: contract tests、live smoke、失敗境界、回帰証拠を検証する。
- Harness maintainers: 各harness固有capabilityとloud degradationの実在性を検証する。

## Communication Requirements

| タイミング | 対象 | 伝える内容 |
|---|---|---|
| 各planning stageのgate | 人間の承認者 | Issueとの対応、検出した抜け・矛盾、仮定、未決事項 |
| 各Bolt完了時 | メンテナー・品質担当 | 変更したcontract、実測テスト、未解決BLOCKER |
| harness検証時 | Harness adapter開発者 | capability差、degradation、contract parity |
| 異常停止時 | 利用者・外部runner所有者 | grant保持状態、reason code、fingerprint、resume condition |
| Intent完了時 | 全Stakeholder | 3件のIssue受け入れ条件、5harness実測結果、残FOLLOW-UP |

## Source of Truth

- Product contract: [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)
- Generic loop infrastructure: [#2095](https://github.com/amadeus-dlc/amadeus/issues/2095)
- Quality repair policy: [#2096](https://github.com/amadeus-dlc/amadeus/issues/2096)
- Workflow record: `amadeus/spaces/default/intents/260803-intent-autonomy/`
