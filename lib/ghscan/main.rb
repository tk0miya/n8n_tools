# frozen_string_literal: true

require "json"
require "octokit"
require_relative "../github/repository_fetcher"

module Ghscan
  class Main
    def run #: void
      debug = ARGV.include?("--debug")
      token = fetch_token
      client = build_client(token)
      fetcher = GitHub::RepositoryFetcher.new(client:, debug:)
      puts JSON.generate(format_output(filter_repositories(fetcher.repositories)))
    end

    private

    def fetch_token #: String
      token = ENV.fetch("GITHUB_TOKEN", nil)
      if token.nil? || token.empty?
        warn "Error: GITHUB_TOKEN environment variable is not set"
        exit 1
      end
      token
    end

    # @rbs token: String
    def build_client(token) #: Octokit::Client
      Octokit::Client.new(access_token: token, auto_paginate: true) # steep:ignore UnexpectedKeywordArgument
    end

    # @rbs repositories: Array[GitHub::Repository]
    def filter_repositories(repositories) #: Array[GitHub::Repository]
      repositories.select { _1.pull_requests_count >= 1 }
    end

    # @rbs repositories: Array[GitHub::Repository]
    def format_output(repositories) #: Array[Hash[String, untyped]]
      repositories.map do |repo|
        {
          "name" => repo.name,
          "updated_at" => repo.updated_at.iso8601,
          "pull_requests_count" => repo.pull_requests_count,
          "language_versions" => repo.language_versions
        }
      end
    end
  end
end
