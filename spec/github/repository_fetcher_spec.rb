# frozen_string_literal: true

require "spec_helper"
require "github/repository_fetcher"

RSpec.describe GitHub::RepositoryFetcher do
  subject(:fetcher) { described_class.new(client:) }

  let(:client) { instance_double(Octokit::Client) }

  describe "#repositories" do
    let(:user) { double(login: "testuser") }

    before do
      allow(client).to receive(:user).and_return(user)
    end

    context "when user has repositories" do
      let(:repos) do
        [
          double(name: "repo1", updated_at: Time.new(2025, 1, 1)),
          double(name: "repo2", updated_at: Time.new(2025, 6, 1))
        ]
      end

      before do
        allow(client).to receive(:repos).with("testuser", type: "owner").and_return(repos)
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
