# Election Record — E-OMSB2A-DEV

- question: Bolt 2a(U2 span-attrs)builder の実装前停止による設計裁定。FD 契約『resolver 6キーを span 属性へ直載り・store/Relay 無改変』に対し、6キーは DEFAULT_REDACTION_POLICY(redaction.ts:73-91 = registry 語彙+手書き8キー)の default-deny(:126)により store 境界(local-span-exporter.ts:96)と Relay 境界(relay.ts:233)で全数 drop される実測(決定的プローブ: 6キー+対照 ExitCode を redactAttributes へ → ExitCode のみ生存)。契約どおりの実装は永続シグナル上で完全無機能となり検証劇場クラス。builder 報告全文 = scratchpad/b2-spanattrs-report.md。6キーの admit 方式を裁定せよ。

裁定: 案A: DEFAULT_REDACTION_POLICY.safeKeys へ6キー追加(choice 1: 2票)
内訳: choice1=2票 choice2=0票 choice3=0票
- 留保(subagent-1, GoA2): 案A の採用は、builder が挙げた2件の追加テスト義務(export 境界通過後の JSONL 実文字列で6キー生存 assert / credential 形 amadeus.agent.id の scrub assert)を必須の受け入れ基準として扱うことを条件とする — 前者を欠くと本欠陥クラス(span record 直読は green・永続面は無機能)が再び構造的に検出不能になる。あわせて redaction.ts:76-77 のコメント『Low-cardinality operational keys predating the registry vocabulary plus the correlation ids』は6キーを説明しないため、span 文脈属性の層として明文化する(無注記の追記は、次の読み手に『なぜ event 属性 policy に amadeus.* があるか』を辿れなくする)。
- 留保(subagent-2, GoA2): 案A の採用に賛成するが、2点を実装条件として明記することを求める。(1) builder が挙げた追加テスト義務2件(export 境界通過後の JSONL 実文字列で6キー生存 assert / credential 形の amadeus.agent.id が scrub される assert)を任意でなく必須の受け入れ基準として FD テスト義務へ追補する — span record 直読のテストだけでは本欠陥クラスを構造的に検出できないことが本件そのもので実証されており、テストを足さずに safeKeys だけ広げると同じ盲点が次の属性追加で再発する(cid:code-generation:injection-surface-verify のテスト面)。(2) safeKeys へ追加する6キーには『span 文脈属性(registry 語彙ではない)』である旨のコメントを併記する — 直上のコメントが手書き群を『registry 語彙に先行する低カーディナリティ運用キー』と定義しており、注記なしに追加すると REGISTRY_ATTRIBUTE_KEYS 由来と誤読され、将来の registry 起点の棚卸しで削除されうる。
票タイムライン: 配信 2026-08-01T07:30:31Z → 配信 2026-08-01T07:30:31Z → subagent-1 2026-08-01T13:05:00Z(受理 2026-08-01T07:32:20Z) → subagent-2 2026-08-01T05:40:00Z(受理 2026-08-01T07:32:34Z) → 開票 2026-08-01T07:32:58Z
GoA[E-OMSB2A-DEV]: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
