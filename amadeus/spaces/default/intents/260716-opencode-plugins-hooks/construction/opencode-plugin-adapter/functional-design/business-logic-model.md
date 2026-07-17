# Business Logic Model — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../../../inception/units-generation/unit-of-work.md`(U1 範囲・検証列)、`../../../inception/units-generation/unit-of-work-story-map.md`(FR→U1 全数写像)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜5)、`../../../inception/application-design/components.md`(C1〜C5)、`../../../inception/application-design/component-methods.md`(公開 API 契約)、`../../../inception/application-design/services.md`(spawn 境界 advisory)。2026-07-17。

## ワークフロー1: 工程0(写像対応表の実測凍結 — C3)

処理列(実装着手前に完了、ADR-2):

1. `@opencode-ai/plugin` 一次ソース(packages/plugin/src/index.ts)を in-tree 再実測(AC-1c 確定条件)— フック名・payload フィールド構造・tool 語彙を verbatim 採取
2. Cursor 8 target(session-start / mint / runtime-compile / audit-and-sensors / log-subagent / validate-state / session-end / stop)× opencode フックの対応判定
3. 各行を3値へ分類: **配線**(一次ソース verbatim 根拠)/ **⚠**(確定条件明記)/ **未対応**(反証可能根拠)— 空欄・推測 ✅ 禁止(AC-1a/1b)
4. mint 行は ADR-5 の2条件((i) UserMessage の machine 注入マーカー判別可能性 (ii) AskUserQuestion 応答の chat.message 経由有無)を実測し、いずれか不成立なら**未対応(fail-closed)**へ確定
5. 表を凍結 — 以降の C2 実装は表の「配線」行のみを対象とする

## ワークフロー2: ランタイム写像(C2/C1)

イベント処理シーケンス(opencode プロセス内)。**「cursor-lib 同型」の適用範囲は reconstruct(純写像)のみ**であり、spawn 後のエラー処理は cursor から**意図的に強化**する(citation-semantics-check の明文照合): 引用元 cursor の `defaultSpawn` は `stderr: "ignore"`(amadeus-cursor-lib.ts:218)かつ spawn 結果の exit code を未参照(runAdapter :239-242)— すなわち個々の CoreCall の spawn 失敗・非0 exit を記録しない。本設計は AC-2c(失敗を握りつぶさず stderr へ記録)により **discard→record へ意図的相違**とする。これは要件由来の強化であり cursor からの無申告逸脱ではない:

```
opencode hook event(name, payload)
  → reconstruct(event, payload)                    …純関数 seam(in-process テスト可能)
      ├─ event 未配線        → { error }(advisory reject — stderr 記録して継続)
      ├─ payload 欠落フィールド → { error }(fail-closed)
      └─ 配線済み             → Reconstruction(CoreCall[] — core hook 名+stdin JSON)
  → 各 CoreCall を subprocess spawn(.opencode/hooks/*.ts、env: process.env 明示)
      ├─ spawn 失敗 / 非0 exit → stderr 記録して継続(advisory — opencode をブロックしない)
      └─ 成功                  → 完了(戻り値で opencode の動作を変更しない — cursor の forwardStdout 相当は明示 scope-out、domain-entities.md の Reconstruction 行の意図的相違・⚠ 参照)
```

## データ変換: 二段写像(tool.execute.after 系)

Architect 合成 C-4 の要件化どおり、tool 系イベントは二段写像を通す:

1. **語彙写像**: opencode tool 語彙 → core の tool_name(`toolNameFor` — 実測確定値のみの map、AC-2d。未登録は undefined = 配線しない)
2. **フィールド写像**: payload(input = { tool, sessionID, callID, args })→ core hook stdin JSON(args → file_path/command 等の抽出)。欠落フィールドは error(fail-closed)

## 決定木(判定順序)

1. event が写像表の「配線」行か? → No: advisory reject(終端)
2. payload に必須フィールドが揃っているか? → No: error(終端、stderr 記録)
3. tool 系なら toolNameFor が確定値を返すか? → No: 配線しない(終端、stderr 記録 — step 1 と同じ advisory reject 経路。無音の握りつぶしは R-8 違反)
4. CoreCall[] を構成し spawn — 各呼び出しの成否は個別に stderr 記録、常に継続

すべての終端で opencode の動作は不変(advisory 徹底 — AC-2c / ADR-3)。mint(HUMAN_TURN)の machine マーカー判定はランタイム分岐ではなく工程0 の設計判断で充足する(ADR-5・component-methods 注記 — 配線するか否か自体を表で確定)。
