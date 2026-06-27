#!/usr/bin/env ruby
# frozen_string_literal: true

require "fileutils"
require "json"
require "open3"
require "pathname"
require "tmpdir"

ROOT = Pathname.new(__dir__).join("../../..").expand_path

TARGET_SKILLS = {
  "amadeus-steering" => {
    skill_text: [
      ".amadeus/settings/templates",
      "templates/steering"
    ],
    files: {
      "templates/steering/README.md" => ["基本方針", "テンプレート一覧"],
      "templates/steering/steering.md" => ["役割", "対象成果物", "読む順序", "Intent Layer へ進む基準", "責務境界"],
      "templates/steering/knowledge.md" => ["背景", "前提", "未確認事項"],
      "templates/steering/policies.md" => ["方針", "禁止事項", "判断基準"],
      "templates/steering/objective.md" => ["一覧"],
      "templates/steering/actors.md" => ["一覧"],
      "templates/steering/external-systems.md" => ["一覧"],
      "templates/steering/glossary.md" => ["用語", "避ける語", "禁止ワード"],
      "templates/steering/domain/subdomains.md" => ["一覧"],
      "templates/steering/domain/bounded-contexts.md" => ["一覧", "外部境界", "コンテキスト間の依存", "パターン分類"],
      "templates/steering/intents.md" => ["一覧", "依存関係"]
    }
  },
  "amadeus-intent-init" => {
    skill_text: [
      ".amadeus/settings/templates",
      "templates/intents/initialized"
    ],
    files: {
      "templates/intents/initialized/intent.md" => ["目的", "成功条件", "範囲"],
      "templates/intents/initialized/state.json" => []
    }
  },
  "amadeus-intent-ideation" => {
    skill_text: [
      ".amadeus/settings/templates",
      "templates/intents/ideation"
    ],
    files: {
      "templates/intents/ideation/scope.md" => ["対象", "対象外", "詳細度", "検証深度", "Inception への引き継ぎ"],
      "templates/intents/ideation/ideation.md" => ["実現可能性", "体制", "初期モック", "未確定事項", "学習候補"],
      "templates/intents/ideation/traceability.md" => ["Ideation からの追跡", "依存関係からの追跡"],
      "templates/intents/ideation/decisions.md" => ["一覧", "依存関係"],
      "templates/intents/ideation/decisions/D001-complete-ideation.md" => ["背景", "判断", "理由", "影響"],
      "templates/intents/ideation/mocks/initial-confirmation.puml" => [],
      "templates/intents/ideation/state.json" => []
    }
  },
  "amadeus-intent-inception" => {
    skill_text: [
      ".amadeus/settings/templates",
      "templates/intents/inception"
    ],
    files: {
      "templates/intents/inception/requirements.md" => ["一覧", "依存関係", "受け入れ状態"],
      "templates/intents/inception/requirements/R001-requirement.md" => ["要求", "受け入れ条件", "根拠", "未確認事項"],
      "templates/intents/inception/acceptance.md" => ["要求状態", "状態ルール"],
      "templates/intents/inception/user-stories.md" => ["一覧", "依存関係"],
      "templates/intents/inception/user-stories/S001-story.md" => ["ストーリー", "受け入れ条件", "根拠", "未確認事項"],
      "templates/intents/inception/use-cases.md" => ["一覧", "依存関係"],
      "templates/intents/inception/use-cases/UC001-use-case.md" => ["システム境界", "事前条件", "基本フロー", "代替フロー", "事後条件", "BCE候補", "責務候補"],
      "templates/intents/inception/codebase-analysis.md" => ["対象コード", "既存能力", "統合点", "ギャップ", "リスク", "Inception への入力"],
      "templates/intents/inception/units.md" => ["一覧", "依存関係"],
      "templates/intents/inception/units/U001-unit.md" => ["ユニット", "対象要求", "価値境界", "検証観点", "未確認事項"],
      "templates/intents/inception/bolts.md" => ["一覧", "依存関係"],
      "templates/intents/inception/bolts/B001-bolt/bolt.md" => ["概要", "対象ユニット", "完了条件", "依存", "未確認事項"],
      "templates/intents/inception/bolts/B001-bolt/design.md" => ["概要", "責務境界", "構成", "データと契約", "検証方針", "Task への入力"],
      "templates/intents/inception/bolts/B001-bolt/tasks.md" => [],
      "templates/intents/inception/traceability.md" => [
        "要求からの追跡",
        "背景からの追跡",
        "ボルトからの追跡",
        "設計からの追跡",
        "既存コード分析からの追跡",
        "ユニットからの追跡",
        "ドメインモデルからの追跡",
        "依存関係からの追跡"
      ],
      "templates/intents/inception/decisions.md" => ["一覧", "依存関係"],
      "templates/intents/inception/decisions/D001-inception-boundary.md" => ["背景", "判断", "理由", "影響"],
      "templates/intents/inception/state.json" => []
    }
  }
}.freeze

def fail_with(message)
  warn message
  exit 1
end

def run!(*command)
  stdout, stderr, status = Open3.capture3(*command, chdir: ROOT.to_s)
  return stdout if status.success?

  fail_with(<<~MSG)
    command failed: #{command.join(" ")}
    stdout:
    #{stdout}
    stderr:
    #{stderr}
  MSG
end

def assert_file(path)
  return if path.file?

  fail_with("missing file: #{path.relative_path_from(ROOT)}")
end

def assert_text_includes(path, needle)
  text = path.read
  return if text.include?(needle)

  fail_with("#{path.relative_path_from(ROOT)} does not include #{needle.inspect}")
end

def assert_heading(path, heading)
  text = path.read
  return if text.match?(/^## #{Regexp.escape(heading)}$/)

  fail_with("#{path.relative_path_from(ROOT)} is missing heading: ## #{heading}")
end

def assert_json_template(path)
  JSON.parse(path.read)
rescue JSON::ParserError => e
  fail_with("#{path.relative_path_from(ROOT)} is not valid JSON: #{e.message}")
end

TARGET_SKILLS.each do |skill, contract|
  skill_md = ROOT.join("skills", skill, "SKILL.md")
  assert_file(skill_md)
  contract[:skill_text].each { |needle| assert_text_includes(skill_md, needle) }

  contract[:files].each do |relative, headings|
    source = ROOT.join("skills", skill, relative)
    promoted = ROOT.join(".agents/skills", skill, relative)
    assert_file(source)
    assert_file(promoted)
    headings.each { |heading| assert_heading(source, heading) }
    assert_json_template(source) if source.extname == ".json"
  end
end

Dir.mktmpdir("amadeus-template-promotion") do |tmp|
  agents_root = Pathname.new(tmp).join(".agents/skills")
  TARGET_SKILLS.each_key do |skill|
    run!("ruby", "dev-scripts/promote-skill.rb", skill, "--agents-root", agents_root.to_s)
    run!("diff", "-qr", "skills/#{skill}/templates", agents_root.join(skill, "templates").to_s)
  end
end

run!("ruby", ".agents/skills/amadeus-intent-validator/validator/IntentValidator.rb", ".")
Dir.glob(ROOT.join(".amadeus/intents/*/state.json")).sort.each do |state_path|
  intent = Pathname.new(state_path).dirname.basename.to_s
  run!("ruby", ".agents/skills/amadeus-intent-validator/validator/IntentValidator.rb", ".", intent)
end

puts "amadeus template eval: ok"
