# frozen_string_literal: true

require "octokit"
require_relative "repository"
require_relative "workflow_parser"

module GitHub
  class RepositoryFetcher
    # @rbs client: Octokit::Client
    # @rbs debug: bool
    def initialize(client:, debug: false) #: void
      @client = client
      @login = client.user.login
      @debug = debug
    end

    def repositories #: Array[GitHub::Repository]
      repos = client.repos(login, type: "owner")
      warn "[debug] Found #{repos.length} repositories" if debug

      active_repos = repos
                     .reject(&:archived)
                     .reject(&:fork)
                     .select { _1.pushed_at > one_year_ago }
      warn "[debug] #{active_repos.length} repositories after filtering" if debug

      active_repos.map.with_index(1) { |repo, i| build_repository(repo, i, active_repos.length) }
    end

    private

    attr_reader :client #: Octokit::Client
    attr_reader :login  #: String
    attr_reader :debug  #: bool

    def one_year_ago #: Time
      Time.now - (365 * 24 * 60 * 60)
    end

    # @rbs repo: untyped
    # @rbs index: Integer
    # @rbs total: Integer
    def build_repository(repo, index, total) #: GitHub::Repository
      warn "[debug] Processing #{repo.name} (#{index}/#{total})" if debug
      parser = workflow_parser(repo.name)
      Repository.new(name: repo.name, url: repo.html_url,
                     pull_requests_count: pull_requests_count(repo.name),
                     language_versions: parser.language_versions,
                     no_actionlint: parser.no_actionlint?)
    end

    # @rbs repo_name: String
    def pull_requests_count(repo_name) #: Integer
      client.pull_requests("#{login}/#{repo_name}", state: "open").length
    end

    # @rbs repo_name: String
    def workflow_parser(repo_name) #: GitHub::WorkflowParser
      WorkflowParser.new(client:, repo_full_name: "#{login}/#{repo_name}")
    end
  end
end
