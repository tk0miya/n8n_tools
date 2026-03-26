# frozen_string_literal: true

require "octokit"
require_relative "repository"

module GitHub
  class RepositoryFetcher
    # @rbs @client: Octokit::Client

    # @rbs client: Octokit::Client
    def initialize(client:) #: void
      @client = client
    end

    def repositories #: Array[GitHub::Repository]
      login = @client.user.login
      @client.repos(login, type: "owner").map do |repo|
        Repository.new(name: repo.name, updated_at: repo.updated_at)
      end
    end
  end
end
