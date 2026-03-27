# frozen_string_literal: true

require "json"
require "octokit"
require_relative "../github/repository_fetcher"

module Ghscan
  class Main
    def run #: void
      token = ENV.fetch("GITHUB_TOKEN", nil)
      if token.nil? || token.empty?
        warn "Error: GITHUB_TOKEN environment variable is not set"
        exit 1
      end

      client = Octokit::Client.new(access_token: token, auto_paginate: true) # steep:ignore UnexpectedKeywordArgument
      fetcher = GitHub::RepositoryFetcher.new(client:)
      repositories = fetcher.repositories

      output = repositories.map do |repo|
        {
          "name" => repo.name,
          "updated_at" => repo.updated_at.iso8601
        }
      end

      puts JSON.generate(output)
    end
  end
end
