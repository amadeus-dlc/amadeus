# Business Logic Model — u001-engine-installer（260705-engine-installer）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[component-methods.md](../../../inception/application-design/component-methods.md)、[decisions.md](../../../inception/application-design/decisions.md)、[interaction-spec.md](../../../inception/refined-mockups/interaction-spec.md)、[bolt-plan.md](../../../inception/delivery-planning/bolt-plan.md)

## マニフェストの具体形（O-1 の確定）

`scripts/amadeus-install.ts` 冒頭の単一定数として宣言する（FR-1.10）。

```text
MANIFEST = {
  engineDirs: ["agents","amadeus-common","hooks","knowledge","scopes","sensors","tools"],  // .agents/amadeus/ 配下
  skillsGlobPrefix: "amadeus",            // .claude/skills/ と .agents/skills/ の対象接頭辞
  claudeSymlinks: engineDirs と同一 7 名, // .claude/<name> → ../.agents/amadeus/<name>
  amadeusMd: {
    removeSections: ["Development Rules"],            // H2 節単位の除去
    removeBlocks: [                                   // 宣言的ブロック除去（行頭一致で開始し、次の空行の手前まで）
      "- Skill sources:",                 // Paths の開発用 2 行（23〜24 行目。ブロックは空行までなので Promoted 行も含む）
      "ステージ skill（`skills/amadeus-", // Skills 節の適応コピー段落（47〜51 行目。stage-catalog 参照と parity 行を含む）
      "「実際に動く実行結果の検証」は、", // Validation 節の sandbox e2e 段落（88〜89 行目。npm run test:it 参照）
      "Skill 昇格の確認は、",             // Validation 節の promote 段落（91〜93 行目）
    ],
    devReferencePatterns: [               // 負方向検査（FR-2.6）。正規表現
      "(?<!\.agents/)skills/amadeus",    // source skill 参照だけに一致（利用者が叩く .agents/skills/... は除外）。実装は new RegExp(文字列) で構築する（/ を含むため正規表現リテラルは使わない）
      "dev-scripts/", "parity:check", "promote-skill", "test:it:",
    ],
  },
  hooksWiring: [11 entry],                // feasibility 実測の amadeus-*.ts 配線（kanban ローカル 3 個は含めない = AD-4）
}
```

除去は「H2 節単位」と「宣言的ブロック（行頭一致 + 次の空行の手前まで）」の 2 層とし、除去後に生じる連続空行は 1 つに圧縮する（生成文書の体裁）。理由: 実測で dev 参照が Skills / Validation / Project Context の利用者向け節の内部に散在しており、H2 節単位だけでは負方向検査（dev 参照不在）を満たせないため。両層とも宣言的（マニフェストに列挙）であり、正方向検査（宣言対象が原本に実在）の対象になる（Q2 = A の 3 点セットを 2 層に精緻化）。

**利用者に必要な dev 類似参照の保全**: Validation 節の validator 実行コマンド（79・85 行目の `.agents/skills/amadeus-validator/...`）は利用者向け検証手順の本体であり除去しない。負方向検査のパターンを負の後読み `(?<!\.agents/)` 付きにすることで、source skill 参照（`skills/amadeus*`）だけを検出し、昇格先（利用者が実際に叩くパス）を巻き込まない。除去後の残存テキストに対する全パターンの照合結果ゼロは、実 AMADEUS.md（27e2dcca 時点）で机上検証済みであり、eval（FR-2.6）が恒久検証する。

## スモークの実行方法（O-2 の確定）

配置完了後、インストール先で次を実行する。

```sh
bun <target>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <target>
```

- doctor はエンジン実在資産（hooks、settings 配線、ディレクトリ構造）を検査する既存実装であり、追加実装は不要（D6 のスモーク層）。
- **project dir の解決は `--project-dir <target>` の明示指定で行う**（amadeus-lib.ts の resolveProjectDir は明示フラグを最優先する）。スクリプトパス由来の導出は `.agents/` がドット始まり harness 名の規約に合わず機能せず、cwd probe への暗黙依存はインストーラ実行元（本リポジトリ）を誤検査する偽陽性を生むため、明示指定を検証可能な契約とする。subprocess の cwd も `<target>` に設定する（二重の安全）。eval は「実行元 cwd に .claude がある状態で、壊れた target に対し smoke が fail する」ことを検証する（偽陽性の回帰防止。requirements FR-2.12 として追補、B002 に割り当て）。
- **スモーク fail 時は exit 1 とする**（refined-mockups の未確定を本ステージで確定）。配置自体は完了しているため、メッセージは「installed but smoke check failed」+ doctor 出力 + fix 案内（doctor を手動再実行 / 出力の指示に従う）とする。冪等再実行で収束する失敗（部分配置）とは区別して表示する。

## settings.json マージのアルゴリズム（AD-6 の確定）

1. `JSON.parse` 失敗 → エラー中断（ファイル無変更、FR-1.6）。
2. `hooks` キー不在 → `{ hooks: {} }` 相当から開始。
3. manifest の hooksWiring 各 entry（event、matcher、command）について: 対象 event 配列内の全ブロックを走査し、matcher+command の組が既存にあれば何もしない（複数ブロック構造は正規化しない = AD-6）。なければ、同一 matcher のブロックのうち「manifest 管理のコマンド（hooksWiring のいずれか）を既に含む最初のブロック」へ追記する（amadeus 管理ブロックの識別。利用者や他ツールのブロックへ紛れ込ませない）。該当ブロックがなければ新ブロックを event 配列末尾へ追加。
4. 既存要素の順序・非対象キーはすべて値として保持（deep-equal。再シリアライズによりインデント等のバイト表現は変わり得る）。書き込みは JSON.stringify（2 space）で行い、書き込み後に再読込して JSON 妥当性と非対象キーの deep-equal を検証（FR-2.7 の実行時版）。バイト単位の不変保証は settings.json には適用せず、非対象 skills ファイル（FR-2.11）にだけ適用する。

## Bolt との対応

- B001（walking skeleton）: マニフェスト、cli、5 工程の正常系（関数 6 個: copyEngine と placeAmadeusMd は工程 [1/5] に内包、copySkills = [2/5]、relinkClaude = [3/5]、mergeSettings = [4/5]、smoke = [5/5]）、eval 骨格（FR-2.1〜2.5、FR-2.8）。
- B002（hardening）: 事前チェック 3 パターン、非破壊エラー中断、AMADEUS.md 双方向検査、FR-2.6〜2.7、FR-2.9〜2.13（FR-2.12 = スモーク偽陽性の回帰防止 eval、FR-2.13 = aidlc/ 不可侵の動的検証）、FR-4.1、README。
