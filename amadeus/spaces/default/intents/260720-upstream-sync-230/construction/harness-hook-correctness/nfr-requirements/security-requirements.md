# Security Requirements — harness-hook-correctness

> 根拠: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。host payload、workspace path、環境変数、生成settingsをtrust boundary上の入力として扱う。認証・認可機構や規制対象data storeを新設するUnitではない。

## Trust boundaryと入力検証

| ID | 脅威 | 必須control | 合格条件 |
|---|---|---|---|
| SEC-U07-01 | malformed payload / spoofed success | `parseKiroIdeHookContext(payload: unknown)`で型と既知eventを検証し、`toolSuccess === false`とunknown wordingを成功へ分類しない。 | negative fixtureからartifact eventが0件で、visible hook-dropだけが残る。 |
| SEC-U07-02 | path injection / path guessing | pathは承認済みtool result文型からだけ抽出し、workspace-relative値をproject root基準で正規化する。未知文型から推測しない。 | traversal、unknown wording、欠落path fixtureがmutationを発生させない。 |
| SEC-U07-03 | shell/path injection | `renderClaudeHookCommand`は承認済み11 hook command内の`$CLAUDE_PROJECT_DIR`をdouble quoteし、statuslineとpermission globを変更しない。 | 空白pathで11件すべて正しいscriptへ解決し、未引用0件、対象外bytes差分0。 |
| SEC-U07-04 | runtime substitution | child runtimeはPATH上のbare nameでなく`process.execPath`を使う。 | PATH上にBun 0件でも正規runtimeが起動し、偽`bun`へ到達しない。 |
| SEC-U07-05 | identity confusion | delegated resultは実identity markerがある場合だけ`SubagentStop`へ分類する。 | identity欠落・malformed fixtureからidentity付きeventが0件。 |

host固有payload型、tool名、result文型はC6 adapter内に閉じ、core public APIへ持ち込まない。公開seamはFunctional Design正準の3関数だけであり、追加の権限面や汎用command execution面を作らない。

## Data protectionと供給網

- credential、secret、provider生responseを新規保存・送信しない。debugは明示opt-inだけで、通常stdoutを汚染せず、debug失敗はadvisory hookを失敗させない。
- auditには既存contractが要求するevent、path、identity、結果snippetだけを渡し、新しいpayload dumpや保持期間を定義しない。
- 新runtime dependency、network access、database、cloud infrastructureを追加しない。Bun/TypeScriptと既存standard library・manifest generatorだけを使う。
- upstream sourceは設計根拠として検査し、同期処理中に未検証codeとして実行しない。正本は`packages/framework/`で、`dist/`手編集を禁止する。

## Failure・監査要件

- audit-and-sensorsはaudit firstとし、audit失敗をsensor成功で隠さず、sensor失敗をartifact成功の証拠へ読み替えない。
- failed tool、unknown wording、malformed/empty payloadは既決分類に従う。payload依存eventはadvisory no-opまたはvisible drop、payload-free runtime/state eventはaudit-tail/forward-only self-gateへ進める。
- debug-off、空白なしworkspace、新signal不在の既定経路はbaselineとbyte-identicalに保つ。
- source、6 harness projection、11 hook command、statusline/permission不変の検査結果を自動test evidenceとして残す。新しいaudit event typeは追加しない。

## Complianceと検証

`requirements.md`のC-7により本intent固有の規制要件はない。したがってGDPR、HIPAA、PCI等への未根拠な適合表明は行わず、既存repository audit、license、human approval境界を維持する。SEC-U07-01〜05はpositive/negative fixture、projection drift check、typecheck、lint、dist/self-install checkで検証する。

## トレーサビリティ

SEC-U07-01〜05は`business-rules.md`のBR-U07-01、05〜13、`business-logic-model.md`のFailure decisions、`requirements.md`のFR-4、NFR-2、NFR-3、NFR-8、C-1〜4、`technology-stack.md`のdependency境界に対応する。
