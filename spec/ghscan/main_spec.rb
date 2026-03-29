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
          instance_double(GitHub::Repository,
                          name: "repo1", url: "https://github.com/testuser/repo1",
                          pull_requests_count: 2,
                          language_versions: { "ruby" => ["3.2"] }),
          instance_double(GitHub::Repository,
                          name: "repo2", url: "https://github.com/testuser/repo2",
                          pull_requests_count: 0,
                          language_versions: {}),
          instance_double(GitHub::Repository,
                          name: "repo3", url: "https://github.com/testuser/repo3",
                          pull_requests_count: 3,
                          language_versions: { "ruby" => ["3.3"] })
        ]
      end
      let(:fetcher) { instance_double(GitHub::RepositoryFetcher, repositories: repos) }
      let(:expected_json) do
        '[{"name":"repo1","url":"https://github.com/testuser/repo1",' \
          '"pull_requests_count":2,"language_versions":{"ruby":["3.2"]}},' \
          '{"name":"repo3","url":"https://github.com/testuser/repo3",' \
          '"pull_requests_count":3,"language_versions":{"ruby":["3.3"]}}]'
      end

      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return("test-token")
        allow(GitHub::RepositoryFetcher).to receive(:new).with(client:, debug: false).and_return(fetcher)
        allow(client).to receive(:latest_release).with("ruby/ruby").and_return(double(tag_name: "v4_0_2"))
        allow(client).to receive(:latest_release).with("nodejs/node").and_return(double(tag_name: "v22.14.0"))
        allow(client).to receive(:latest_release).with("python/cpython").and_return(double(tag_name: "v3.13.3"))
      end

      it "outputs only repositories with open PRs as JSON to stdout" do
        expect { main.run }.to output("#{expected_json}\n").to_stdout
      end
    end

    context "when user has no repositories" do
      let(:fetcher) { instance_double(GitHub::RepositoryFetcher, repositories: []) }

      before do
        allow(ENV).to receive(:fetch).with("GITHUB_TOKEN", nil).and_return("test-token")
        allow(GitHub::RepositoryFetcher).to receive(:new).with(client:, debug: false).and_return(fetcher)
        allow(client).to receive(:latest_release).with("ruby/ruby").and_return(double(tag_name: "v4_0_2"))
        allow(client).to receive(:latest_release).with("nodejs/node").and_return(double(tag_name: "v22.14.0"))
        allow(client).to receive(:latest_release).with("python/cpython").and_return(double(tag_name: "v3.13.3"))
      end

      it "outputs an empty JSON array to stdout" do
        expect { main.run }.to output("[]\n").to_stdout
      end
    end
  end

  describe "#latest_release_tag" do
    context "when the repo has a GitHub release" do
      before do
        allow(client).to receive(:latest_release).with("ruby/ruby").and_return(double(tag_name: "v4_0_2"))
      end

      it "returns the tag name from the latest release" do
        expect(main.send(:latest_release_tag, client, "ruby/ruby")).to eq("v4_0_2")
      end
    end

    context "when the repo does not have GitHub releases" do
      let(:tags) do
        [
          double(name: "v3.15.0a7"),
          double(name: "v3.14.1"),
          double(name: "v3.13.3"),
          double(name: "v3.14.0")
        ]
      end

      before do
        allow(client).to receive(:latest_release).with("python/cpython").and_raise(Octokit::NotFound)
        allow(client).to receive(:tags).with("python/cpython").and_return(tags)
      end

      it "falls back to the first stable tag" do
        expect(main.send(:latest_release_tag, client, "python/cpython")).to eq("v3.14.1")
      end
    end

    context "when the repo has no stable tags" do
      before do
        allow(client).to receive(:latest_release).with("python/cpython").and_raise(Octokit::NotFound)
        allow(client).to receive(:tags).with("python/cpython").and_return([double(name: "v3.15.0a7")])
      end

      it "raises an error" do
        expect { main.send(:latest_release_tag, client, "python/cpython") }
          .to raise_error(RuntimeError, "No stable release found for python/cpython")
      end
    end
  end

  describe "#latest_language_versions" do
    before do
      allow(client).to receive(:latest_release).with("ruby/ruby").and_return(double(tag_name: "v4_0_2"))
      allow(client).to receive(:latest_release).with("nodejs/node").and_return(double(tag_name: "v22.14.0"))
      allow(client).to receive(:latest_release).with("python/cpython").and_return(double(tag_name: "v3.13.3"))
    end

    it "returns the latest major.minor version for each language" do
      result = main.send(:latest_language_versions, client)
      expect(result).to eq({ "ruby" => [4, 0], "node" => [22, 14], "python" => [3, 13] })
    end
  end

  describe "#filter_repositories" do
    let(:latest_versions) { { "ruby" => [4, 0], "node" => [22, 14], "python" => [3, 13] } }
    let(:repos) do
      [
        instance_double(GitHub::Repository, name: "repo1", pull_requests_count: 0, language_versions: {}),
        instance_double(GitHub::Repository, name: "repo2", pull_requests_count: 2, language_versions: {}),
        instance_double(GitHub::Repository, name: "repo3", pull_requests_count: 0, language_versions: {}),
        instance_double(GitHub::Repository, name: "repo4", pull_requests_count: 3, language_versions: {})
      ]
    end

    it "returns only repositories with at least one open PR" do
      result = main.send(:filter_repositories, repos, latest_versions)
      expect(result.map(&:name)).to eq(%w[repo2 repo4])
    end

    context "when a repository uses an outdated language version" do
      let(:outdated_repo) do
        instance_double(GitHub::Repository, name: "outdated",
                                            pull_requests_count: 0, language_versions: { "ruby" => ["3.2"] })
      end

      it "includes the repository in the result" do
        result = main.send(:filter_repositories, [outdated_repo], latest_versions)
        expect(result.map(&:name)).to eq(["outdated"])
      end
    end

    context "when a repository uses the latest language version" do
      let(:current_repo) do
        instance_double(GitHub::Repository, name: "current",
                                            pull_requests_count: 0, language_versions: { "ruby" => ["4.0"] })
      end

      it "excludes the repository from the result" do
        result = main.send(:filter_repositories, [current_repo], latest_versions)
        expect(result).to be_empty
      end
    end

    context "when repositories is empty" do
      it "returns an empty array" do
        expect(main.send(:filter_repositories, [], latest_versions)).to eq([])
      end
    end
  end

  describe "#outdated_language_version?" do
    let(:latest_versions) { { "ruby" => [4, 0] } }

    context "when all versions are older than the latest" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: { "ruby" => ["3.2"] })
      end

      it "returns true" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be true
      end
    end

    context "when the version matches the latest" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: { "ruby" => ["4.0"] })
      end

      it "returns false" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be false
      end
    end

    context "when the version is newer than the latest" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: { "ruby" => ["4.1"] })
      end

      it "returns false" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be false
      end
    end

    context "when versions include both outdated and latest" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: { "ruby" => ["3.2", "4.0"] })
      end

      it "returns false" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be false
      end
    end

    context "when language_versions is empty" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: {})
      end

      it "returns false" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be false
      end
    end

    context "when the language is not in latest_versions" do
      let(:repo) do
        instance_double(GitHub::Repository, language_versions: { "go" => ["1.22"] })
      end

      it "returns false" do
        expect(main.send(:outdated_language_version?, repo, latest_versions)).to be false
      end
    end
  end

  describe "#minor_version" do
    it "parses major.minor format" do
      expect(main.send(:minor_version, "3.2")).to eq([3, 2])
    end

    it "parses major.minor.patch format" do
      expect(main.send(:minor_version, "3.2.1")).to eq([3, 2])
    end

    it "parses major-only format as latest minor" do
      expect(main.send(:minor_version, "18")).to eq([18, 99])
    end

    it "parses version with x wildcard as latest minor" do
      expect(main.send(:minor_version, "20.x")).to eq([20, 99])
    end
  end

  describe "#format_output" do
    let(:repos) do
      [
        instance_double(GitHub::Repository,
                        name: "repo1", url: "https://github.com/testuser/repo1",
                        pull_requests_count: 2,
                        language_versions: { "ruby" => ["3.2"] }),
        instance_double(GitHub::Repository,
                        name: "repo2", url: "https://github.com/testuser/repo2",
                        pull_requests_count: 0,
                        language_versions: {})
      ]
    end

    it "returns an array of hashes with all repository attributes" do
      result = main.send(:format_output, repos)
      expect(result).to eq([
                             { "name" => "repo1", "url" => "https://github.com/testuser/repo1",
                               "pull_requests_count" => 2,
                               "language_versions" => { "ruby" => ["3.2"] } },
                             { "name" => "repo2", "url" => "https://github.com/testuser/repo2",
                               "pull_requests_count" => 0,
                               "language_versions" => {} }
                           ])
    end

    context "when repositories is empty" do
      it "returns an empty array" do
        expect(main.send(:format_output, [])).to eq([])
      end
    end
  end
end
