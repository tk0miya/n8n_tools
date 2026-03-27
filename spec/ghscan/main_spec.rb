# frozen_string_literal: true

require "spec_helper"
require "ghscan/main"

RSpec.describe Ghscan::Main do
  subject(:main) { described_class.new }

  let(:client) { instance_double(Octokit::Client) }

  before do
    allow(Octokit::Client).to receive(:new).and_return(client)
  end

  describe "#run" do
    context "when GITHUB_TOKEN is not set" do
      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return(nil)
      end

      it "exits with status 1" do
        expect { main.run }.to raise_error(SystemExit) do |error|
          expect(error.status).to eq(1)
        end
      end
    end

    context "when GITHUB_TOKEN is empty" do
      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return("")
      end

      it "exits with status 1" do
        expect { main.run }.to raise_error(SystemExit) do |error|
          expect(error.status).to eq(1)
        end
      end
    end

    context "when GITHUB_TOKEN is set" do
      let(:repos) do
        [
          instance_double(GitHub::Repository, name: "repo1", updated_at: Time.new(2025, 1, 1, 0, 0, 0, "+00:00")),
          instance_double(GitHub::Repository, name: "repo2", updated_at: Time.new(2025, 6, 1, 0, 0, 0, "+00:00"))
        ]
      end
      let(:fetcher) { instance_double(GitHub::RepositoryFetcher, repositories: repos) }
      let(:expected_json) do
        '[{"name":"repo1","updated_at":"2025-01-01T00:00:00+00:00"},' \
          '{"name":"repo2","updated_at":"2025-06-01T00:00:00+00:00"}]'
      end

      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return("test-token")
        allow(GitHub::RepositoryFetcher).to receive(:new).with(client:).and_return(fetcher)
      end

      it "outputs JSON to stdout" do
        expect { main.run }.to output("#{expected_json}\n").to_stdout
      end
    end

    context "when user has no repositories" do
      let(:fetcher) { instance_double(GitHub::RepositoryFetcher, repositories: []) }

      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return("test-token")
        allow(GitHub::RepositoryFetcher).to receive(:new).with(client:).and_return(fetcher)
      end

      it "outputs an empty JSON array to stdout" do
        expect { main.run }.to output("[]\n").to_stdout
      end
    end
  end

  describe "#format_output" do
    let(:repos) do
      [
        instance_double(GitHub::Repository, name: "repo1", updated_at: Time.new(2025, 1, 1, 0, 0, 0, "+00:00")),
        instance_double(GitHub::Repository, name: "repo2", updated_at: Time.new(2025, 6, 1, 0, 0, 0, "+00:00"))
      ]
    end

    it "returns an array of hashes with name and updated_at" do
      result = main.send(:format_output, repos)
      expect(result).to eq([
                             { "name" => "repo1", "updated_at" => "2025-01-01T00:00:00+00:00" },
                             { "name" => "repo2", "updated_at" => "2025-06-01T00:00:00+00:00" }
                           ])
    end

    context "when repositories is empty" do
      it "returns an empty array" do
        expect(main.send(:format_output, [])).to eq([])
      end
    end
  end
end
