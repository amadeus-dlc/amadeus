上流入力(engine consumes 全数): business-logic-model.md, business-rules.md, domain-entities.md, performance-design.md, security-design.md, unit-of-work.md, requirements.md

# Code Generation Summary — U3 移設選定台帳・層別カバレッジ整合計画

## 実行境界と現在状態

本成果物は、measurement ref `3917a283a953165866170d235d3dc25ad2fd3643` の U1 正式台帳から抽出した unit 非 small 163件について、signal evidence を versioned record に materialize する。application code、test、runner、classifier、metrics collector、CI、repository docs、package、`dist/`、実テスト移設、per-tier LCOV、強制 gate は変更しない。

`U3PlanningResult` は `open-review` である。承認済み `EvidencePayload` から163件を決定的に投影し、`classification-review` 68件と `retier-to-integration` 95件を得た。`reviewQueue` が非空のため `migrationQueue` は可視化のみで、actionableではない。

## U1入力anchor

| 項目 | 正式入力 |
| --- | --- |
| `LedgerBuildOutcome` | `complete` |
| observed ref | `3917a283a953165866170d235d3dc25ad2fd3643` |
| ledger rows / matrix sum | 442 / 442 |
| U1 compact ledger digest | `d2525dff03c4dbc2623332c867a71daf8fa217f061f6ac547c2fcfc966667142` |
| 抽出条件 | `tier === "unit" && measured !== "small"` |
| 抽出結果 | 163件（medium 162 / large 1） |

抽出条件は U1 正式 record の canonical 442-row JSONL に直接適用した。current HEAD の source や記憶値から候補集合を再構成していない。

## 候補抽出と観測値

| 観測 | 件数 |
| --- | ---: |
| candidates | 163 |
| SignalEvidence | 254 |
| `network` | 1 |
| `spawn` | 99 |
| `filesystem` | 153 |
| `timer` | 1 |

排他的 signal bucket は次のとおりであり、合計は163件である。

| signal bucket | 件数 |
| --- | ---: |
| `network` | 1 |
| `spawn` | 9 |
| `spawn + filesystem` | 90 |
| `filesystem` | 62 |
| `filesystem + timer` | 1 |

evidence disposition の集計は次のとおりである。この集計は承認前の観測値であり、final state や actionable queue を意味しない。

| disposition | 件数 |
| --- | ---: |
| `seam-removable` | 1 |
| `behavior-essential` | 247 |
| `lexical-false-positive` | 5 |
| `unknown` | 1 |

candidate は U1 file の code-unit 昇順、各 signals は `network → spawn → filesystem → timer` の順である。candidate集合と evidence集合、および ledger が emit した signal と `SignalEvidence` は全単射である。

## EvidencePayload契約とcanonical化

- top-level field 順は `schemaVersion → observedRef → candidates` とする。
- candidate field 順は `schemaVersion → observedRef → file → signals` とする。
- signal field 順は `signal → locator → fact → disposition`、locator field 順は `file → startLine → endLine` とする。
- canonical bytes は、下記 JSON block を parse し、上記 field 順・candidate順・signal順を保持した `JSON.stringify(payload)` で得る compact JSON とする。末尾 LF は含めない。
- Markdown の整形、fence、indent、末尾 LF は canonical bytes に含めない。下記 block は唯一の versioned `EvidencePayload` 定義点であり、分割した一時 JSONL や cache は正式 artifact ではない。

## Canonical EvidencePayload

```json
{
  "schemaVersion": 1,
  "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
  "candidates": [
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/complexity-gate.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/complexity-gate.test.ts",
            "startLine": 226,
            "endLine": 226
          },
          "fact": "spawnSyncで実CLIゲートを起動し、プロセス境界の結果を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/complexity-gate.test.ts",
            "startLine": 260,
            "endLine": 260
          },
          "fact": "解析対象のTypeScript fixtureを実ファイルとして書き込み、ゲートのファイル走査を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/coverage-project-gate.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/coverage-project-gate.test.ts",
            "startLine": 145,
            "endLine": 146
          },
          "fact": "実ゲートCLIをspawnSyncで起動し、終了状態と出力契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/coverage-project-gate.test.ts",
            "startLine": 158,
            "endLine": 159
          },
          "fact": "coverage totalsとbaselineを実ファイルへ書き、ゲートの入出力契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/gen-coverage-registry.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/gen-coverage-registry.test.ts",
            "startLine": 154,
            "endLine": 154
          },
          "fact": "coverage registry生成ツールを実プロセスとして起動している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/gen-coverage-registry.test.ts",
            "startLine": 148,
            "endLine": 149
          },
          "fact": "generatorが走査するtierディレクトリとtest fixtureを実ファイルとして構成している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-cli-wiring.test.ts",
      "signals": [
        {
          "signal": "network",
          "locator": {
            "file": "tests/unit/setup-cli-wiring.test.ts",
            "startLine": 179,
            "endLine": 179
          },
          "fact": "test題名中の文字列 fetch ( が検出源であり、実処理はfake CliPortsを使ってネットワークI/Oを行わない。",
          "disposition": "lexical-false-positive"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-fetcher.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-fetcher.test.ts",
            "startLine": 68,
            "endLine": 79
          },
          "fact": "archive展開後のharness rootとmarker fileの実在をディスク上で検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-fsops-resolve.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-fsops-resolve.test.ts",
            "startLine": 76,
            "endLine": 84
          },
          "fact": "実ファイルのinode置換と内容を確認し、atomic renameのファイルシステム契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-installation.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-installation.test.ts",
            "startLine": 70,
            "endLine": 79
          },
          "fact": "manifestとrequired fileの実配置を使ってinstallation検出結果を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-lazy-build.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-lazy-build.test.ts",
            "startLine": 19,
            "endLine": 25
          },
          "fact": "CLI生成物を削除した後の再生成と実在を検証し、lazy buildのディスク成果物契約を確認している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-manifest-io.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-manifest-io.test.ts",
            "startLine": 18,
            "endLine": 19
          },
          "fact": "manifest I/O用の実一時directoryを作成し、test完了後に削除している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-plan.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-plan.test.ts",
            "startLine": 39,
            "endLine": 43
          },
          "fact": "install planが列挙するsource treeを実ディレクトリと実ファイルで構成している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/setup-upgrade.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/setup-upgrade.test.ts",
            "startLine": 233,
            "endLine": 245
          },
          "fact": "legacy layoutを実ディレクトリへ配置し、Installation.detectのファイルシステム判定を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-active-space-includes.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-active-space-includes.test.ts",
            "startLine": 95,
            "endLine": 109
          },
          "fact": "harness rules fileを書き換え、変更後bytesとinclude行を実ファイルから検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-batch3-orchestrate-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-batch3-orchestrate-seam.test.ts",
            "startLine": 153,
            "endLine": 163
          },
          "fact": "read-only latchとturn counterを実ファイルとして配置し、engineの状態解決を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-batch3-orchestrate-spawn.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-batch3-orchestrate-spawn.test.ts",
            "startLine": 43,
            "endLine": 43
          },
          "fact": "orchestrate系CLIをspawnSyncで実行し、process boundaryの契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-delegate-answer-consume.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-delegate-answer-consume.test.ts",
            "startLine": 54,
            "endLine": 59
          },
          "fact": "複数intent recordとactive cursorを実ファイルで構成し、cross-record gate解決を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-docs-only-exemption-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-docs-only-exemption-seam.test.ts",
            "startLine": 72,
            "endLine": 84
          },
          "fact": "audit shardとcode-generation成果物を実ファイルへ配置し、docs-only exemption判定を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-graph-dispatch-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-graph-dispatch-seam.test.ts",
            "startLine": 24,
            "endLine": 24
          },
          "fact": "graph subcommandのCLIをspawnSyncで起動してprocess exitとstdout契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-jump-phase-events-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-jump-phase-events-seam.test.ts",
            "startLine": 33,
            "endLine": 43
          },
          "fact": "audit shard群とstate fileを実際に読み、jumpが永続化したeventとstateを検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-learnings-persist-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-learnings-persist-seam.test.ts",
            "startLine": 129,
            "endLine": 138
          },
          "fact": "project memory fileへのpersistと既存bytesの保持を実ファイルで検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-memory-seed.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-memory-seed.test.ts",
            "startLine": 75,
            "endLine": 80
          },
          "fact": "first birthの実CLIをspawnし、engine-only installのprocess境界を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-memory-seed.test.ts",
            "startLine": 98,
            "endLine": 116
          },
          "fact": "memory treeの不在からseed後の実在とbundleとのbyte一致までをディスク上で検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-package-unreferenced-source.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-package-unreferenced-source.test.ts",
            "startLine": 94,
            "endLine": 103
          },
          "fact": "未参照source probeを実ファイルとして追加し、package checkの検出と後片付けを検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-package-write-sweep.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-package-write-sweep.test.ts",
            "startLine": 68,
            "endLine": 81
          },
          "fact": "stale outputsを実際に作成し、write sweepが削除するファイル契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-phase-check-gate-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-phase-check-gate-seam.test.ts",
            "startLine": 274,
            "endLine": 290
          },
          "fact": "state fileを書き換えた前後のbytesを読み、phase-check gateの永続状態契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-phase-progress-rollup-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-phase-progress-rollup-seam.test.ts",
            "startLine": 44,
            "endLine": 52
          },
          "fact": "active intent cursorとseeded stateを実ファイルから解決し、phase progress投影を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-runner-prune-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-runner-prune-seam.test.ts",
            "startLine": 117,
            "endLine": 125
          },
          "fact": "orphan skill directoryを実際に作成し、runner writeがpruneするディスク契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-runtime-dispatch-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-runtime-dispatch-seam.test.ts",
            "startLine": 20,
            "endLine": 20
          },
          "fact": "runtime CLIをspawnSyncで起動し、非公開dispatchとprocess exitの契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-runtime-learnings-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-runtime-learnings-seam.test.ts",
            "startLine": 35,
            "endLine": 54
          },
          "fact": "state・audit fixtureを実ファイルへ配置し、生成されたruntime graphをディスクから検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-sensor-fire-glob-norm.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-sensor-fire-glob-norm.test.ts",
            "startLine": 96,
            "endLine": 108
          },
          "fact": "sensor tool・manifest・recordを実ファイルとしてseedし、glob正規化を通るfire経路を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-sensor-fire-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-sensor-fire-seam.test.ts",
            "startLine": 21,
            "endLine": 21
          },
          "fact": "node:child_processからの参照はtype-onlyで、テストは注入関数の戻り値を評価し実子プロセスを起動しない。",
          "disposition": "lexical-false-positive"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-sensor-fire-seam.test.ts",
            "startLine": 197,
            "endLine": 206
          },
          "fact": "sensor script・manifest・対象artifactを実ファイルとして構成し、fireのファイル境界を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-test-size-drift.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-test-size-drift.test.ts",
            "startLine": 54,
            "endLine": 69
          },
          "fact": "spawn語彙はclassifierへ渡すsource文字列を組み立てるためのfixtureであり、このテスト自身は子プロセスを起動しない。",
          "disposition": "lexical-false-positive"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-test-size-drift.test.ts",
            "startLine": 192,
            "endLine": 199
          },
          "fact": "実test corpusとallowlistを読み、size purity driftを全数検査している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t-tui-drive-socket-isolation.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t-tui-drive-socket-isolation.test.ts",
            "startLine": 46,
            "endLine": 46
          },
          "fact": "spawnSyncはsource conformance確認用の正規表現リテラルにだけ現れ、このテスト自身は子プロセスを起動しない。",
          "disposition": "lexical-false-positive"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t-tui-drive-socket-isolation.test.ts",
            "startLine": 27,
            "endLine": 27
          },
          "fact": "検査対象driverのsource bytesを実ファイルから読み、socket隔離規約を静的に検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t04-agent-frontmatter.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t04-agent-frontmatter.test.ts",
            "startLine": 103,
            "endLine": 103
          },
          "fact": "配布agent fileの実bytesを読み、frontmatter契約を全対象で検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t05.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t05.test.ts",
            "startLine": 105,
            "endLine": 105
          },
          "fact": "実stage fileを読み、frontmatter parserの入力としてstage契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t06-skill-frontmatter.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t06-skill-frontmatter.test.ts",
            "startLine": 64,
            "endLine": 64
          },
          "fact": "配布SKILL.mdの実bytesを読み、frontmatterと設定の整合を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t07-hook-audit-logger.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t07-hook-audit-logger.test.ts",
            "startLine": 159,
            "endLine": 166
          },
          "fact": "実PostToolUse hookをBun.spawnSyncで起動し、stdinとprocess境界を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t07-hook-audit-logger.test.ts",
            "startLine": 114,
            "endLine": 132
          },
          "fact": "clone-idとaudit shardを実ファイルで構成し、hookがappendした監査bytesを検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t08.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t08.test.ts",
            "startLine": 204,
            "endLine": 211
          },
          "fact": "実PreCompact hookをspawnSyncで起動し、process exitと出力を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t08.test.ts",
            "startLine": 171,
            "endLine": 188
          },
          "fact": "clone-idとaudit shardを実ファイルとしてseedし、hookの永続化結果を読み取っている。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t09.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t09.test.ts",
            "startLine": 180,
            "endLine": 187
          },
          "fact": "実SubagentStop hookをspawnSyncで起動し、stdinとprocess境界を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t09.test.ts",
            "startLine": 138,
            "endLine": 166
          },
          "fact": "clone-idと複数audit shardを実ファイルで構成し、hookの監査結果を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t10-hook-session-start.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t10-hook-session-start.test.ts",
            "startLine": 156,
            "endLine": 163
          },
          "fact": "実SessionStart hookをBun.spawnSyncで起動し、stdin・stdout・exitのprocess契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t10-hook-session-start.test.ts",
            "startLine": 239,
            "endLine": 263
          },
          "fact": "recovery breadcrumbとheartbeatの実在・削除をディスク上で検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t100-memory-template-lifecycle.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t100-memory-template-lifecycle.test.ts",
            "startLine": 264,
            "endLine": 270
          },
          "fact": "amadeus-state CLIをspawnSyncで実行し、advanceとapproveのprocess境界を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t100-memory-template-lifecycle.test.ts",
            "startLine": 231,
            "endLine": 239
          },
          "fact": "memory templateの実コピーを書き換えて再読し、heading lifecycleを検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t103.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t103.test.ts",
            "startLine": 137,
            "endLine": 145
          },
          "fact": "実doctor CLIをspawnSyncで起動し、process exitと診断出力を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t103.test.ts",
            "startLine": 106,
            "endLine": 118
          },
          "fact": "rules filesとproject directoryを実ディスクへ構成し、doctorのdrift検出入力としている。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t11.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t11.test.ts",
            "startLine": 91,
            "endLine": 100
          },
          "fact": "実statusline hookをspawnSyncで起動し、stdinとstdoutのprocess契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t11.test.ts",
            "startLine": 76,
            "endLine": 77
          },
          "fact": "statuslineが読むstate fileを実ディスクへseedし、表示との結合を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t110-mcp-server-grants.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t110-mcp-server-grants.test.ts",
            "startLine": 30,
            "endLine": 45
          },
          "fact": "配布agent filesと.mcp.jsonの実在状態をディスクから読み、MCP grant契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t111.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t111.test.ts",
            "startLine": 48,
            "endLine": 69
          },
          "fact": "実audit shardを作成・読取し、append-not-overwriteと監査block永続化を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t112-delegated-approval.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t112-delegated-approval.test.ts",
            "startLine": 315,
            "endLine": 321
          },
          "fact": "delegate-rejection writerの実CLIをspawnSyncで起動し、人間presence gateのprocess契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t112-delegated-approval.test.ts",
            "startLine": 340,
            "endLine": 352
          },
          "fact": "clone-id・HUMAN_TURN shard・active cursorを実ファイルで構成し、provenance解決を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t112-learnings-distribution-guard.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t112-learnings-distribution-guard.test.ts",
            "startLine": 172,
            "endLine": 189
          },
          "fact": "learnings persist CLIをspawnSyncで実行し、guardの終了状態と出力を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t112-learnings-distribution-guard.test.ts",
            "startLine": 228,
            "endLine": 231
          },
          "fact": "拒否時にsensor fileが書かれていないことを実ディスクで検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t114-orchestrate-next.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t114-orchestrate-next.test.ts",
            "startLine": 107,
            "endLine": 114
          },
          "fact": "実orchestrate next CLIをspawnSyncで起動し、argv dispatchとprocess結果を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t114-orchestrate-next.test.ts",
            "startLine": 274,
            "endLine": 281
          },
          "fact": "配布SKILL.mdの実bytesを読み、引数forwarding契約を静的に検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t115.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t115.test.ts",
            "startLine": 131,
            "endLine": 148
          },
          "fact": "orchestrateとstateの実CLIをspawnSyncで起動し、gate遷移のprocess契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t115.test.ts",
            "startLine": 158,
            "endLine": 164
          },
          "fact": "seeded state fileを実際にread・rewriteし、gate-held状態の遷移を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t116-directive-path-resolution.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t116-directive-path-resolution.test.ts",
            "startLine": 171,
            "endLine": 171
          },
          "fact": "実engine nextをspawnSyncで起動し、stdout directiveのpath解決を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t116-directive-path-resolution.test.ts",
            "startLine": 230,
            "endLine": 231
          },
          "fact": "解決対象artifactを実ファイルとして配置し、directiveが返すpath契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t117.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t117.test.ts",
            "startLine": 133,
            "endLine": 149
          },
          "fact": "複数utilityの実CLIをspawnSyncで起動し、scope precedenceのprocess契約を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t117.test.ts",
            "startLine": 311,
            "endLine": 311
          },
          "fact": "拒否経路がstate fileを生成しないことを実ディスク上で検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t118.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t118.test.ts",
            "startLine": 237,
            "endLine": 245
          },
          "fact": "実engine binaryをspawnSyncで起動し、scope routing directiveをprocess境界で検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t118.test.ts",
            "startLine": 224,
            "endLine": 236
          },
          "fact": "scope gridとstate fixtureを実ファイルから読み書きし、scope差替え経路を構成している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t123-skills-spec-conformance.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t123-skills-spec-conformance.test.ts",
            "startLine": 135,
            "endLine": 138
          },
          "fact": "実skills directoryを列挙し、各SKILL.mdの存在を配布surfaceに対して検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t124-scope-transpose.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t124-scope-transpose.test.ts",
            "startLine": 114,
            "endLine": 118
          },
          "fact": "graph compile CLIをspawnSyncで起動し、process exitとscope transpose出力を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t124-scope-transpose.test.ts",
            "startLine": 238,
            "endLine": 245
          },
          "fact": "graph fixtureを実ファイルへcopyし、生成されたgrid fileの実在とsizeを検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t125-scope-files.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t125-scope-files.test.ts",
            "startLine": 290,
            "endLine": 290
          },
          "fact": "detect-scopeの実CLIをspawnSyncで起動し、process境界のscope検出を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t125-scope-files.test.ts",
            "startLine": 132,
            "endLine": 146
          },
          "fact": "scope定義filesを実directoryから列挙・読取し、全定義のfrontmatter契約を検証している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t125.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t125.test.ts",
            "startLine": 157,
            "endLine": 162
          },
          "fact": "amadeus-stateの実CLIをspawnSyncで起動し、失敗時のprocess結果を検証している。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t125.test.ts",
            "startLine": 128,
            "endLine": 152
          },
          "fact": "stateとaudit shard pathを実directoryとして構成し、EISDIR永続化失敗を再現している。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t129-stage-runner-drift.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t129-stage-runner-drift.test.ts",
            "startLine": 178,
            "endLine": 178
          },
          "fact": "生成CLIを子プロセスで実行し、終了状態と標準出力を検査するため、プロセス境界が契約の一部である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t129-stage-runner-drift.test.ts",
            "startLine": 234,
            "endLine": 234
          },
          "fact": "runnerディレクトリを実際に削除してdrift検出と再生成を検証するため、実ファイルツリーが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t13-hook-input-robustness.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t13-hook-input-robustness.test.ts",
            "startLine": 195,
            "endLine": 196
          },
          "fact": "各hookを実プロセスとして起動し、stdin・終了状態・出力の堅牢性を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t13-hook-input-robustness.test.ts",
            "startLine": 217,
            "endLine": 218
          },
          "fact": "状態ファイルを実際に配置し、hookが読む状態と回復ファイルの効果を検証するため、ディスク状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t132-hooks-doc-count-sync.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t132-hooks-doc-count-sync.test.ts",
            "startLine": 55,
            "endLine": 56
          },
          "fact": "出荷済みhookファイル群をディレクトリから列挙し、設定・文書との件数同期を検査するため、実在ファイル集合が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t133-bolt-dag-compile.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t133-bolt-dag-compile.test.ts",
            "startLine": 173,
            "endLine": 174
          },
          "fact": "runtime compile CLIを子プロセスで実行し、終了状態とstderrを含む契約を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t133-bolt-dag-compile.test.ts",
            "startLine": 121,
            "endLine": 121
          },
          "fact": "状態fixtureを実際のrecordへ複製し、生成されたruntime graphをディスクから検証するため、ファイル効果が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t134-mechanism-honesty.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t134-mechanism-honesty.test.ts",
            "startLine": 95,
            "endLine": 96
          },
          "fact": "Claude gate helperを子プロセスで実行し、そのJSON出力をregistry由来期待値と比較するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t134-mechanism-honesty.test.ts",
            "startLine": 41,
            "endLine": 42
          },
          "fact": "coverage registryとrunner本体を実ファイルから読み、三つの表現の一致を検証するため、出荷物のバイトが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t14.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t14.test.ts",
            "startLine": 88,
            "endLine": 89
          },
          "fact": "各出荷stage文書を読み、純粋parserと文書構造契約を全数検証するため、実ファイル内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t140-sdk-drive-model-resolution.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t140-sdk-drive-model-resolution.test.ts",
            "startLine": 30,
            "endLine": 31
          },
          "fact": "一時projectへsettings.jsonを書いてmodel解決を検証しているが、設定読取をin-memory seamへ置換して同じ既定値探索契約を保てるかは本ファイルだけでは確定できない。",
          "disposition": "unknown"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t144-harness-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t144-harness-seam.test.ts",
            "startLine": 65,
            "endLine": 66
          },
          "fact": "別cwd・script path・引数でライブラリを評価する子プロセスを使い、実行時解決順序を検証するため、プロセス環境境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t144-harness-seam.test.ts",
            "startLine": 111,
            "endLine": 112
          },
          "fact": "sandboxへharnessデータとmarkerディレクトリを実配置し、cwd探索結果を検証するため、実ディレクトリ構造が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t146-core-hygiene.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t146-core-hygiene.test.ts",
            "startLine": 74,
            "endLine": 75
          },
          "fact": "core配下の実Markdownを再帰走査し、未置換harness pathを検出するdrift guardなので、出荷ファイル群が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t147-kiro-hook-adapter.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t147-kiro-hook-adapter.test.ts",
            "startLine": 154,
            "endLine": 155
          },
          "fact": "Kiro adapterを実プロセスとして起動し、stdin payloadからhook出力・終了状態への変換を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t147-kiro-hook-adapter.test.ts",
            "startLine": 99,
            "endLine": 100
          },
          "fact": "Kiro treeとworkflow stateをscratch projectへ複製し、audit・stateの実ファイル効果を確認するため、ディスク境界が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t149-codex-hook-adapter.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t149-codex-hook-adapter.test.ts",
            "startLine": 176,
            "endLine": 177
          },
          "fact": "Codex adapterを実プロセスとして起動し、stdin payload・終了状態・hook効果を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t149-codex-hook-adapter.test.ts",
            "startLine": 113,
            "endLine": 114
          },
          "fact": "Codex treeとworkflow recordをscratch projectへ複製し、audit・stateの実ファイル効果を検証するため、ディスク境界が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t15-knowledge-file-inventory.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t15-knowledge-file-inventory.test.ts",
            "startLine": 91,
            "endLine": 92
          },
          "fact": "出荷knowledge treeを再帰列挙し、必須ファイル・件数・非空性を検査するため、実ファイルinventoryが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t150-codex-packaging.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t150-codex-packaging.test.ts",
            "startLine": 42,
            "endLine": 43
          },
          "fact": "packaging scriptをcheckモードで実行し、終了状態によるdrift契約を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t150-codex-packaging.test.ts",
            "startLine": 65,
            "endLine": 66
          },
          "fact": "生成元と配布先のTypeScriptを実際に読み、バイト同一性を検査するため、出荷ファイル内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t151-onboarding-skeleton.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t151-onboarding-skeleton.test.ts",
            "startLine": 31,
            "endLine": 32
          },
          "fact": "共有onboarding templateの出荷バイトを読み、全harness renderの未置換markerを検査するため、実template内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t152-windows-portability.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t152-windows-portability.test.ts",
            "startLine": 42,
            "endLine": 42
          },
          "fact": "node-ptyという文字列はPowerShell内容の検査対象として現れるだけで、子プロセスAPIの呼出しではない。",
          "disposition": "lexical-false-positive"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t152-windows-portability.test.ts",
            "startLine": 15,
            "endLine": 16
          },
          "fact": "Windows実行資材を読み、runner・PowerShell・CloudFormationの出荷契約を検査するため、実ファイル内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t153-engine-directive-harness-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t153-engine-directive-harness-seam.test.ts",
            "startLine": 62,
            "endLine": 63
          },
          "fact": "coreのTypeScriptを実ファイルから読み、hardcoded harness pathを全数検出するguardなので、出荷source treeが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t154-codekb-promotion.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t154-codekb-promotion.test.ts",
            "startLine": 85,
            "endLine": 86
          },
          "fact": "出荷stage文書を読み、codekb pathの旧表記と新表記を全数検査するため、実文書内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t155-template-override.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t155-template-override.test.ts",
            "startLine": 123,
            "endLine": 124
          },
          "fact": "required-sections sensorを子プロセスで実行し、終了状態とJSON結果を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t155-template-override.test.ts",
            "startLine": 85,
            "endLine": 86
          },
          "fact": "template・output fixtureを実ファイルとして作り、sensorの解決と見出し検査を通すため、ファイル境界が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t156-memory-relocation.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t156-memory-relocation.test.ts",
            "startLine": 149,
            "endLine": 150
          },
          "fact": "各harnessの出荷memory treeを列挙し、移設後の単一sourceとnative includeを検査するため、実ディレクトリ構造が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t157-workspace-shell-seed.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t157-workspace-shell-seed.test.ts",
            "startLine": 87,
            "endLine": 88
          },
          "fact": "各harnessのseed済みmemory・cursor・gitignoreを実ファイルとして検査するため、配布treeの存在状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t158-memory-writer-reader-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t158-memory-writer-reader-seam.test.ts",
            "startLine": 134,
            "endLine": 135
          },
          "fact": "learnings persist CLIを子プロセスで実行し、writerの終了状態と実際の保存先を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t158-memory-writer-reader-seam.test.ts",
            "startLine": 213,
            "endLine": 214
          },
          "fact": "persist後のteam.mdをディスクから読み、readerとのround-tripを検証するため、永続化先の実ファイルが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t16-phase-rules-structure.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t16-phase-rules-structure.test.ts",
            "startLine": 133,
            "endLine": 134
          },
          "fact": "四つのphase rule実ファイルを読み、非空性とstage slug参照を検査するため、出荷文書内容が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t160-workspace-record-resolution.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t160-workspace-record-resolution.test.ts",
            "startLine": 57,
            "endLine": 58
          },
          "fact": "record resolverとflat-layout migrationを実ディレクトリ・状態ファイル上で検証するため、pathとファイル効果が契約に含まれる。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "timer",
          "locator": {
            "file": "tests/unit/t160-workspace-record-resolution.test.ts",
            "startLine": 86,
            "endLine": 86
          },
          "fact": "UUIDv7の異なるミリ秒での順序だけを作る待機であり、注入可能なclockを使えば意図を保ったまま実時間待機を除去できる。",
          "disposition": "seam-removable"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t161-per-intent-lock-reaper.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t161-per-intent-lock-reaper.test.ts",
            "startLine": 158,
            "endLine": 159
          },
          "fact": "lock owner stampを実ディレクトリへ書き、dead・stale・foreign ownerのreaper挙動を検証するため、ファイルロック状態が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t167-session-intent-helpers.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t167-session-intent-helpers.test.ts",
            "startLine": 49,
            "endLine": 50
          },
          "fact": "blank session idでsession記録ディレクトリが作られないことを実filesystem上で検証し、read/write helperの永続化契約を対象にしている。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t168-statusline-orientation.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t168-statusline-orientation.test.ts",
            "startLine": 62,
            "endLine": 63
          },
          "fact": "statusline hookをstdin付き子プロセスで起動し、その表示出力を検証するため、hookのプロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t168-statusline-orientation.test.ts",
            "startLine": 81,
            "endLine": 82
          },
          "fact": "active intentの状態ファイルを実際に書き、statuslineが解決するorientationを検証するため、record状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t169-session-resume-rebind.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t169-session-resume-rebind.test.ts",
            "startLine": 59,
            "endLine": 60
          },
          "fact": "session-start hookを子プロセスで発火し、resume時のadditionalContextを検証するため、hook境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t169-session-resume-rebind.test.ts",
            "startLine": 127,
            "endLine": 128
          },
          "fact": "flat record状態を実ファイルとして配置し、rebind offerの有無を検証するため、cursor・record状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t17.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t17.test.ts",
            "startLine": 92,
            "endLine": 93
          },
          "fact": "実state CLIを各subcommandで起動し、終了状態・stdout・stderrを検証するため、argv dispatchのプロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t17.test.ts",
            "startLine": 160,
            "endLine": 161
          },
          "fact": "CLIが更新するstateとauditを実ファイルから読み、遷移結果を検証するため、永続化効果が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t170-audit-logger-per-intent.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t170-audit-logger-per-intent.test.ts",
            "startLine": 48,
            "endLine": 49
          },
          "fact": "audit logger hookを子プロセスで発火し、tool payloadからaudit eventへの変換を検証するため、hook境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t170-audit-logger-per-intent.test.ts",
            "startLine": 102,
            "endLine": 103
          },
          "fact": "per-intent audit shardを実際に読み、記録・非記録・anti-recursionを検証するため、shardのファイル効果が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t174-docs-legacy-refs-gate.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t174-docs-legacy-refs-gate.test.ts",
            "startLine": 145,
            "endLine": 146
          },
          "fact": "docsとonboarding sourceを実ファイルから全数走査し、legacy reference allowlistを検査するため、出荷文書集合が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t177-workspace-journey-fixture.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t177-workspace-journey-fixture.test.ts",
            "startLine": 70,
            "endLine": 71
          },
          "fact": "workspace journey fixtureが二つのGit repositoryとharness shellを実際に作ることを存在確認するため、ディスク上のjourney構造が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t179-orchestrate-rollforward-guard.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t179-orchestrate-rollforward-guard.test.ts",
            "startLine": 64,
            "endLine": 65
          },
          "fact": "orchestrator next CLIを子プロセスで実行し、latchに応じたdirectiveを検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t179-orchestrate-rollforward-guard.test.ts",
            "startLine": 78,
            "endLine": 80
          },
          "fact": "turn counterとreadonly latchを実ファイルへ書き、同一turn guardを検証するため、永続化されたlatch状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t18.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t18.test.ts",
            "startLine": 253,
            "endLine": 254
          },
          "fact": "audit CLIの非export handlerとexit・stderr契約を検証するケースで実プロセスを起動するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t18.test.ts",
            "startLine": 105,
            "endLine": 106
          },
          "fact": "append結果のaudit bytesを実ファイルから読み、header・event・escapeを検証するため、書込結果が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t180-kiro-rollforward-seam.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t180-kiro-rollforward-seam.test.ts",
            "startLine": 49,
            "endLine": 50
          },
          "fact": "Kiro adapterを実プロセスとして起動し、userPromptSubmitとpreToolUseの終了状態を検証するため、hook境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t180-kiro-rollforward-seam.test.ts",
            "startLine": 79,
            "endLine": 83
          },
          "fact": "turn counterとlatchをディスクから読み、fresh/stale判定を検証するため、実ファイル状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t181-conductor-skill-parity.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t181-conductor-skill-parity.test.ts",
            "startLine": 82,
            "endLine": 83
          },
          "fact": "disk-derived全harnessのSKILL.mdを読み、retired commandと必須語彙のfreshnessを検査するため、出荷skill集合が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t182-codekb-placement.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t182-codekb-placement.test.ts",
            "startLine": 174,
            "endLine": 175
          },
          "fact": "codekb-path utilityを子プロセスで実行し、引数・状態からのpath出力と終了状態を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t182-codekb-placement.test.ts",
            "startLine": 310,
            "endLine": 313
          },
          "fact": "intent registryを実ファイルから更新し、repository選択によるcodekb pathを検証するため、registry状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t184-stage-graph-drift.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t184-stage-graph-drift.test.ts",
            "startLine": 88,
            "endLine": 89
          },
          "fact": "doctorとsession-startを実プロセスで起動し、stage graph driftの診断を検証するため、CLI・hook境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t184-stage-graph-drift.test.ts",
            "startLine": 146,
            "endLine": 148
          },
          "fact": "uncompiled stage fileを一時stage treeへ実配置し、diskとgraphの双方向差分を検証するため、ファイル集合が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t186-foreach-per-unit-iteration.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t186-foreach-per-unit-iteration.test.ts",
            "startLine": 222,
            "endLine": 223
          },
          "fact": "orchestrator next/report CLIを実プロセスで実行し、unit iteration directiveとgate抑制を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t186-foreach-per-unit-iteration.test.ts",
            "startLine": 205,
            "endLine": 208
          },
          "fact": "unitごとのproduces artifactを実recordへ作り、次の未完unit選択を検証するため、artifact存在状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t188-human-presence-gate.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t188-human-presence-gate.test.ts",
            "startLine": 66,
            "endLine": 67
          },
          "fact": "state/log CLIを実プロセスで起動し、human-presence guardの拒否・承認exitを検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t188-human-presence-gate.test.ts",
            "startLine": 97,
            "endLine": 98
          },
          "fact": "HUMAN_TURNを実audit shardへ追記し、gateごとの消費と再利用拒否を検証するため、append-only ledgerが契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t19.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t19.test.ts",
            "startLine": 148,
            "endLine": 149
          },
          "fact": "jump resolve/executeとstate getを実CLIとして起動し、終了状態・出力・遷移を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t19.test.ts",
            "startLine": 173,
            "endLine": 174
          },
          "fact": "jump実行後のstateを実ファイルから読み、stage遷移とaudit効果を検証するため、永続状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t190-validate-grid.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t190-validate-grid.test.ts",
            "startLine": 116,
            "endLine": 117
          },
          "fact": "validate-grid CLIを子プロセスで実行し、strict/lenientの終了状態とJSON結果を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t190-validate-grid.test.ts",
            "startLine": 102,
            "endLine": 105
          },
          "fact": "graphとproposalを実JSONファイルとして渡し、CLIのfile-input契約を検証するため、ファイル境界が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t191-composed-scope-write.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t191-composed-scope-write.test.ts",
            "startLine": 95,
            "endLine": 96
          },
          "fact": "intent-birthとscope inferenceを子プロセスで実行し、authored scopeのruntime解決を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t191-composed-scope-write.test.ts",
            "startLine": 72,
            "endLine": 85
          },
          "fact": "scope文書とscope-gridを実ファイルへ書き、再compileなしの発見とstate反映を検証するため、二ファイル契約が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t194-recompose.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t194-recompose.test.ts",
            "startLine": 52,
            "endLine": 53
          },
          "fact": "recompose utilityを実プロセスで実行し、suffix変更・router・auditを検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t194-recompose.test.ts",
            "startLine": 66,
            "endLine": 67
          },
          "fact": "active recordのstateとaudit shardを実ファイルから読み、recompose後のbyte・derived fieldを検証するため、永続状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t198-compose-surfaces.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t198-compose-surfaces.test.ts",
            "startLine": 56,
            "endLine": 57
          },
          "fact": "orchestratorとutilityを実CLIとして起動し、compose dispatchとflag解析を検証するため、プロセス境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t198-compose-surfaces.test.ts",
            "startLine": 220,
            "endLine": 231
          },
          "fact": "detect前後のproject directory listingを比較して副作用がないことを実filesystem上で検証するため、ディスク観測が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t199-grilling-distribution.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t199-grilling-distribution.test.ts",
            "startLine": 74,
            "endLine": 75
          },
          "fact": "全harness distのgrilling skillとprotocol文書を実ファイルから読み、配布・frontmatter・帰属を検査するため、出荷物が観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t20.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t20.test.ts",
            "startLine": 108,
            "endLine": 109
          },
          "fact": "workspace scannerを含むinit CLIを実プロセスで起動し、終了状態と生成stateを検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t20.test.ts",
            "startLine": 225,
            "endLine": 229
          },
          "fact": "言語・framework判定用のproject filesを実際に作り、scannerの分類とre-init効果を検証するため、workspace内容が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts",
            "startLine": 114,
            "endLine": 114
          },
          "fact": "runtime compile CLIを子プロセスで実行し、生成されたmemory_pathを検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts",
            "startLine": 97,
            "endLine": 98
          },
          "fact": "compile後のruntime-graph.jsonをactive recordから読み、intent segmentを検証するため、生成fileが観測対象である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t202-hook-project-dir-worktree-marker.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t202-hook-project-dir-worktree-marker.test.ts",
            "startLine": 73,
            "endLine": 74
          },
          "fact": "異なるcwd・hook pathでライブラリを子プロセス評価し、projectDir解決順を検証するため、実行時境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t202-hook-project-dir-worktree-marker.test.ts",
            "startLine": 61,
            "endLine": 63
          },
          "fact": "main checkoutとworktreeにmarker directoryを実配置し、worktree優先解決を検証するため、実path構造が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t202-sensor-type-check-tsc-launcher.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t202-sensor-type-check-tsc-launcher.test.ts",
            "startLine": 40,
            "endLine": 48
          },
          "fact": "local tsc executableをnode_modules配下へ実作成し、存在探索とfallbackを検証するため、filesystem探索が機能の本体である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t203-codekb-rescan.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t203-codekb-rescan.test.ts",
            "startLine": 213,
            "endLine": 214
          },
          "fact": "codekb-path CLIを子プロセスで実行し、intent別re-scan pathの出力を検証するため、CLI境界が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t203-mint-presence-classify.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t203-mint-presence-classify.test.ts",
            "startLine": 92,
            "endLine": 93
          },
          "fact": "mint-presence hookをstdin付き子プロセスで起動し、machine/human promptごとのHUMAN_TURN発行を検証するため、hook境界が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t205-audit-escape-seams.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t205-audit-escape-seams.test.ts",
            "startLine": 32,
            "endLine": 33
          },
          "fact": "disk-backed projectで実call-siteのaudit書込・raw読取を検証し、pure siblingではなく配線効果を対象にするため、ファイル境界が本質的である。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t206-source-work-intent-span.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t206-source-work-intent-span.test.ts",
            "startLine": 44,
            "endLine": 45
          },
          "fact": "実Git repositoryへgit commandを発行し、intent範囲のcommit・branch・remote ref検出を検証するため、process境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t206-source-work-intent-span.test.ts",
            "startLine": 62,
            "endLine": 64
          },
          "fact": "source・record artifactを実repositoryへ書き、source-work判定の正負を検証するため、working tree内容が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t207-swarm-guards.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t207-swarm-guards.test.ts",
            "startLine": 40,
            "endLine": 41
          },
          "fact": "保護対象worktreeで実Git commandを使い、tracked・untracked・tampered状態を作るため、Git process境界が本質的である。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t207-swarm-guards.test.ts",
            "startLine": 46,
            "endLine": 51
          },
          "fact": "保護fileを実worktreeへ作り、anti-tamper verdictとcheck未実行を検証するため、filesystem状態が契約に含まれる。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t207-worktree-base-freshness.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t207-worktree-base-freshness.test.ts",
            "startLine": 106,
            "endLine": 106
          },
          "fact": "worktree作成ツールを子プロセスで実行し、終了結果を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t207-worktree-base-freshness.test.ts",
            "startLine": 185,
            "endLine": 185
          },
          "fact": "作成されたworktreeの実在をファイルシステムで確認する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t208-hook-shard-guards.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t208-hook-shard-guards.test.ts",
            "startLine": 144,
            "endLine": 144
          },
          "fact": "各hookを子プロセスで実行し、shard guardの結果を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t208-hook-shard-guards.test.ts",
            "startLine": 120,
            "endLine": 120
          },
          "fact": "foreign audit shardを実ファイルとして作成し、guardの判定対象にする。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t208-presence-crossshard-tiebreak.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t208-presence-crossshard-tiebreak.test.ts",
            "startLine": 52,
            "endLine": 52
          },
          "fact": "複数audit shardを実ファイルとして配置し、同秒tie-breakを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t209-kiro-ide-dual-vocab.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t209-kiro-ide-dual-vocab.test.ts",
            "startLine": 183,
            "endLine": 183
          },
          "fact": "Kiro IDE adapterを子プロセスで実行し、hook連携を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t209-kiro-ide-dual-vocab.test.ts",
            "startLine": 247,
            "endLine": 247
          },
          "fact": "adapter実行後のstate fileを読み、stage更新を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t209-promote-self-dangling-symlink.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t209-promote-self-dangling-symlink.test.ts",
            "startLine": 100,
            "endLine": 100
          },
          "fact": "保存対象ファイルを実際に削除し、欠落時のpromote処理を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t209-stop-hook-state-verb-carveout.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t209-stop-hook-state-verb-carveout.test.ts",
            "startLine": 95,
            "endLine": 95
          },
          "fact": "dispatch実装のsource fileを読み、verb分類との同期を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t209-worktree-read-anchor.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t209-worktree-read-anchor.test.ts",
            "startLine": 163,
            "endLine": 163
          },
          "fact": "sibling worktreeから作成処理を子プロセス実行し、anchorを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t209-worktree-read-anchor.test.ts",
            "startLine": 193,
            "endLine": 193
          },
          "fact": "main checkout配下のworktree実在を確認する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t210-adapter-mint-classifier.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t210-adapter-mint-classifier.test.ts",
            "startLine": 177,
            "endLine": 177
          },
          "fact": "adapterを子プロセスで実行し、HUMAN_TURN mintを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t210-adapter-mint-classifier.test.ts",
            "startLine": 168,
            "endLine": 168
          },
          "fact": "生成されたaudit shard群を実ファイルから読み取る。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t210-doctor-worktree-anchor.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t210-doctor-worktree-anchor.test.ts",
            "startLine": 124,
            "endLine": 124
          },
          "fact": "doctor CLIを子プロセスで実行し、worktree anchor診断を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t210-doctor-worktree-anchor.test.ts",
            "startLine": 114,
            "endLine": 114
          },
          "fact": "main checkout側にorphan state fileを作成して診断対象にする。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t211-doctor-shell-3state.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t211-doctor-shell-3state.test.ts",
            "startLine": 86,
            "endLine": 86
          },
          "fact": "doctor CLIを子プロセスで実行し、3-state診断結果を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t211-doctor-shell-3state.test.ts",
            "startLine": 84,
            "endLine": 84
          },
          "fact": "harness存在・memory未作成のworkspaceを実directoryで構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t211-log-subagent-complete-gate.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t211-log-subagent-complete-gate.test.ts",
            "startLine": 90,
            "endLine": 90
          },
          "fact": "log-subagent hookを子プロセスで実行し、completion gateを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t211-log-subagent-complete-gate.test.ts",
            "startLine": 61,
            "endLine": 61
          },
          "fact": "workflow statusをstate fileへ書き、gate条件を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t211-swarm-batch-progress.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t211-swarm-batch-progress.test.ts",
            "startLine": 154,
            "endLine": 154
          },
          "fact": "code-generationの現在stageをstate fileへ書き、batch進行入力を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t211-workspace-scan-generalize.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t211-workspace-scan-generalize.test.ts",
            "startLine": 61,
            "endLine": 61
          },
          "fact": "non-standard source layoutに実ファイルを作成し、workspace scan結果を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t212-learnings-surface-selfheal-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t212-learnings-surface-selfheal-seam.test.ts",
            "startLine": 158,
            "endLine": 158
          },
          "fact": "runtime graphを不正JSONの実ファイルにし、self-healを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t213-orchestrate-parked-new-intent.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t213-orchestrate-parked-new-intent.test.ts",
            "startLine": 94,
            "endLine": 94
          },
          "fact": "park済みworkflowに対するnext CLIを子プロセス実行する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t214-engine-error-logged-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t214-engine-error-logged-seam.test.ts",
            "startLine": 119,
            "endLine": 119
          },
          "fact": "engine error後のaudit shardを読み、ERROR_LOGGEDを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t216-orchestrate-default-errlog.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t216-orchestrate-default-errlog.test.ts",
            "startLine": 119,
            "endLine": 119
          },
          "fact": "unknown subcommand後のaudit shardを読み、ERROR_LOGGEDを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t218-import-meta-main-guard.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t218-import-meta-main-guard.test.ts",
            "startLine": 89,
            "endLine": 89
          },
          "fact": "module importを別processで行い、CLIが発火しないことを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t218-import-meta-main-guard.test.ts",
            "startLine": 108,
            "endLine": 108
          },
          "fact": "validator入力documentを実ファイルへ書き、main関数を実行する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t219-audit-fork-reentrant-seam.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t219-audit-fork-reentrant-seam.test.ts",
            "startLine": 158,
            "endLine": 158
          },
          "fact": "fork先audit shardを読み、AUDIT_FORKED記録を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t221-doctor-phase-progress.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t221-doctor-phase-progress.test.ts",
            "startLine": 326,
            "endLine": 326
          },
          "fact": "doctor CLIを子プロセスで実行し、phase residue advisoryを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t221-doctor-phase-progress.test.ts",
            "startLine": 71,
            "endLine": 71
          },
          "fact": "複数intentのphase stateを実ファイルとして配置する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t26-delivery-agent-timeline-guardrail.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t26-delivery-agent-timeline-guardrail.test.ts",
            "startLine": 104,
            "endLine": 104
          },
          "fact": "3件のdelivery agent artifactを読み、timeline文言不在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t27.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t27.test.ts",
            "startLine": 142,
            "endLine": 142
          },
          "fact": "utility/state CLIを子プロセスで実行し、command contractを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t27.test.ts",
            "startLine": 333,
            "endLine": 333
          },
          "fact": "実行後のstate fileを読み、field更新を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t28-audit-event-sync.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t28-audit-event-sync.test.ts",
            "startLine": 102,
            "endLine": 107
          },
          "fact": "audit eventのcode定義とformat documentを実ファイルから読み、集合一致を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t29.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t29.test.ts",
            "startLine": 124,
            "endLine": 124
          },
          "fact": "statusline hookを子プロセスで実行し、state同期を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t29.test.ts",
            "startLine": 233,
            "endLine": 233
          },
          "fact": "hookが作成したheartbeat fileの実在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t30-hook-session-end.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t30-hook-session-end.test.ts",
            "startLine": 121,
            "endLine": 121
          },
          "fact": "SessionEnd hookを子プロセスで実行し、stdin処理を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t30-hook-session-end.test.ts",
            "startLine": 187,
            "endLine": 187
          },
          "fact": "active workflow時のsession-end heartbeat生成を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t31.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t31.test.ts",
            "startLine": 125,
            "endLine": 125
          },
          "fact": "amadeus-log CLIを子プロセスで実行し、audit eventを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t31.test.ts",
            "startLine": 362,
            "endLine": 363
          },
          "fact": "null-intent時のintents rootを列挙し、orphan artifact不在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t33.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t33.test.ts",
            "startLine": 99,
            "endLine": 99
          },
          "fact": "amadeus-bolt CLIを子プロセスで実行し、lifecycle eventを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t33.test.ts",
            "startLine": 253,
            "endLine": 253
          },
          "fact": "state未解決時にbare audit directoryが生成されないことを確認する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t34.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t34.test.ts",
            "startLine": 135,
            "endLine": 135
          },
          "fact": "各tool CLIの失敗commandを子プロセスで実行し、ERROR_LOGGEDを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t35.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t35.test.ts",
            "startLine": 137,
            "endLine": 137
          },
          "fact": "amadeus-state CLIを子プロセスで実行し、compaction acknowledgeを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t35.test.ts",
            "startLine": 167,
            "endLine": 167
          },
          "fact": "compaction audit rowを実audit shardへ追記し、pending条件を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t36.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t36.test.ts",
            "startLine": 165,
            "endLine": 165
          },
          "fact": "scope-change CLIを子プロセスで実行し、scope更新を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t36.test.ts",
            "startLine": 182,
            "endLine": 182
          },
          "fact": "state fileを読み、Scope field更新を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t37.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t37.test.ts",
            "startLine": 157,
            "endLine": 157
          },
          "fact": "doctor CLIを子プロセスで実行し、driftとgraph診断を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t37.test.ts",
            "startLine": 199,
            "endLine": 201
          },
          "fact": "audit fileへWORKFLOW_COMPLETEDを追記し、state driftを構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t38.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t38.test.ts",
            "startLine": 120,
            "endLine": 120
          },
          "fact": "status CLIを子プロセスで実行し、gate表示を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t38.test.ts",
            "startLine": 135,
            "endLine": 135
          },
          "fact": "state fileのstage markerを実際に置換し、表示条件を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t46-agent-no-numeric-stage-ids.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t46-agent-no-numeric-stage-ids.test.ts",
            "startLine": 151,
            "endLine": 151
          },
          "fact": "agent definition fileを読み、numeric stage ID不在とslug解決を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t60.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t60.test.ts",
            "startLine": 174,
            "endLine": 174
          },
          "fact": "scope関連tool CLIを子プロセスで実行し、derived scope contractを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t60.test.ts",
            "startLine": 231,
            "endLine": 231
          },
          "fact": "fixture scope definitionを実ファイルとして追加し、動的導出を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t61.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t61.test.ts",
            "startLine": 281,
            "endLine": 281
          },
          "fact": "doctor CLIを子プロセスで実行し、agent metadata validationを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t61.test.ts",
            "startLine": 212,
            "endLine": 212
          },
          "fact": "toolsとhooksのsource filesを読み、旧metadata literal不在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t63.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t63.test.ts",
            "startLine": 159,
            "endLine": 159
          },
          "fact": "graph CLIを子プロセスで実行し、artifact registry出力を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t67.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t67.test.ts",
            "startLine": 193,
            "endLine": 193
          },
          "fact": "scope CLIを子プロセスで実行し、tableと推論結果を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t67.test.ts",
            "startLine": 373,
            "endLine": 373
          },
          "fact": "driftしたSKILL documentを実ファイルへ書き、check失敗を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t68-version-changelog-sync.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t68-version-changelog-sync.test.ts",
            "startLine": 61,
            "endLine": 61
          },
          "fact": "version CLIを子プロセスで実行し、出力versionを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t68-version-changelog-sync.test.ts",
            "startLine": 42,
            "endLine": 42
          },
          "fact": "version source fileを読み、宣言値を抽出する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t69.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t69.test.ts",
            "startLine": 58,
            "endLine": 58
          },
          "fact": "repositoryのgitignoreを読み、anchored entryを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t70-worktree-kb-and-skill.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t70-worktree-kb-and-skill.test.ts",
            "startLine": 80,
            "endLine": 83
          },
          "fact": "knowledge、runbook、agent documentを実ファイルから読み、相互contractを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t72.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t72.test.ts",
            "startLine": 64,
            "endLine": 64
          },
          "fact": "worktree info CLIを子プロセスで実行し、slug検索結果を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t72.test.ts",
            "startLine": 59,
            "endLine": 59
          },
          "fact": "audit shardを実ファイルとして書き、worktree block入力を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t76.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t76.test.ts",
            "startLine": 479,
            "endLine": 479
          },
          "fact": "fork処理を複数子プロセスで並行実行し、lock競合を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t76.test.ts",
            "startLine": 425,
            "endLine": 427
          },
          "fact": "実lock directoryとowner fileを作成し、retry挙動を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t77-bolt-worktree-flags.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t77-bolt-worktree-flags.test.ts",
            "startLine": 113,
            "endLine": 113
          },
          "fact": "amadeus-bolt CLIを子プロセスで実行し、worktree flag contractを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t77-bolt-worktree-flags.test.ts",
            "startLine": 310,
            "endLine": 310
          },
          "fact": "fork後のworktree state file実在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t79.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t79.test.ts",
            "startLine": 125,
            "endLine": 125
          },
          "fact": "dispatch-event CLIを子プロセスで実行し、audit schemaを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t80.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t80.test.ts",
            "startLine": 175,
            "endLine": 175
          },
          "fact": "practices-event CLIを子プロセスで実行し、empty section処理を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t80.test.ts",
            "startLine": 154,
            "endLine": 154
          },
          "fact": "framework treeを実workspaceへ複製し、CLI境界を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t81.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t81.test.ts",
            "startLine": 115,
            "endLine": 115
          },
          "fact": "practices-event CLIを子プロセスで実行し、override eventを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t81.test.ts",
            "startLine": 254,
            "endLine": 254
          },
          "fact": "audit implementation sourceを読み、event countを固定検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t82-hold-merge-invariant.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t82-hold-merge-invariant.test.ts",
            "startLine": 91,
            "endLine": 91
          },
          "fact": "hold、release、complete CLIを子プロセスで実行し、merge holdを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t82-hold-merge-invariant.test.ts",
            "startLine": 170,
            "endLine": 170
          },
          "fact": "forked state fileを読み、Merge-Held field更新を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t83-doctor-orphan-worktree.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t83-doctor-orphan-worktree.test.ts",
            "startLine": 195,
            "endLine": 195
          },
          "fact": "doctor CLIを子プロセスで実行し、orphan reconciliationを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t83-doctor-orphan-worktree.test.ts",
            "startLine": 175,
            "endLine": 175
          },
          "fact": "orphan worktree record directoryを実filesystem上に作成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t84.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t84.test.ts",
            "startLine": 101,
            "endLine": 101
          },
          "fact": "doctor CLIを子プロセスで実行し、stale branch診断を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t84.test.ts",
            "startLine": 212,
            "endLine": 212
          },
          "fact": "live worktree directoryを実filesystem上に作成して診断する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t85.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t85.test.ts",
            "startLine": 118,
            "endLine": 118
          },
          "fact": "doctor CLIを子プロセスで実行し、practices stalenessを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t85.test.ts",
            "startLine": 150,
            "endLine": 155
          },
          "fact": "state fileのaffirmed timestampを読み書きし、各時刻条件を構成する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t86-sensor-manifest-schema.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t86-sensor-manifest-schema.test.ts",
            "startLine": 135,
            "endLine": 135
          },
          "fact": "sensor manifest実ファイルを読み、schema validatorへ渡す。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t87-stage-compartment-headers.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t87-stage-compartment-headers.test.ts",
            "startLine": 70,
            "endLine": 76
          },
          "fact": "stage directoriesを列挙し、各stage documentのtypeを確認する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t94-sensor-fire-hook.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t94-sensor-fire-hook.test.ts",
            "startLine": 234,
            "endLine": 234
          },
          "fact": "sensor-fire hookを子プロセスで実行し、guard分岐を検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t94-sensor-fire-hook.test.ts",
            "startLine": 308,
            "endLine": 308
          },
          "fact": "hookが作成したspawn logの実在を検証する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t96.test.ts",
      "signals": [
        {
          "signal": "spawn",
          "locator": {
            "file": "tests/unit/t96.test.ts",
            "startLine": 135,
            "endLine": 135
          },
          "fact": "fragment CLIを子プロセスで実行し、forkとmerge contractを検証する。",
          "disposition": "behavior-essential"
        },
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t96.test.ts",
            "startLine": 163,
            "endLine": 163
          },
          "fact": "forked fragmentとmain graphを実ファイルのbyte列で比較する。",
          "disposition": "behavior-essential"
        }
      ]
    },
    {
      "schemaVersion": 1,
      "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
      "file": "tests/unit/t97.test.ts",
      "signals": [
        {
          "signal": "filesystem",
          "locator": {
            "file": "tests/unit/t97.test.ts",
            "startLine": 461,
            "endLine": 461
          },
          "fact": "persist CLI入力のselection JSONを実ファイルへ書き、path引数contractを検証する。",
          "disposition": "behavior-essential"
        }
      ]
    }
  ]
}
```

## Evidence digestと最終検証

| 項目 | 結果 |
| --- | --- |
| payload validator verdict / errors | `PASS` / 0 |
| projection validator verdict / errors | `PASS` / 0 |
| ledger rows | 442 |
| candidates / signals | 163 / 254 |
| source cache と candidate の全単射 | `PASS`（54 / 54 / 55） |
| candidate / signal 全単射・順序 | `PASS` |
| schema / ref / logical path | `PASS` |
| locator file / range | `PASS` |
| canonical compact bytes | 90,887 bytes |
| canonical SHA-256 run 1 | `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` |
| canonical SHA-256 run 2 | `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` |
| run 1 / run 2 stdout・bytes・hash | byte-equivalent `true` |
| 表示用 pretty JSON | 129,117 bytes / SHA-256 `3dd585acfadd732c1139aa734e7f6786f89a6c8bcff5fcfa067135b71809fab1` |
| selection set compact | 23,318 bytes / SHA-256 `5202df553e7c238390c3e6bf03a54e8125996b0ef00cf4ca0a9c863915bc5a8c` |
| U3PlanningResult compact | 25,411 bytes / SHA-256 `e00edb045efe04611e27e836f9e4f5e094669831a3bec3ffac1e83415de8e5fa` |

`evidenceDigest` は `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` のまま維持されており、承認対象payloadのbyte列は変更していない。

## Payload承認とApprovalProof

| 項目 | 値 |
| --- | --- |
| state | `approved` |
| payload path | `amadeus/spaces/default/intents/260717-test-pyramid-rebuild/construction/U3-migration-coverage/code-generation/code-summary.md` |
| schemaVersion | 1 |
| observedRef | `3917a283a953165866170d235d3dc25ad2fd3643` |
| approvedAt | `2026-07-18T00:17:59Z` |
| auditRef.path | `amadeus/spaces/default/intents/260717-test-pyramid-rebuild/audit/j5ik2o-mac-studio-lan-2fec7b288e5f.md` |
| auditRef.eventTimestamp | `2026-07-18T00:17:59Z` |
| auditRef.eventOrdinal | `2739`（shard内の `Event` blockを0始まりで数えた絶対ordinal） |
| approvedDigest | `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` |

`auditRef` はdigestを保持する一意な `QUESTION_ANSWERED`（2026-07-18T00:17:59Z、ordinal 2739）を指す。同一shard直前の未消費 `HUMAN_TURN`（2026-07-18T00:17:34Z、ordinal 2738）と、`amadeus-log answer` のpresence guard通過をhuman provenanceとして検証した。ユーザーはQ3で推奨案Aを直接選択し、その回答は `HUMAN_TURN`（2026-07-18T00:30:23Z、ordinal 2752）と `QUESTION_ANSWERED`（2026-07-18T00:30:36Z、ordinal 2753）の一意な組である。

残余制約として、`HUMAN_TURN` 自体はdigest fieldを持たず、digestはguard済み後続eventだけが保持する。したがってproof resolverはこの2-event相関を必ず検証し、単独event proofとして扱わない。

## U3PlanningResult

| 項目 | 結果 |
| --- | --- |
| kind | `open-review` |
| actionable | `false` |
| reviewQueue | 68件 |
| migrationQueue | 95件（可視化のみ） |
| queue集合和 / 交差 | 163件 / 0件 |

`reviewQueue` が68件残るため `ready` ではない。`migrationQueue` の95件はrankを保持するが、review解消までは実移設の着手順として利用しない。

## PlanningObservation

| 観測 | 件数 |
| --- | ---: |
| ledger rows | 442 |
| unit non-small | 163 |
| classification review | 68 |
| migration | 95 |
| signal: network | 1 |
| signal: spawn | 99 |
| signal: filesystem | 153 |
| signal: timer | 1 |

| 排他的signal bucket | 件数 |
| --- | ---: |
| `network` | 1 |
| `spawn` | 9 |
| `spawn + filesystem` | 90 |
| `filesystem` | 62 |
| `filesystem + timer` | 1 |

## Final state集計

| finalState | 件数 |
| --- | ---: |
| `seam-to-small` | 0 |
| `retier-to-integration` | 95 |
| `retier-to-e2e` | 0 |
| `classification-review` | 68 |

`seam-removable` evidenceは1件あるが、同candidateに `behavior-essential filesystem` が共存するためcandidate全体は `seam-to-small` にならない。

## 163件の選定結果

| file | measured | signals | finalState | queue | rank |
| --- | --- | --- | --- | --- | ---: |
| `tests/unit/complexity-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/coverage-project-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/gen-coverage-registry.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/setup-cli-wiring.test.ts` | `large` | `network` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-fetcher.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-fsops-resolve.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-installation.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-lazy-build.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-manifest-io.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-plan.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/setup-upgrade.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-active-space-includes.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-batch3-orchestrate-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-batch3-orchestrate-spawn.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t-delegate-answer-consume.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-docs-only-exemption-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-graph-dispatch-seam.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t-jump-phase-events-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-learnings-persist-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-memory-seed.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t-package-unreferenced-source.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-package-write-sweep.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-phase-check-gate-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-phase-progress-rollup-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-runner-prune-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-runtime-dispatch-seam.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t-runtime-learnings-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-sensor-fire-glob-norm.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-sensor-fire-seam.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-test-size-drift.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t-tui-drive-socket-isolation.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t04-agent-frontmatter.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t05.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t06-skill-frontmatter.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t07-hook-audit-logger.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t08.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t09.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t10-hook-session-start.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t100-memory-template-lifecycle.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t103.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t11.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t110-mcp-server-grants.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t111.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t112-delegated-approval.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t112-learnings-distribution-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t114-orchestrate-next.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t115.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t116-directive-path-resolution.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t117.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t118.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t123-skills-spec-conformance.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t124-scope-transpose.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t125-scope-files.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t125.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t129-stage-runner-drift.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t13-hook-input-robustness.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t132-hooks-doc-count-sync.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t133-bolt-dag-compile.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t134-mechanism-honesty.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t14.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t140-sdk-drive-model-resolution.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t144-harness-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t146-core-hygiene.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t147-kiro-hook-adapter.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t149-codex-hook-adapter.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t15-knowledge-file-inventory.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t150-codex-packaging.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t151-onboarding-skeleton.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t152-windows-portability.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t153-engine-directive-harness-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t154-codekb-promotion.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t155-template-override.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t156-memory-relocation.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t157-workspace-shell-seed.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t158-memory-writer-reader-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t16-phase-rules-structure.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t160-workspace-record-resolution.test.ts` | `medium` | `filesystem` + `timer` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t167-session-intent-helpers.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t168-statusline-orientation.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t169-session-resume-rebind.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t17.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t170-audit-logger-per-intent.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t174-docs-legacy-refs-gate.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t177-workspace-journey-fixture.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t179-orchestrate-rollforward-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t18.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t180-kiro-rollforward-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t181-conductor-skill-parity.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t182-codekb-placement.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t184-stage-graph-drift.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t186-foreach-per-unit-iteration.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t188-human-presence-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t19.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t190-validate-grid.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t191-composed-scope-write.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t194-recompose.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t198-compose-surfaces.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t199-grilling-distribution.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t20.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t202-hook-project-dir-worktree-marker.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t203-codekb-rescan.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t203-mint-presence-classify.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t205-audit-escape-seams.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t206-source-work-intent-span.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t207-swarm-guards.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t207-worktree-base-freshness.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t208-hook-shard-guards.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t208-presence-crossshard-tiebreak.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t209-kiro-ide-dual-vocab.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t209-promote-self-dangling-symlink.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t209-stop-hook-state-verb-carveout.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t209-worktree-read-anchor.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t210-adapter-mint-classifier.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t210-doctor-worktree-anchor.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t211-doctor-shell-3state.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t211-log-subagent-complete-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t211-swarm-batch-progress.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t211-workspace-scan-generalize.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t212-learnings-surface-selfheal-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t213-orchestrate-parked-new-intent.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t214-engine-error-logged-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t216-orchestrate-default-errlog.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t218-import-meta-main-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t219-audit-fork-reentrant-seam.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t221-doctor-phase-progress.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t26-delivery-agent-timeline-guardrail.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t27.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t28-audit-event-sync.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t29.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t30-hook-session-end.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t31.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t33.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t34.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t35.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t36.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t37.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t38.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t46-agent-no-numeric-stage-ids.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t60.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t61.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t63.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t67.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t68-version-changelog-sync.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t69.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t70-worktree-kb-and-skill.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t72.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t76.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t77-bolt-worktree-flags.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t79.test.ts` | `medium` | `spawn` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t80.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t81.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t82-hold-merge-invariant.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t83-doctor-orphan-worktree.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t84.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t85.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t86-sensor-manifest-schema.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t87-stage-compartment-headers.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |
| `tests/unit/t94-sensor-fire-hook.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t96.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` | `migrationQueue` | `1` |
| `tests/unit/t97.test.ts` | `medium` | `filesystem` | `classification-review` | `reviewQueue` | N/A |

## reviewQueue（68件）

file昇順であり、rankは持たない。

| file | measured | signals | finalState |
| --- | --- | --- | --- |
| `tests/unit/setup-cli-wiring.test.ts` | `large` | `network` | `classification-review` |
| `tests/unit/setup-fetcher.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-fsops-resolve.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-installation.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-lazy-build.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-manifest-io.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-plan.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/setup-upgrade.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-active-space-includes.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-batch3-orchestrate-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-delegate-answer-consume.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-docs-only-exemption-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-jump-phase-events-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-learnings-persist-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-package-unreferenced-source.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-package-write-sweep.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-phase-check-gate-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-phase-progress-rollup-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-runner-prune-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-runtime-learnings-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-sensor-fire-glob-norm.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t-sensor-fire-seam.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` |
| `tests/unit/t-test-size-drift.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` |
| `tests/unit/t-tui-drive-socket-isolation.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` |
| `tests/unit/t04-agent-frontmatter.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t05.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t06-skill-frontmatter.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t110-mcp-server-grants.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t111.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t123-skills-spec-conformance.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t132-hooks-doc-count-sync.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t14.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t140-sdk-drive-model-resolution.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t146-core-hygiene.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t15-knowledge-file-inventory.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t151-onboarding-skeleton.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t152-windows-portability.test.ts` | `medium` | `spawn` + `filesystem` | `classification-review` |
| `tests/unit/t153-engine-directive-harness-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t154-codekb-promotion.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t156-memory-relocation.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t157-workspace-shell-seed.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t16-phase-rules-structure.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t160-workspace-record-resolution.test.ts` | `medium` | `filesystem` + `timer` | `classification-review` |
| `tests/unit/t161-per-intent-lock-reaper.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t167-session-intent-helpers.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t174-docs-legacy-refs-gate.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t177-workspace-journey-fixture.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t181-conductor-skill-parity.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t199-grilling-distribution.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t202-sensor-type-check-tsc-launcher.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t205-audit-escape-seams.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t208-presence-crossshard-tiebreak.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t209-promote-self-dangling-symlink.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t209-stop-hook-state-verb-carveout.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t211-swarm-batch-progress.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t211-workspace-scan-generalize.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t212-learnings-surface-selfheal-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t214-engine-error-logged-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t216-orchestrate-default-errlog.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t219-audit-fork-reentrant-seam.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t26-delivery-agent-timeline-guardrail.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t28-audit-event-sync.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t46-agent-no-numeric-stage-ids.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t69.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t70-worktree-kb-and-skill.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t86-sensor-manifest-schema.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t87-stage-compartment-headers.test.ts` | `medium` | `filesystem` | `classification-review` |
| `tests/unit/t97.test.ts` | `medium` | `filesystem` | `classification-review` |

## migrationQueue（95件、非actionable）

`(rank, file)` 昇順である。`open-review` のため現段階では可視化のみとする。

| rank | file | measured | signals | finalState |
| ---: | --- | --- | --- | --- |
| `1` | `tests/unit/complexity-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/coverage-project-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/gen-coverage-registry.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t-batch3-orchestrate-spawn.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t-graph-dispatch-seam.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t-memory-seed.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t-runtime-dispatch-seam.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t07-hook-audit-logger.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t08.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t09.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t10-hook-session-start.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t100-memory-template-lifecycle.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t103.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t11.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t112-delegated-approval.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t112-learnings-distribution-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t114-orchestrate-next.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t115.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t116-directive-path-resolution.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t117.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t118.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t124-scope-transpose.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t125-scope-files.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t125.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t129-stage-runner-drift.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t13-hook-input-robustness.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t133-bolt-dag-compile.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t134-mechanism-honesty.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t144-harness-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t147-kiro-hook-adapter.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t149-codex-hook-adapter.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t150-codex-packaging.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t155-template-override.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t158-memory-writer-reader-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t168-statusline-orientation.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t169-session-resume-rebind.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t17.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t170-audit-logger-per-intent.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t179-orchestrate-rollforward-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t18.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t180-kiro-rollforward-seam.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t182-codekb-placement.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t184-stage-graph-drift.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t186-foreach-per-unit-iteration.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t188-human-presence-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t19.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t190-validate-grid.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t191-composed-scope-write.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t194-recompose.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t198-compose-surfaces.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t20.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t202-hook-project-dir-worktree-marker.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t203-codekb-rescan.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t203-mint-presence-classify.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t206-source-work-intent-span.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t207-swarm-guards.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t207-worktree-base-freshness.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t208-hook-shard-guards.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t209-kiro-ide-dual-vocab.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t209-worktree-read-anchor.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t210-adapter-mint-classifier.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t210-doctor-worktree-anchor.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t211-doctor-shell-3state.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t211-log-subagent-complete-gate.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t213-orchestrate-parked-new-intent.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t218-import-meta-main-guard.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t221-doctor-phase-progress.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t27.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t29.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t30-hook-session-end.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t31.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t33.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t34.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t35.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t36.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t37.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t38.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t60.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t61.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t63.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t67.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t68-version-changelog-sync.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t72.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t76.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t77-bolt-worktree-flags.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t79.test.ts` | `medium` | `spawn` | `retier-to-integration` |
| `1` | `tests/unit/t80.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t81.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t82-hold-merge-invariant.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t83-doctor-orphan-worktree.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t84.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t85.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t94-sensor-fire-hook.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |
| `1` | `tests/unit/t96.test.ts` | `medium` | `spawn` + `filesystem` | `retier-to-integration` |

## Coverage integration plan

| 対象 | ledgerKeys | pathState | CI participation |
| --- | --- | --- | --- |
| combined | N/A | `existing("coverage/lcov.info")` | `executed` |
| `unit` | `unit_small`, `unit_medium`, `unit_large` | `pending`（per-tier path / follow-up Issue番号とも未決） | `executed` |
| `integration` | `integration_small`, `integration_medium` | `pending`（per-tier path / follow-up Issue番号とも未決） | `executed` |
| `e2e` | `e2e_small`, `e2e_medium`, `e2e_large` | `pending`（per-tier path / follow-up Issue番号とも未決） | `not-executed` |
| `smoke` | `smoke_medium` | `pending`（per-tier path / follow-up Issue番号とも未決） | `executed` |
| `harness` | N/A | `not-applicable`（outside standard runner） | `not-applicable` |
| `lib` | N/A | `not-applicable`（outside standard runner） | `not-applicable` |

combined観測は既存 `coverage/lcov.info` を再利用し、per-tier pathへ読み替えない。unit / integration / smokeは現CIで実行、e2eは非実行である。per-tier LCOV pathとfollow-up Issue番号は意図的に `PENDING` のまま保持し、本unitでは命名・起票しない。

## Canonical U3PlanningResult

以下のJSON blockは投影validatorが生成した正式 `U3PlanningResult` である。

```json
{
  "kind": "open-review",
  "evidenceRef": {
    "payloadPath": "amadeus/spaces/default/intents/260717-test-pyramid-rebuild/construction/U3-migration-coverage/code-generation/code-summary.md",
    "schemaVersion": 1,
    "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
    "evidenceDigest": "64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8",
    "approval": {
      "approvedAt": "2026-07-18T00:17:59Z",
      "auditRef": {
        "path": "amadeus/spaces/default/intents/260717-test-pyramid-rebuild/audit/j5ik2o-mac-studio-lan-2fec7b288e5f.md",
        "eventTimestamp": "2026-07-18T00:17:59Z",
        "eventOrdinal": 2739
      },
      "approvedDigest": "64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8"
    }
  },
  "observation": {
    "observedRef": "3917a283a953165866170d235d3dc25ad2fd3643",
    "totalRows": 442,
    "unitNonSmallCount": 163,
    "bucketCounts": [
      {
        "signals": [
          "network"
        ],
        "count": 1
      },
      {
        "signals": [
          "spawn"
        ],
        "count": 9
      },
      {
        "signals": [
          "spawn",
          "filesystem"
        ],
        "count": 90
      },
      {
        "signals": [
          "filesystem"
        ],
        "count": 62
      },
      {
        "signals": [
          "filesystem",
          "timer"
        ],
        "count": 1
      }
    ],
    "signalCounts": {
      "network": 1,
      "spawn": 99,
      "filesystem": 153,
      "timer": 1
    },
    "reviewCount": 68,
    "migrationCount": 95
  },
  "reviewQueue": [
    {
      "file": "tests/unit/setup-cli-wiring.test.ts",
      "measured": "large",
      "signals": [
        "network"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-fetcher.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-fsops-resolve.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-installation.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-lazy-build.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-manifest-io.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-plan.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/setup-upgrade.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-active-space-includes.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-batch3-orchestrate-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-delegate-answer-consume.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-docs-only-exemption-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-jump-phase-events-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-learnings-persist-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-package-unreferenced-source.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-package-write-sweep.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-phase-check-gate-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-phase-progress-rollup-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-runner-prune-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-runtime-learnings-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-sensor-fire-glob-norm.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-sensor-fire-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-test-size-drift.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t-tui-drive-socket-isolation.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t04-agent-frontmatter.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t05.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t06-skill-frontmatter.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t110-mcp-server-grants.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t111.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t123-skills-spec-conformance.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t132-hooks-doc-count-sync.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t14.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t140-sdk-drive-model-resolution.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t146-core-hygiene.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t15-knowledge-file-inventory.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t151-onboarding-skeleton.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t152-windows-portability.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t153-engine-directive-harness-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t154-codekb-promotion.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t156-memory-relocation.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t157-workspace-shell-seed.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t16-phase-rules-structure.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t160-workspace-record-resolution.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem",
        "timer"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t161-per-intent-lock-reaper.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t167-session-intent-helpers.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t174-docs-legacy-refs-gate.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t177-workspace-journey-fixture.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t181-conductor-skill-parity.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t199-grilling-distribution.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t202-sensor-type-check-tsc-launcher.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t205-audit-escape-seams.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t208-presence-crossshard-tiebreak.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t209-promote-self-dangling-symlink.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t209-stop-hook-state-verb-carveout.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t211-swarm-batch-progress.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t211-workspace-scan-generalize.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t212-learnings-surface-selfheal-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t214-engine-error-logged-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t216-orchestrate-default-errlog.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t219-audit-fork-reentrant-seam.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t26-delivery-agent-timeline-guardrail.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t28-audit-event-sync.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t46-agent-no-numeric-stage-ids.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t69.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t70-worktree-kb-and-skill.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t86-sensor-manifest-schema.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t87-stage-compartment-headers.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    },
    {
      "file": "tests/unit/t97.test.ts",
      "measured": "medium",
      "signals": [
        "filesystem"
      ],
      "finalState": "classification-review"
    }
  ],
  "migrationQueue": [
    {
      "file": "tests/unit/complexity-gate.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/coverage-project-gate.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/gen-coverage-registry.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t-batch3-orchestrate-spawn.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t-graph-dispatch-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t-memory-seed.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t-runtime-dispatch-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t07-hook-audit-logger.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t08.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t09.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t10-hook-session-start.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t100-memory-template-lifecycle.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t103.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t11.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t112-delegated-approval.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t112-learnings-distribution-guard.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t114-orchestrate-next.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t115.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t116-directive-path-resolution.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t117.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t118.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t124-scope-transpose.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t125-scope-files.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t125.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t129-stage-runner-drift.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t13-hook-input-robustness.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t133-bolt-dag-compile.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t134-mechanism-honesty.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t144-harness-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t147-kiro-hook-adapter.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t149-codex-hook-adapter.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t150-codex-packaging.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t155-template-override.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t158-memory-writer-reader-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t168-statusline-orientation.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t169-session-resume-rebind.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t17.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t170-audit-logger-per-intent.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t179-orchestrate-rollforward-guard.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t18.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t180-kiro-rollforward-seam.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t182-codekb-placement.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t184-stage-graph-drift.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t186-foreach-per-unit-iteration.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t188-human-presence-gate.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t19.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t190-validate-grid.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t191-composed-scope-write.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t194-recompose.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t198-compose-surfaces.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t20.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t201-runtime-graph-memory-path-record-dir.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t202-hook-project-dir-worktree-marker.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t203-codekb-rescan.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t203-mint-presence-classify.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t206-source-work-intent-span.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t207-swarm-guards.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t207-worktree-base-freshness.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t208-hook-shard-guards.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t209-kiro-ide-dual-vocab.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t209-worktree-read-anchor.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t210-adapter-mint-classifier.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t210-doctor-worktree-anchor.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t211-doctor-shell-3state.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t211-log-subagent-complete-gate.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t213-orchestrate-parked-new-intent.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t218-import-meta-main-guard.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t221-doctor-phase-progress.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t27.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t29.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t30-hook-session-end.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t31.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t33.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t34.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t35.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t36.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t37.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t38.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t60.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t61.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t63.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t67.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t68-version-changelog-sync.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t72.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t76.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t77-bolt-worktree-flags.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t79.test.ts",
      "measured": "medium",
      "signals": [
        "spawn"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t80.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t81.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t82-hold-merge-invariant.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t83-doctor-orphan-worktree.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t84.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t85.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t94-sensor-fire-hook.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    },
    {
      "file": "tests/unit/t96.test.ts",
      "measured": "medium",
      "signals": [
        "spawn",
        "filesystem"
      ],
      "finalState": "retier-to-integration",
      "rank": 1
    }
  ],
  "coveragePlan": {
    "combinedObservation": {
      "pathState": {
        "kind": "existing",
        "path": "coverage/lcov.info"
      },
      "ciParticipation": "executed"
    },
    "bindings": [
      {
        "tier": "unit",
        "ledgerKeys": [
          "unit_small",
          "unit_medium",
          "unit_large"
        ],
        "pathState": {
          "kind": "pending",
          "owner": "per-tier coverage follow-up (number pending)"
        },
        "ciParticipation": "executed"
      },
      {
        "tier": "integration",
        "ledgerKeys": [
          "integration_small",
          "integration_medium"
        ],
        "pathState": {
          "kind": "pending",
          "owner": "per-tier coverage follow-up (number pending)"
        },
        "ciParticipation": "executed"
      },
      {
        "tier": "e2e",
        "ledgerKeys": [
          "e2e_small",
          "e2e_medium",
          "e2e_large"
        ],
        "pathState": {
          "kind": "pending",
          "owner": "per-tier coverage follow-up (number pending)"
        },
        "ciParticipation": "not-executed"
      },
      {
        "tier": "smoke",
        "ledgerKeys": [
          "smoke_medium"
        ],
        "pathState": {
          "kind": "pending",
          "owner": "per-tier coverage follow-up (number pending)"
        },
        "ciParticipation": "executed"
      }
    ],
    "auxiliaryObservations": [
      {
        "tier": "harness",
        "pathState": {
          "kind": "not-applicable",
          "reason": "outside standard runner"
        },
        "ciParticipation": "not-applicable"
      },
      {
        "tier": "lib",
        "pathState": {
          "kind": "not-applicable",
          "reason": "outside standard runner"
        },
        "ciParticipation": "not-applicable"
      }
    ]
  }
}
```

## Cloneからの自己完結再現手順

### Versioned replay validator

以下のvalidator sourceは本成果物自身にversionedされ、repo外の既存scriptや生成JSONへ依存しない。U1 canonical JSONL、2つのcanonical JSON block、質問票、audit shard、package / runner / workflowをread-onlyに読み、payload digest、163件の全単射、2 queue、coverage binding、ApprovalProofの2-event相関を再計算する。

```typescript
// U3_REPLAY_VALIDATOR_V1_START
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repo = process.cwd();
const record = "amadeus/spaces/default/intents/260717-test-pyramid-rebuild";
const summaryPath = record + "/construction/U3-migration-coverage/code-generation/code-summary.md";
const questionsPath = record + "/construction/U3-migration-coverage/code-generation/code-generation-questions.md";
const u1Path = record + "/construction/U1-size-ledger/code-generation/code-summary.md";
const auditPath = record + "/audit/j5ik2o-mac-studio-lan-2fec7b288e5f.md";
const expectedRef = "3917a283a953165866170d235d3dc25ad2fd3643";
const expectedDigest = "64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8";
const summary = readFileSync(resolve(repo, summaryPath), "utf8");
const questions = readFileSync(resolve(repo, questionsPath), "utf8");
const u1 = readFileSync(resolve(repo, u1Path), "utf8");
const audit = readFileSync(resolve(repo, auditPath), "utf8");
const errors: string[] = [];
const fail = (code: string): void => { errors.push(code); };
const fence = String.fromCharCode(96).repeat(3);
const extractJson = (heading: string): any => {
  const at = summary.indexOf(heading + "\n\n");
  const open = summary.indexOf(fence + "json\n", at);
  const start = open + fence.length + 5;
  const end = summary.indexOf("\n" + fence, start);
  if (at < 0 || open < 0 || end < 0) throw new Error("missing-json:" + heading);
  return JSON.parse(summary.slice(start, end));
};
const payload = extractJson("## Canonical EvidencePayload");
const result = extractJson("## Canonical U3PlanningResult");
const sha256 = (value: string): string =>
  new Bun.CryptoHasher("sha256").update(value).digest("hex");
const evidenceDigest = sha256(JSON.stringify(payload));
if (payload.schemaVersion !== 1 || payload.observedRef !== expectedRef) fail("payload-header");
if (evidenceDigest !== expectedDigest) fail("payload-digest");

const u1Lines = u1.replaceAll("\r\n", "\n").split("\n");
const jsonlStarts = u1Lines.flatMap((line, index) => line.trim() === fence + "jsonl" ? [index] : []);
if (jsonlStarts.length !== 1) fail("u1-jsonl-count");
const rows: any[] = [];
for (let index = (jsonlStarts[0] ?? -1) + 1; index < u1Lines.length; index += 1) {
  if (u1Lines[index].trim() === fence) break;
  if (u1Lines[index].trim() !== "") rows.push(JSON.parse(u1Lines[index]));
}
const matrixBody = u1.match(/## tier×size matrix\n\n([\s\S]*?)\n\n## Consumer contract/u)?.[1] ?? "";
const matrix: Record<string, number> = {};
for (const line of matrixBody.split("\n")) {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*\|$/u);
  if (match !== null) matrix[match[1]] = Number(match[2]);
}
const expectedRows = rows.filter((row) => row.tier === "unit" && row.measured !== "small");
if (rows.length !== 442 || expectedRows.length !== 163) fail("ledger-counts");
if (payload.candidates.length !== expectedRows.length) fail("candidate-count");
for (let index = 0; index < expectedRows.length; index += 1) {
  const row = expectedRows[index];
  const candidate = payload.candidates[index];
  if (candidate?.file !== row.file) fail("candidate-file:" + index);
  if (JSON.stringify(candidate?.signals.map((item: any) => item.signal)) !== JSON.stringify(row.signals)) fail("candidate-signals:" + index);
}

const classify = (candidate: any): string => {
  if (candidate.signals.some((item: any) => item.disposition === "unknown" || item.disposition === "lexical-false-positive")) return "classification-review";
  if (candidate.signals.some((item: any) => item.signal === "network" && item.disposition === "behavior-essential")) return "retier-to-e2e";
  if (candidate.signals.some((item: any) => (item.signal === "spawn" || item.signal === "timer") && item.disposition === "behavior-essential")) return "retier-to-integration";
  if (candidate.signals.length > 0 && candidate.signals.every((item: any) => item.disposition === "seam-removable")) return "seam-to-small";
  return "classification-review";
};
const reviewQueue: any[] = [];
const migrationQueue: any[] = [];
for (let index = 0; index < payload.candidates.length; index += 1) {
  const candidate = payload.candidates[index];
  const row = expectedRows[index];
  const finalState = classify(candidate);
  const base = { file: candidate.file, measured: row.measured, signals: [...row.signals], finalState };
  if (finalState === "classification-review") reviewQueue.push(base);
  else migrationQueue.push({ ...base, rank: finalState === "seam-to-small" ? 0 : 1 });
}
reviewQueue.sort((left, right) => left.file.localeCompare(right.file));
migrationQueue.sort((left, right) => left.rank - right.rank || left.file.localeCompare(right.file));
if (JSON.stringify(result.reviewQueue) !== JSON.stringify(reviewQueue)) fail("review-queue");
if (JSON.stringify(result.migrationQueue) !== JSON.stringify(migrationQueue)) fail("migration-queue");
if (result.kind !== "open-review" || reviewQueue.length !== 68 || migrationQueue.length !== 95) fail("result-kind-counts");

const namedTiers = ["unit", "integration", "e2e", "smoke"];
const sizes = ["small", "medium", "large"];
const expectedBindings = namedTiers.map((tier) => ({
  tier,
  ledgerKeys: sizes.map((size) => tier + "_" + size).filter((key) => (matrix[key] ?? 0) > 0),
  pathState: { kind: "pending", owner: "per-tier coverage follow-up (number pending)" },
  ciParticipation: tier === "e2e" ? "not-executed" : "executed",
}));
if (JSON.stringify(result.coveragePlan.bindings) !== JSON.stringify(expectedBindings)) fail("coverage-bindings");
if (result.coveragePlan.combinedObservation?.pathState?.path !== "coverage/lcov.info") fail("combined-coverage");

const field = (block: string, name: string): string | undefined => {
  const prefix = "**" + name + "**:";
  return block.split("\n").find((line) => line.startsWith(prefix))?.slice(prefix.length).trim();
};
const blocks = audit.replaceAll("\r\n", "\n").split("\n---\n");
const exactAnswer = "Approved sha256:" + expectedDigest;
const answerOrdinals = blocks.flatMap((block, ordinal) =>
  field(block, "Event") === "QUESTION_ANSWERED" && field(block, "Details") === exactAnswer ? [ordinal] : [],
);
if (answerOrdinals.length !== 1) fail("approval-answer-count");
const answerOrdinal = answerOrdinals[0] ?? -1;
if (answerOrdinal !== result.evidenceRef.approval.auditRef.eventOrdinal) fail("approval-ordinal");
if (field(blocks[answerOrdinal - 1] ?? "", "Event") !== "HUMAN_TURN") fail("approval-human-provenance");
if (result.evidenceRef.approval.approvedDigest !== expectedDigest) fail("approval-digest");
if (!questions.includes("[Answer]: A — Guarded 2-event resolver")) fail("resolver-answer");

const packageJson = JSON.parse(readFileSync(resolve(repo, "package.json"), "utf8"));
const runner = readFileSync(resolve(repo, "tests/run-tests.ts"), "utf8");
const workflow = readFileSync(resolve(repo, ".github/workflows/ci.yml"), "utf8");
const ciBranch = runner.match(/case "--ci":([\s\S]*?)break;/u)?.[1] ?? "";
const coverageChecks = [
  packageJson.scripts?.["coverage:ci"] === "bun tests/run-tests.ts --ci --coverage --coverage-dir coverage",
  /out\.runSmoke = true;/u.test(ciBranch),
  /out\.runUnit = true;/u.test(ciBranch),
  /out\.runIntegration = true;/u.test(ciBranch),
  !/out\.runE2e = true;/u.test(ciBranch),
  /const combined = join\(coverageRoot, "lcov\.info"\);/u.test(runner),
  /run: bun run coverage:ci/u.test(workflow),
  /path:[\s\S]*?coverage\/lcov\.info/u.test(workflow),
];
if (coverageChecks.some((passed) => !passed)) fail("coverage-contract");

console.log(JSON.stringify({
  verdict: errors.length === 0 ? "PASS" : "FAIL",
  observedRef: payload.observedRef,
  evidenceDigest,
  ledgerRows: rows.length,
  candidates: payload.candidates.length,
  reviewQueue: reviewQueue.length,
  migrationQueue: migrationQueue.length,
  coverageChecks: coverageChecks.filter(Boolean).length + "/" + coverageChecks.length,
  errors,
}));
if (errors.length > 0) process.exitCode = 1;
// U3_REPLAY_VALIDATOR_V1_END
```

clone rootで次を実行すると、上のsourceだけを一時ファイルへ抽出して検証できる。

```bash
amadeus_u3_validator_tmp="$(mktemp "${TMPDIR:-/tmp}/amadeus-u3-validator.XXXXXX.ts")"
awk '/^\/\/ U3_REPLAY_VALIDATOR_V1_START$/{capture=1} capture{print} /^\/\/ U3_REPLAY_VALIDATOR_V1_END$/{capture=0}' \
  amadeus/spaces/default/intents/260717-test-pyramid-rebuild/construction/U3-migration-coverage/code-generation/code-summary.md \
  > "${amadeus_u3_validator_tmp}"
bun "${amadeus_u3_validator_tmp}"
```

期待するstdoutは `verdict=PASS`、`ledgerRows=442`、`candidates=163`、`reviewQueue=68`、`migrationQueue=95`、`coverageChecks=8/8`、`errors=[]`、digest `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` である。

### Exact measurement refのtargeted test再構成

rootの依存関係が導入済みであることを確認し、tracked bytesを `git archive` でexact refから展開する。current worktreeのsourceをコピーしない。

```bash
test -d node_modules
amadeus_u3_ref_tmp="$(mktemp -d "${TMPDIR:-/tmp}/amadeus-u3-ref.XXXXXX")"
mkdir "${amadeus_u3_ref_tmp}/tree"
git archive 3917a283a953165866170d235d3dc25ad2fd3643 | tar -x -C "${amadeus_u3_ref_tmp}/tree"
ln -s "${PWD}/node_modules" "${amadeus_u3_ref_tmp}/tree/node_modules"
(
  cd "${amadeus_u3_ref_tmp}/tree"
  bun test \
    tests/unit/t-test-size-drift.test.ts \
    tests/unit/t221-metrics-snapshot-core.test.ts \
    tests/unit/t221-metrics-snapshot-collectors.test.ts \
    tests/unit/t221-metrics-snapshot-cli.test.ts \
    tests/integration/t221-metrics-snapshot.integration.test.ts
)
```

期待する結果はexit 0、5 files、39 pass、0 fail、66 expect callsである。展開先はrepo外であり、versioned treeを変更しない。
## 再現・検証証跡

- versioned replay validator: 本成果物の `U3_REPLAY_VALIDATOR_V1` を上記手順で抽出・実行 → exit 0、`PASS`、errors 0。
- 上記 `git archive` で再構成したexact measurement ref export上のtargeted tests: `bun test tests/unit/t-test-size-drift.test.ts tests/unit/t221-metrics-snapshot-core.test.ts tests/unit/t221-metrics-snapshot-collectors.test.ts tests/unit/t221-metrics-snapshot-cli.test.ts tests/integration/t221-metrics-snapshot.integration.test.ts` → exit 0、5 files、39 pass、0 fail、66 expect calls。
- coverage経路 read-only contract check: 8 / 8 `PASS`。`coverage:ci`、smoke / unit / integration実行、e2e除外、combined `coverage/lcov.info`、workflow実行・uploadを照合した。
- §13 learning surface: reviewer READY後に再実行し、memory entries 0、candidates 0、parked 0。永続化対象なし。
- `answer-evidence` sensor: 手動fire ID `b9c86633`、audit verdict `SENSOR_PASSED`（2026-07-18T00:35:26Z）。
- architecture reviewer: iteration 1は再現手順とStep表記の2点で `NOT-READY`。payload外を是正し、iteration 2はfindings 0で `READY`。

## Files created / modified

| file | 状態 | 用途 |
| --- | --- | --- |
| `construction/U3-migration-coverage/code-generation/code-generation-plan.md` | modified | Step 1〜9の完了状態を記録 |
| `construction/U3-migration-coverage/code-generation/code-generation-questions.md` | modified | 計画、payload、2-event resolverの直接回答を記録 |
| `construction/U3-migration-coverage/code-generation/code-summary.md` | created | canonical payload、proof、全163選定、2 queue、coverage計画を一意に保持 |

application code、test、config、runner、classifier、CI、repository docs、package、`dist/` の本作業由来変更は0件である。

## Key implementation decisions

- U1正式台帳の exact measurement refを維持し、current HEADへ暗黙更新しない。
- `EvidencePayload` のbyte列と承認digestを維持し、承認後の投影だけを追加する。
- 承認済みGuarded 2-event resolverにより、digest eventと直前human provenanceを対で検証する。
- unknown / lexical false positiveを含むcandidate、およびfilesystem-only等の自動移設規則に該当しないcandidateはfail-closedで `classification-review` とする。
- reviewが残るため結果を `open-review` とし、migrationQueueをactionableにしない。
- per-tier LCOV path、follow-up Issue番号、実移設、CI配線はPENDING / Outのまま維持する。

## Test coverage summary

本作業はversioned recordの生成だけでexecutable behaviorを追加しないため、新規unit / integration / e2e test fileとtest configurationはN/Aである。代わりに、全163候補・254 evidence・2 queue・coverage bindingを本成果物内のversioned replay validatorで全数検査し、exact refの既存関連test 5 files / 39 testsを通した。combined coverageの既存CI経路はread-only contract check 8 / 8で確認した。

## Deviations from plan

成果物境界の逸脱はない。ただし承認auditの実形式では `HUMAN_TURN` にdigest fieldがなく、後続 `QUESTION_ANSWERED` がdigestを持つことが判明した。ユーザーがQ3で推奨案Aを直接承認したため、schemaやhookを変更せずGuarded 2-event resolverを採用した。単独event proofではないという残余制約を明示した。

evidence収集・投影・検証はrepo外の一時領域で行ったが、正式成果物は計画どおり本ファイル内の単一 `EvidencePayload` と `U3PlanningResult` であり、別JSON、永続script、adapter、extension pointは追加していない。

## Scope / diff guard

- 本作業の直接変更は上記U3 record 3ファイルとauditの自動追記に限定した。
- 作業開始前から存在したcore / tests / distのdirty差分は保持し、本成果物へ混入させていない。
- application code、test、runner、classifier、CI、dist、repository docs、state、memoryへの本作業由来変更は0件である。
- checkpoint `dccb5c35f26724514630af79ff785599fc124616` はintent record配下42ファイルだけを含み、既存origin branchを強制上書きせず専用checkpoint refへ公開済みである。
- final sensor `SENSOR_PASSED`、architecture reviewer `READY`、scope guard成立を確認したため、engineへ戻る条件を満たした。

## Review

- iteration: 1 / 2
- reviewer: architecture reviewer (`amadeus-architecture-reviewer-agent`)
- 検証観点: stage必須4節、ApprovalProofのGuarded 2-event resolver、163件の全数投影と独立2 queue、`open-review` / actionable=false、coverage 2軸、PENDING / Out境界、再現・検証証跡、scope境界、内部整合
- 確認済み: 必須4節は存在する。承認済みEvidencePayloadのcompact SHA-256は `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` のままである。163候補は `reviewQueue` 68件と非actionableな `migrationQueue` 95件へ重複なく全数投影され、和集合163件・交差0件である。coverageのledgerKeys / CI participation、PENDING / Out、scope境界にも相互矛盾はない。
- finding（Major、`再現・検証証跡`）: payload / projection validatorの唯一の実行コマンドが `/tmp/amadeus-u3-evidence.R1b8zi/project-approved-payload.ts` を参照しており、versioned recordから再実行できない。exact measurement ref exportの再構成手順も記録されていない。承認済みEvidencePayloadを変更せず、永続scriptを追加しない境界も維持したまま、clone後に実行できるread-onlyの再計算手順（または同等の自己完結したコマンド）と期待値を本節以前へ記録すること。
- finding（Minor、`Files created / modified`）: 承認記録は `code-generation-plan.md` のStep 1〜9実行を示す一方、本節はStep 1〜8の実行・検証状態と記載し、`Deviations from plan` は成果物境界の逸脱なしとしている。実際のstep数に統一するか、未実行・統合したstepと理由を明記すること。
- payload変更要求: なし。修正対象はEvidencePayload外の説明・証跡のみ。
- verdict: `NOT-READY`

## Review — Iteration 2

- iteration: 2 / 2
- reviewer: architecture reviewer (`amadeus-architecture-reviewer-agent`)
- 検証観点: stage必須4節、ApprovalProofのGuarded 2-event resolver、163件の全数投影と独立2 queue、`open-review` / actionable=false、coverage 2軸、PENDING / Out境界、再現・検証証跡、scope境界、内部整合
- iteration 1是正確認: `U3_REPLAY_VALIDATOR_V1` のsource・抽出コマンド・期待値が本成果物内にversionedされ、既存の一時scriptへの依存は解消された。`git archive` によるexact measurement refの再構成手順とtargeted test期待値も記録された。承認計画のStep 1〜9に対して、Step 1〜8完了、Step 9のsensor PASS・reviewer進行中という状態が明記され、以前のStep数矛盾は解消された。本iterationのREADYによりreviewer確認は完了する。
- 独立整合確認: 必須4節は存在する。承認済みEvidencePayloadからcompact SHA-256 `64f4861371f2922ef9359c83785d5c5fcde9011cd29290ef177e8a8e875d4ac8` を再計算し、不変を確認した。163候補は `reviewQueue` 68件と非actionableな `migrationQueue` 95件へ重複なく全数投影され、和集合163件・交差0件である。`open-review`、ledgerKeys / CI participation、combined / per-tier / auxiliaryのpath state、PENDING / Out、scope境界は相互整合する。
- ApprovalProof確認: digestを保持する一意な `QUESTION_ANSWERED` と同一shard直前の未消費 `HUMAN_TURN` を対で扱うresolver、presence guard、単独event proofとして扱わない残余制約が説明され、質問票の承認内容と整合する。
- 再現・検証証跡確認: versioned validatorの記録結果は `PASS`（442 / 163 / 68 / 95、coverage 8 / 8、errors 0）、exact-ref archive上のtargeted testsは39 / 39 PASSとして記録され、cloneから再実行できる自己完結手順を備える。
- findings: なし。
- payload変更要求: なし。
- verdict: `READY`
