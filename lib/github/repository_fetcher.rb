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
      repos.map.with_index(1) { |repo, i| build_repository(repo, i, repos.length) }
    end

    private

    attr_reader :client #: Octokit::Client
    attr_reader :login  #: String
    attr_reader :debug  #: bool

    # @rbs repo: untyped
    # @rbs index: Integer
    # @rbs total: Integer
    def build_repository(repo, index, total) #: GitHub::Repository
      warn "[debug] Processing #{repo.name} (#{index}/#{total})" if debug
      Repository.new(name: repo.name, updated_at: repo.updated_at,
                     ci_failing: ci_failing?(repo.name, repo.default_branch),
                     pull_requests_count: pull_requests_count(repo.name),
                     language_versions: language_versions(repo.name))
    end

    # @rbs repo_name: String
    def pull_requests_count(repo_name) #: Integer
      client.pull_requests("#{login}/#{repo_name}", state: "open").length
    end

    # @rbs repo_name: String
    def language_versions(repo_name) #: Hash[String, Array[String]]
      WorkflowParser.new(client:, repo_full_name: "#{login}/#{repo_name}").language_versions
    end

    # @rbs repo_name: String
    # @rbs branch: String
    def ci_failing?(repo_name, branch) #: bool
      runs = client.get("repos/#{login}/#{repo_name}/actions/runs", branch:, per_page: 100).workflow_runs
      return false if runs.empty?

      latest_sha = runs.first&.head_sha or return false
      latest_runs = runs.select { _1.head_sha == latest_sha }
      latest_runs.any? { _1.conclusion != "success" }
    end
  end
end
