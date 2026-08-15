# Business Rules — unit presence-detection(U2 / C3 / FR-2)

## R-1: 単一公開読取口

`resolveSessionInteractivity(projectDir)` が対話性判定の唯一の公開関数であり、Stop hook(U4)・裁定順序の分岐(U3/U4)・`--status`/statusline(U7)はすべてこの関数を呼ぶ。いずれの消費者も独自に監査シャードを再読取・再判定してはならない。
- **トレース**: component-methods.md C3「消費者: Stop hook / FR-4 分岐 / --status。全員この関数のみ」、FR-8(UI 真実性)。
- **落ちる実証**: 現状 `resolveSessionInteractivity` は存在しない(関数不在)。U2 実装前は「この関数を呼ぶテスト」自体がコンパイル/実行できず Red。実装後、Stop hook 側のテスト(U4 所有)が同一モジュールから同一関数を import していることを静的に確認する。

## R-2: セッションはこのクローンの監査シャードに限定する

`interactive === true` となるのは、`auditShardName(projectDir)` が指すこのクローン専用のシャードファイルに `HUMAN_TURN` イベントが 1 件以上存在するときに限る。他クローン・他セッションのシャードや merged buffer(`scanPresenceLedger` 相当の全シャード合流)は対象にしない。
- **トレース**: RFC「対話 = 本セッションに実 HUMAN_TURN が1件以上ある」、既存実装踏襲(`amadeus-state.ts:4593-4599` の `auditShardDir`+`auditShardName` パターン)。
- **落ちる実証**: 対話セッション fixture(自セッションのシャードに `HUMAN_TURN` 1件)と非対話セッション fixture(自セッションのシャードが空、または他クローンのシャードにのみ `HUMAN_TURN` がある)を用意し、後者で `interactive: false` になることを pin(他クローンの在席を借用しないことの反証込み)。

## R-3: 判定不能は非対話へ fail-closed、例外は投げない

シャード不在・record 未解決・読取エラー・破損データはすべて `interactive: false` を返す。この関数はどの入力に対しても例外を送出しない。
- **トレース**: component-methods.md C3「判定不能は `{ interactive: false }`(fail-closed)」、RFC 裁定順序「非対話 fail-closed」。
- **落ちる実証**: `auditShardDir` が `null` を返す fixture(record 未解決)、シャードファイルが存在しない fixture、破損 JSON 行を含むシャード fixture の 3 系統で、いずれも例外を投げず `{ interactive: false, ... }` を返すことを pin。

## R-4: 過大評価不能(false positive の構造的排除)

`HUMAN_TURN` が実在しないのに `interactive: true` を返す経路は存在しない。読取失敗・部分読取はすべて「存在しない」側(件数過小評価)にのみ効く。
- **トレース**: business-logic-model.md エラーパス表。この不変条件は「非対話なのに聞かれ続ける」というより悪い方向の誤判定(在席していないのに質問で待たされる)を型で防ぐ。
- **落ちる実証**: 破損 JSON 行の直前に正当な `HUMAN_TURN` 行を混在させた fixture で、破損行の存在が `interactive` の値を変えない(既存の `findAllEvents`/`splitAuditRecords` の無音除外契約を壊さない)ことを pin。

## R-5: 棄却済み代替の不実装

鮮度ウィンドウ(直近 N 分での再判定)、TTY/harness 種別判定、対話/非対話の明示設定フラグのいずれも実装に持ち込まない。
- **トレース**: RFC Rationale「Q3 初案(鮮度ウィンドウ)棄却」「Q3-B(TTY)棄却」「Q3-C(明示フラグ)棄却」、requirements.md FR-2 AC「棄却済み代替…を実装しないこと(文書検査)」。
- **落ちる実証**: 文書検査(コード検査)— `resolveSessionInteractivity` の実装/シグネチャに時刻幅パラメータ、TTY 判定、config フラグ読取が存在しないことをレビューで確認する(実行テストでは表現できない不在の検査のため、コードレビュー観点として明記)。

## R-6: 呼び出し時点で再評価する(キャッシュしない)

同一プロセス内で複数回呼ばれても、呼び出しごとに監査シャードを再読取りする。前回呼び出し時点の結果をプロセス内でキャッシュして返してはならない。
- **トレース**: RFC「判定単位はセッション」であり、同一セッション内で新たに `HUMAN_TURN` が追記される(例: 対話ターンが到着する)度に判定が更新されるべきという意味論の帰結。キャッシュすると「セッション開始時は非対話だったが今は対話」という正当な遷移を見逃す。
- **落ちる実証**: 1 回目の呼び出し(シャードが空 → `interactive: false`)の後、fixture に `HUMAN_TURN` を追記してから 2 回目を呼び出し、`interactive: true` に反転することを pin(プロセス内キャッシュがあれば false のまま固定されて Red になる設計)。

## R-7: 読取専用 — 監査状態を変更しない

`resolveSessionInteractivity` はいかなる監査イベントも発行せず、状態ファイルも書き換えない。`mintHumanPresence` の呼び出しも行わない。
- **トレース**: Q1(functional-design-questions.md)、C3 の「境界: 導出ロジックは持たない」に準ずる読取専用境界。
- **落ちる実証**: `resolveSessionInteractivity` 呼び出し前後で監査シャードのバイト内容が不変であることをテストで確認する(呼び出しが副作用を持たないことの直接証明)。
