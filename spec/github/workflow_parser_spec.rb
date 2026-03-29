# frozen_string_literal: true

require "spec_helper"
require "github/workflow_parser"

RSpec.describe GitHub::WorkflowParser do
  subject(:parser) { described_class.new(client:, repo_full_name: "testuser/repo1") }

  let(:client) { instance_double(Octokit::Client) }

  describe "#uses_actionlint?" do
    context "when .github/workflows/ does not exist" do
      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_raise(Octokit::NotFound)
      end

      it "returns false" do
        expect(parser.uses_actionlint?).to be false
      end
    end

    context "when workflow runs actionlint via run: step" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            lint:
              steps:
                - uses: actions/checkout@v4
                - run: actionlint
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns true" do
        expect(parser.uses_actionlint?).to be true
      end
    end

    context "when workflow uses actionlint via uses: action" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            lint:
              steps:
                - uses: actions/checkout@v4
                - uses: rhysd/action-actionlint@v1
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns true" do
        expect(parser.uses_actionlint?).to be true
      end
    end

    context "when workflow does not run actionlint" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - uses: actions/checkout@v4
                - run: bundle exec rspec
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns false" do
        expect(parser.uses_actionlint?).to be false
      end
    end

    context "when actionlint is run in one of multiple workflow files" do
      let(:ci_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - run: bundle exec rspec
        YAML
      end
      let(:lint_content) do
        <<~YAML
          jobs:
            lint:
              steps:
                - run: actionlint
        YAML
      end
      let(:entries) do
        [
          double(name: "ci.yml", path: ".github/workflows/ci.yml"),
          double(name: "lint.yml", path: ".github/workflows/lint.yml")
        ]
      end

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(double(content: Base64.encode64(ci_content)))
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/lint.yml")
          .and_return(double(content: Base64.encode64(lint_content)))
      end

      it "returns true" do
        expect(parser.uses_actionlint?).to be true
      end
    end
  end

  describe "#language_versions" do
    context "when .github/workflows/ does not exist" do
      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_raise(Octokit::NotFound)
      end

      it "returns an empty hash" do
        expect(parser.language_versions).to eq({})
      end
    end

    context "when .github/workflows/ directory is empty" do
      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return([])
      end

      it "returns an empty hash" do
        expect(parser.language_versions).to eq({})
      end
    end

    context "when directory contains no yml/yaml files" do
      let(:entries) { [double(name: "README.md", path: ".github/workflows/README.md")] }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
      end

      it "returns an empty hash" do
        expect(parser.language_versions).to eq({})
      end
    end

    context "when a workflow has a simple ruby-version" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: "3.2"
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns the ruby version" do
        expect(parser.language_versions).to eq({ "ruby" => ["3.2"] })
      end
    end

    context "when a workflow uses matrix build with 'ruby' key (not 'ruby-version')" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            build:
              strategy:
                matrix:
                  ruby: ['3.4.3']
              steps:
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: ${{ matrix.ruby }}
        YAML
      end
      let(:entries) { [double(name: "main.yml", path: ".github/workflows/main.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/main.yml")
          .and_return(file_entry)
      end

      it "returns the ruby version" do
        expect(parser.language_versions).to eq({ "ruby" => ["3.4.3"] })
      end
    end

    context "when a workflow uses matrix build for ruby-version" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            test:
              strategy:
                matrix:
                  ruby-version: ['3.1', '3.2', '3.3']
              steps:
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: ${{ matrix.ruby-version }}
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns all matrix versions" do
        expect(parser.language_versions).to eq({ "ruby" => ["3.1", "3.2", "3.3"] })
      end
    end

    context "when a workflow uses multiple languages" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - uses: actions/setup-node@v3
                  with:
                    node-version: "18"
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: "3.2"
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns versions for all languages" do
        expect(parser.language_versions).to eq({ "ruby" => ["3.2"], "node" => ["18"] })
      end
    end

    context "when multiple workflow files exist" do
      let(:ci_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: "3.2"
        YAML
      end
      let(:deploy_content) do
        <<~YAML
          jobs:
            deploy:
              steps:
                - uses: ruby/setup-ruby@v1
                  with:
                    ruby-version: "3.1"
                - uses: actions/setup-node@v3
                  with:
                    node-version: "20"
        YAML
      end
      let(:entries) do
        [
          double(name: "ci.yml", path: ".github/workflows/ci.yml"),
          double(name: "deploy.yml", path: ".github/workflows/deploy.yml")
        ]
      end

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(double(content: Base64.encode64(ci_content)))
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/deploy.yml")
          .and_return(double(content: Base64.encode64(deploy_content)))
      end

      it "aggregates versions across all files" do
        expect(parser.language_versions).to eq({ "ruby" => ["3.2", "3.1"], "node" => ["20"] })
      end

      it "deduplicates versions when same version appears in multiple files" do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/deploy.yml")
          .and_return(double(content: Base64.encode64(ci_content)))

        expect(parser.language_versions).to eq({ "ruby" => ["3.2"] })
      end
    end

    context "when a workflow has no language version settings" do
      let(:workflow_content) do
        <<~YAML
          jobs:
            test:
              steps:
                - uses: actions/checkout@v4
                - run: echo "hello"
        YAML
      end
      let(:entries) { [double(name: "ci.yml", path: ".github/workflows/ci.yml")] }
      let(:file_entry) { double(content: Base64.encode64(workflow_content)) }

      before do
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows")
          .and_return(entries)
        allow(client).to receive(:contents)
          .with("testuser/repo1", path: ".github/workflows/ci.yml")
          .and_return(file_entry)
      end

      it "returns an empty hash" do
        expect(parser.language_versions).to eq({})
      end
    end
  end
end
