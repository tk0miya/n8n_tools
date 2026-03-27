# frozen_string_literal: true

require "spec_helper"
require "github/repository_fetcher"

RSpec.describe GitHub::RepositoryFetcher do
  subject(:fetcher) { described_class.new(client:) }

  let(:client) { instance_double(Octokit::Client) }
  let(:user) { double(login: "testuser") }

  before do
    allow(client).to receive(:user).and_return(user)
  end

  describe "#repositories" do
    context "when user has repositories" do
      let(:repos) do
        [
          double(name: "repo1", updated_at: Time.new(2025, 1, 1), default_branch: "main"),
          double(name: "repo2", updated_at: Time.new(2025, 6, 1), default_branch: "master")
        ]
      end
      let(:workflow_runs_success) { double(workflow_runs: [double(conclusion: "success")]) }
      let(:workflow_runs_failure) { double(workflow_runs: [double(conclusion: "failure")]) }

      before do
        allow(client).to receive(:repos).with("testuser", type: "owner").and_return(repos)
        allow(client).to receive(:workflow_runs)
          .with("testuser/repo1", per_page: 1, branch: "main").and_return(workflow_runs_success)
        allow(client).to receive(:workflow_runs)
          .with("testuser/repo2", per_page: 1, branch: "master").and_return(workflow_runs_failure)
        allow(client).to receive(:pull_requests)
          .with("testuser/repo1", state: "open").and_return([double, double, double])
        allow(client).to receive(:pull_requests)
          .with("testuser/repo2", state: "open").and_return([double])
      end

      it "returns an array of Repository objects" do
        expect(fetcher.repositories).to all(be_a(GitHub::Repository))
      end

      it "returns the correct number of repositories" do
        expect(fetcher.repositories.length).to eq(2)
      end

      it "sets repository name and updated_at correctly" do
        result = fetcher.repositories
        expect(result[0].name).to eq("repo1")
        expect(result[0].updated_at).to eq(Time.new(2025, 1, 1))
      end

      it "sets ci_failing to false when latest run succeeded" do
        expect(fetcher.repositories[0].ci_failing).to be false
      end

      it "sets ci_failing to true when latest run failed" do
        expect(fetcher.repositories[1].ci_failing).to be true
      end

      it "sets pull_requests_count correctly" do
        result = fetcher.repositories
        expect(result[0].pull_requests_count).to eq(3)
        expect(result[1].pull_requests_count).to eq(1)
      end
    end

    context "when repository has no workflow runs" do
      let(:repos) { [double(name: "repo1", updated_at: Time.new(2025, 1, 1), default_branch: "main")] }
      let(:empty_runs) { double(workflow_runs: []) }

      before do
        allow(client).to receive(:repos).with("testuser", type: "owner").and_return(repos)
        allow(client).to receive(:workflow_runs).with("testuser/repo1", per_page: 1,
                                                                        branch: "main").and_return(empty_runs)
        allow(client).to receive(:pull_requests).with("testuser/repo1", state: "open").and_return([])
      end

      it "sets ci_failing to false" do
        expect(fetcher.repositories[0].ci_failing).to be false
      end
    end

    context "when user has no repositories" do
      before do
        allow(client).to receive(:repos).with("testuser", type: "owner").and_return([])
      end

      it "returns an empty array" do
        expect(fetcher.repositories).to eq([])
      end
    end
  end
end
