# PR #1469 Mirrorレビュー指摘修正 — 要件

## Intent分析

本intentの目的は、[PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469) で実測確認された6件の正しさ・安全性欠陥を、外科的なbugfixとして修正することである。利用者がGitHub Mirrorの副作用を完了済みと誤認せず、prompt回答と保存済み要求の対応を証明でき、すべてのmutationが同じlifecycle安全境界を通る状態を回復する。併せて、設定読み込み、state JSON codec、coverage source集約をfail-closedかつ正準な挙動へ戻す。

成功は、各欠陥について修正前に失敗する再現テストを追加し、修正後にfocused tests、Mirror関連テスト全体、repository-native full CIが通ることで判定する。巨大ファイル分割とgateway lexer共通化は、このintentでは扱わない。

## 入力とトレーサビリティ

本要件は、directiveが権威あるconsumeとして渡した`business-overview`、`architecture`、`code-structure`と、`requirements-analysis-questions.md`に記録したユーザー回答から導出した。これら以外のartifactを要件根拠として扱わない。

`requirements-analysis-questions.md`で、次の3点をユーザー確認済みである。

1. lifecycle CLIは`completed`だけをexit 0とする。
2. lifecycle CLIへ`answer approve|skip --binding-id <id>`を追加し、approve/skipの双方で保存済みbindingとの一致を必須化する。
3. legacyの`create|sync|close`というverb名は維持するが、`--instance`を必須化し、lifecycle `manual`へ委譲する。

| 要件ID | 実測finding | 主な所有領域 | 検証証拠 |
|---|---|---|---|
| FR-1 | 未完了outcomeがexit 0 | Mirror lifecycle CLI | CLI/integration再現テスト |
| FR-2 | prompt回答CLI欠落・binding不整合 | lifecycle、policy、state | parser、approve/skip、stale bindingテスト |
| FR-3 | legacy mutationが安全境界を迂回 | legacy CLI、lifecycle | delegation、引数、no-direct-mutationテスト |
| FR-4 | Cursor/OpenCode coverage正規化漏れ | coverage source normalizer | source mapping unitテスト、LCOV集約テスト |
| FR-5 | 設定読み込みTOCTOU | Mirror config safe read | path-swap integrationテスト |
| FR-6 | state codecが未エスケープC0文字を受理 | Mirror state codec | U+0000〜U+001F境界テスト |

## 機能要件

### FR-1: lifecycle CLIの完了表現

優先度: Must

`boundary`および`manual` CLIは、Mirror operationが実際に`completed`となった場合だけexit 0を返さなければならない。`ask`、`pending`、`safety-blocked`、`suppressed`は、JSON outcomeを出力しつつ非0を返さなければならない。usage errorはexit 2、runtime/error outcomeはexit 1という既存契約を維持する。呼び出し側は非0結果をphase receiptの`completed`へ昇格させてはならない。

受入基準:

- Given: lifecycle boundaryまたはmanualが`completed`を返す。When: CLIが終了する。Then: exit codeは0である。
- Given: lifecycle boundaryまたはmanualが`ask`、`pending`、`safety-blocked`、`suppressed`のいずれかを返す。When: CLIが終了する。Then: exit codeは非0であり、outcome種別を機械可読に確認できる。
- Given: outcomeが未完了である。When: 呼び出し元がreceiptを処理する。Then: receiptは`completed`へ進まない。

### FR-2: prompt回答とbindingの一致

優先度: Must

lifecycle CLIは、公開コマンド`answer approve|skip --binding-id <id>`を提供しなければならない。`ask` outcomeは、保存した`expectedPrompt.bindingId`と同じ`bindingId`を返さなければならない。answer CLIは、指定されたbindingが現在の`expectedPrompt`と一致した後に、eventとoperationを保存済みpromptから導出しなければならず、eventまたはoperationを呼び出し側から受け取ってはならない。内部の`MirrorPromptAnswer.answerId`はCLI adapterが生成し、監査・state transitionへ渡す。approveとskipは同じ照合処理を通り、不一致、欠落、またはすでに消費済みのbindingはfail-closedで拒否しなければならない。本intentではbindingの有効期限を新設しない。

受入基準:

- Given: prompt modeが回答待ちを保存する。When: lifecycleが`ask`を返す。Then: outcomeに保存済み値と同一の`bindingId`が含まれる。
- Given: 現在のbinding IDを指定したapprove。When: answer CLIを実行する。Then: event/operationは保存済みexpected promptから導出され、CLI生成の非空`answerId`とともに許可済み経路だけが継続する。
- Given: 現在のbinding IDを指定したskip。When: answer CLIを実行する。Then: event/operationは保存済みexpected promptから導出され、CLI生成の非空`answerId`とともに対象promptだけがskipとして消費され、GitHub mutationは行われない。
- Given: 誤った、欠落した、または消費済みbinding ID。When: approveまたはskipを実行する。Then: 非0で拒否され、stateとGitHubに副作用がない。
- Given: 回答が別eventまたは別operationへ転用される。When: 回答処理を試みる。Then: 保存済みbindingの照合により拒否される。
- Given: 一度消費されたbindingに対してanswer CLIを再実行する。When: 2回目の回答を処理する。Then: 消費済みとして非0で拒否し、GitHub mutationと追加state transitionを行わない。

### FR-3: mutation経路のlifecycle一元化

優先度: Must

legacy CLIの`create|sync|close`はverb名を維持するが、直接GitHubを変更してはならず、それぞれlifecycle `manual create`、`manual sync`、`manual close`へ一対一で委譲しなければならない。各mutation verbは再試行を識別する`--instance`を必須とし、欠落時はusage errorにしなければならない。`--instance`追加以外は、既存の`--intent`による対象解決、completed時のstdout表現、usage=2/runtime=1のexit契約を維持する。未完了outcomeはFR-1に従って非0とし、その種別を診断へ含める。`status`は引数、出力、exit codeを含めread-onlyの既存契約を維持する。

受入基準:

- Given: `create|sync|close`を`--instance`なしで呼ぶ。When: 引数を解析する。Then: exit 2でusageを返し、stateとGitHubに副作用がない。
- Given: 有効な`--instance`付きlegacy mutation。When: コマンドを実行する。Then: permit、receipt、provenance、repair/close guardを含むlifecycle `manual`経路だけが使われる。
- Given: legacy `create`、`sync`、`close`。When: lifecycleへ委譲する。Then: manual operationはそれぞれ`create`、`sync`、`close`へ一対一で写像され、`--instance`はinvocation IDとして渡される。
- Given: 既存の`--intent`指定とcompleted結果。When: 委譲後のlegacy commandを実行する。Then: 対象intentの解決、成功時のstdout表現、exit 0を維持する。
- Given: 同じ`--instance`で再試行する。When: 同じoperationを実行する。Then: durable receiptにより同一呼び出しとして扱われ、重複mutationを行わない。
- Given: legacy `status`。When: 実行する。Then: GitHubとrecord treeを変更せず、従来どおり状態を報告する。
- Given: legacy module。When: mutation経路を静的または注入seamで検証する。Then: 直接`gh` mutation handlerへ到達する経路が存在しない。

### FR-4: coverage source pathの正準化

優先度: Must

coverage normalizerは、CursorおよびOpenCodeへ生成されたMirror関連ソースを、coreの正準source pathへ写像しなければならない。対象path familyと写像は次のとおりとする。`<source>`はharness root配下の相対source pathである。

| Path family | 入力pattern | 出力 |
|---|---|---|
| Cursor self-install | `.cursor/<source>` | `packages/framework/core/<source>` |
| OpenCode self-install | `.opencode/<source>` | `packages/framework/core/<source>` |
| Cursor distribution | `dist/cursor/.cursor/<source>` | `packages/framework/core/<source>` |
| OpenCode distribution | `dist/opencode/.opencode/<source>` | `packages/framework/core/<source>` |
| Cursor temp package | `<tempRoot>/amadeus-pkg-cursor-<suffix>/.cursor/<source>` | `packages/framework/core/<source>` |
| OpenCode temp package | `<tempRoot>/amadeus-pkg-opencode-<suffix>/.opencode/<source>` | `packages/framework/core/<source>` |

temp packageは、入力pathがrepo root外かつ明示された`tempRoots`配下にある場合だけ写像する。同一のauthored sourceを複数source entryとして集計してはならない。

受入基準:

- Given: `.cursor`または`.opencode`配下の生成済みMirror source path。When: source pathを正規化する。Then: 対応するcore正本pathになる。
- Given: Cursor/OpenCodeのdistribution投影path。When: 既存のClaude/Codex/Kiro投影と同じnormalizerへ入力する。Then: 対応するcore正本pathになる。
- Given: `tempRoots`配下のCursor/OpenCode temp package path。When: source pathを正規化する。Then: harness名とharness directoryの組を検証し、対応するcore正本pathになる。
- Given: repo root外だが`tempRoots`に含まれないpath、またはCursor/OpenCodeのharness名とdirectoryが不一致なpath。When: source pathを正規化する。Then: core正本pathへ写像しない。
- Given: core、Cursor、OpenCodeの同一sourceを含むLCOV。When: coverageを集約する。Then: 単一の正準source entryへ統合される。
- Given: 生成コピーに未カバー行がある。When: 正規化後のcoverageを計算する。Then: 同じauthored lineを重複して未カバー計上しない。

### FR-5: Mirror設定読み込みのTOCTOU防止

優先度: Must

設定ファイル読み込みは、containment確認した対象と実際にopenしたfile descriptorが同一ファイルであることを証明しなければならない。最終path componentのsymlink追跡を防ぎ、検証とopenの間にpathが差し替えられた場合はfail-closedにしなければならない。既存の安全なopen実装を再利用できる場合は、その不変条件に合わせる。

受入基準:

- Given: 許可されたroot内の通常ファイル。When: 設定を安全に読む。Then: 内容を読み込める。
- Given: containment確認後かつopen前に対象pathがroot外symlinkへ差し替えられる。When: 読み込みを続行する。Then: root外内容を読まずエラーにする。
- Given: open前後のdevice/inodeが検証対象と一致しない。When: 読み込みを続行する。Then: 内容を採用せずエラーにする。
- Given: 最終path componentがsymlinkである。When: 設定をopenする。Then: symlinkを追跡しない。

### FR-6: strict JSON C0制御文字拒否

優先度: Must

Mirror state codecのstrict JSON parserは、文字列内の未エスケープU+0000〜U+001Fをすべて拒否しなければならない。正しくエスケープされた制御文字はJSON標準どおり受理しなければならない。少なくともこの入力領域では、native `JSON.parse`より寛容であってはならない。

受入基準:

- Given: 文字列内に未エスケープU+0000〜U+001Fのいずれかを含むstate。When: strict codecでdecodeする。Then: malformedとして拒否する。
- Given: 未エスケープtab U+0009。When: decodeする。Then: native `JSON.parse`と同様に拒否する。
- Given: `\t`、`\n`、`\u0000`など有効にエスケープされた制御文字。When: decodeする。Then: 他のschema条件を満たす限り受理する。
- Given: 通常の既存state fixture。When: decode/encode round tripする。Then: 既存の意味内容を維持する。

## 非機能要件

### NFR-1: セキュリティとfail-closed

binding不一致、path identity不一致、malformed JSONは、いずれも副作用またはデータ採用の前に拒否しなければならない。失敗時にGitHub mutation、state昇格、root外ファイル読み込みを発生させてはならない。

### NFR-2: 信頼性と冪等性

manual mutationの同一`--instance`再試行は同一操作として識別されなければならない。未完了outcomeを完了と表現せず、再実行またはrepairに必要なdurable stateを保持しなければならない。

### NFR-3: テスト可能性

6件すべてに、修正前の欠陥を再現するfocused testを先行追加する。テストは外部GitHubへの実mutationに依存せず、runtime、filesystem、gateway seamを用いて決定的に再現できなければならない。最終検証はfocused tests、Mirror関連suite、typecheck、lint、distribution/self-install drift check、repository-native full CIの順で行う。

### NFR-4: 配布面の等価性

core正本を変更した場合、Claude、Codex、Kiro CLI、Kiro IDE、Cursor、OpenCodeの生成投影はrepositoryのpackaging手順で再生成し、正本とのdrift checkを通さなければならない。生成投影だけを手編集してはならない。

### NFR-5: 変更局所性

変更行は6件の欠陥、その再現テスト、必要な公開help/contract、生成投影に直接追跡できなければならない。隣接する一般的なリファクタリングを同時に行わない。

## 制約と前提

- 実装言語、runtime、test runnerは現行のTypeScript、Bunを維持する。
- record treeを正本、GitHub Issueを一方向Mirrorとする既存境界を変更しない。
- legacy mutation verb名は残すが、`--instance`必須化による呼び出し形式の破壊的変更は許容する。
- exit codeの具体値は既存のusage=2、runtime/error=1を維持し、未完了outcomeは少なくとも非0であることを必須とする。
- coverage数値の特定閾値回復を要件にしない。重複source entryの除去と正準化を検証対象とする。
- TOCTOUテストは、実ファイル差し替えまたは同等の決定的seamで、検証対象inodeとopen対象inodeの不一致を実証する。
- gateway scannerは直後の`JSON.parse`により不正JSONを拒否するため、lexer共通化は今回のcorrectness修正に含めない。
- prompt bindingにTTLまたは期限切れstateを追加しない。

## 対象外

- `amadeus-mirror-state-codec.ts`およびexecutorの1,000行超モジュール分割
- gateway JSON scannerとstate codec parserの共通化
- Mirror以外のcoverage architecture再設計
- 新しいMirror mode、双方向同期、GitHub以外のbackend追加
- 検証されていない隣接レビュー指摘の修正

## 未解決事項

Requirements Analysis時点の未解決事項はない。実装中に既存APIとの新たな矛盾が実測された場合は、推測で契約を拡張せず、再現証拠とともにAmadeusのhalt-and-ask経路で確認する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T03:26:37Z
- **Iteration:** 1
- **Scope decision:** none

6件の欠陥、ユーザー回答、対象外の大枠は整合しているが、prompt回答契約、legacy CLI互換境界、coverage対象パスに実装・試験上の未確定事項が残る。現状では開発者とQAが推測を要する。

### Findings

- FR-2は上流architectureがprompt回答をbindingId・event・operation・answerIdの一組として扱う方向を示す一方、公開CLIにはapprove|skipと--binding-idしか規定していない。event/operationを保存済みexpectedPromptから導出するのか、answerIdを誰が生成して再送・重複回答をどう扱うのかを明記する必要がある。
- FR-2は「期限切れbinding」を拒否対象に追加しているが、有効期限、起算点、判定時刻、期限切れ後のstate遷移が上流入力にもユーザー回答にも定義されていない。未定義の期限概念は削除するか、テスト可能な契約として明示する必要がある。
- FR-3はcreate|sync|closeをmanualへ委譲するとだけ定め、各verbからmanual operationへの写像、既存引数・対象解決・JSON出力・exit契約の維持範囲を定義していない。ユーザーが許容した破壊的変更は--instance必須化なので、それ以外を維持するのか変更可能なのかを明示する必要がある。
- FR-4の「同型のdistribution投影」は列挙可能な受入対象になっていない。code-structureが指摘するCursor/OpenCodeのroot・dist・temp package sourceのうち、要件はself-installとdistributionしか明示せずtemp packageを落としている。対象となるpath familyと期待するcore正本pathを具体的に列挙する必要がある。
- 入力トレーサビリティ節はre-scan、intent監査記録、memory/project.mdを根拠として主張しているが、これらは今回の権威あるconsume一覧に含まれない。権威あるbusiness-overview・architecture・code-structure・質問回答だけで根拠を表現するか、stageのconsume契約として正式に渡す必要がある。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-25T03:29:22Z
- **Iteration:** 2
- **Scope decision:** none

前回の5 findingsはすべて解消された。prompt回答の導出・answerId・再回答拒否、binding期限の対象外、legacy verb写像と互換境界、coverageの全path family、権威ある入力へのトレーサビリティが明記され、開発者は推測なしで実装でき、QAは受入基準から正常系・異常系・副作用なし・冪等性のテストを作成できる。

### Findings

- None
