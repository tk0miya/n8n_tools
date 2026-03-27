# frozen_string_literal: true

require "octokit"
require_relative "repository"

module GitHub
  class RepositoryFetcher
    # @rbs client: Octokit::Client
    def initialize(client:) #: void
      @client = client
      @login = client.user.login
    end

    def repositories #: Array[GitHub::Repository]
      client.repos(login, type: "owner").map do |repo|
        Repository.new(name: repo.name, updated_at: repo.updated_at,
                       ci_failing: ci_failing?(repo.name, repo.default_branch))
      end
    end

    private

    attr_reader :client #: Octokit::Client
    attr_reader :login  #: String

    # @rbs repo_name: String
    # @rbs branch: String
    def ci_failing?(repo_name, branch) #: bool
      runs = client.workflow_runs("#{login}/#{repo_name}", per_page: 1, branch:).workflow_runs
      return false if runs.empty?

      run = runs.first
      return false unless run

      run.conclusion != "success"
    end
  end
end
