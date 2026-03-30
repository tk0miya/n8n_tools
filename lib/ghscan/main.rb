# frozen_string_literal: true

require "json"
require "octokit"
require_relative "../github/repository_fetcher"

module Ghscan
  class Main
    LANGUAGE_RELEASE_REPOS = {
      "ruby" => "ruby/ruby",
      "node" => "nodejs/node",
      "python" => "python/cpython"
    }.freeze

    def run #: void
      debug = ARGV.include?("--debug")
      token = fetch_token
      client = build_client(token)
      fetcher = GitHub::RepositoryFetcher.new(client:, debug:)
      latest_versions = latest_language_versions(client)
      puts JSON.generate(format_output(filter_repositories(fetcher.repositories, latest_versions)))
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

    # @rbs client: Octokit::Client
    def latest_language_versions(client) #: Hash[String, Array[Integer]]
      LANGUAGE_RELEASE_REPOS.transform_values do |repo|
        tag = latest_release_tag(client, repo)
        parts = tag.delete_prefix("v").tr("_", ".").split(".", 3)
        [parts[0].to_i, (parts[1] || "0").to_i]
      end
    end

    # @rbs client: Octokit::Client
    # @rbs repo: String
    def latest_release_tag(client, repo) #: String
      client.latest_release(repo).tag_name
    rescue Octokit::NotFound
      # Fall back to tags when the repo doesn't use GitHub releases (e.g. python/cpython)
      stable_tag = client.tags(repo).find { _1.name.match?(/^v?\d+\.\d+[._]\d+$/) }
      stable_tag&.name || raise("No stable release found for #{repo}")
    end

    # @rbs repositories: Array[GitHub::Repository]
    # @rbs latest_versions: Hash[String, Array[Integer]]
    def filter_repositories(repositories, latest_versions) #: Array[GitHub::Repository]
      repositories.select do |repo|
        repo.pull_requests_count >= 1 ||
          outdated_language_version?(repo, latest_versions) ||
          repo.no_actionlint
      end
    end

    # @rbs repo: GitHub::Repository
    # @rbs latest_versions: Hash[String, Array[Integer]]
    def outdated_language_version?(repo, latest_versions) #: bool
      repo.language_versions.any? do |lang, versions|
        latest = latest_versions[lang]
        next false if latest.nil?

        versions.none? { (minor_version(_1) <=> latest)&.>=(0) }
      end
    end

    # @rbs version_string: String
    def minor_version(version_string) #: Array[Integer]
      parts = version_string.split(".")
      minor_str = parts[1]
      minor = minor_str.nil? || minor_str == "x" ? 99 : minor_str.to_i
      [parts[0].to_i, minor]
    end

    # @rbs repositories: Array[GitHub::Repository]
    def format_output(repositories) #: Array[Hash[String, untyped]]
      repositories.map do |repo|
        {
          "name" => repo.name,
          "url" => repo.url,
          "pull_requests_count" => repo.pull_requests_count,
          "language_versions" => repo.language_versions,
          "no_actionlint" => repo.no_actionlint
        }
      end
    end
  end
end
