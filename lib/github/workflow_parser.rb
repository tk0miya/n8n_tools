# frozen_string_literal: true

require "base64"
require "yaml"
require "octokit"

module GitHub
  class WorkflowParser
    LANGUAGE_KEYS = {
      "ruby-version" => "ruby",
      "node-version" => "node",
      "python-version" => "python"
    }.freeze #: Hash[String, String]

    MATRIX_REF_PATTERN = /\A\$\{\{\s*matrix\.([\w-]+)\s*\}\}\z/ #: Regexp

    # @rbs client: Octokit::Client
    # @rbs repo_full_name: String
    def initialize(client:, repo_full_name:) #: void
      @client = client
      @repo_full_name = repo_full_name
    end

    def language_versions #: Hash[String, Array[String]]
      versions = {} #: Hash[String, Array[String]]
      fetch_workflow_files.each do |content|
        extract_from_workflow(content, versions)
      end
      versions.transform_values(&:uniq)
    end

    private

    attr_reader :client #: Octokit::Client
    attr_reader :repo_full_name #: String

    def fetch_workflow_files #: Array[String]
      entries = client.contents(repo_full_name, path: ".github/workflows")
      return [] unless entries.is_a?(Array)

      entries.filter_map do |entry|
        next unless entry.name.end_with?(".yml", ".yaml")

        file = client.contents(repo_full_name, path: entry.path)
        Base64.decode64(file.content)
      end
    rescue Octokit::NotFound
      []
    end

    # @rbs content: String
    def parse_yaml(content) #: untyped
      YAML.safe_load(content)
    rescue StandardError
      nil
    end

    # @rbs content: String
    # @rbs versions: Hash[String, Array[String]]
    def extract_from_workflow(content, versions) #: void
      workflow = parse_yaml(content)
      return unless workflow.is_a?(Hash)

      jobs = workflow["jobs"]
      return unless jobs.is_a?(Hash)

      jobs.each_value do |job|
        next unless job.is_a?(Hash)

        matrix = extract_matrix(job)
        extract_from_steps(job["steps"], matrix, versions)
      end
    end

    # @rbs job: Hash[String, untyped]
    def extract_matrix(job) #: Hash[String, Array[String]]
      matrix = job.dig("strategy", "matrix")
      return {} unless matrix.is_a?(Hash)

      result = {} #: Hash[String, Array[String]]
      LANGUAGE_KEYS.each_key do |lang_key|
        values = matrix[lang_key]
        next unless values.is_a?(Array)

        result[lang_key] = values.map(&:to_s)
      end
      result
    end

    # @rbs steps: untyped
    # @rbs matrix: Hash[String, Array[String]]
    # @rbs versions: Hash[String, Array[String]]
    def extract_from_steps(steps, matrix, versions) #: void
      return unless steps.is_a?(Array)

      steps.each do |step|
        extract_from_step(step, matrix, versions)
      end
    end

    # @rbs step: untyped
    # @rbs matrix: Hash[String, Array[String]]
    # @rbs versions: Hash[String, Array[String]]
    def extract_from_step(step, matrix, versions) #: void
      return unless step.is_a?(Hash)

      with = step["with"]
      return unless with.is_a?(Hash)

      LANGUAGE_KEYS.each do |lang_key, lang_name|
        value = with[lang_key]
        next unless value

        resolved = resolve_value(value.to_s, lang_key, matrix)
        versions[lang_name] = (versions[lang_name] || []) + resolved
      end
    end

    # @rbs value: String
    # @rbs lang_key: String
    # @rbs matrix: Hash[String, Array[String]]
    def resolve_value(value, lang_key, matrix) #: Array[String]
      match = MATRIX_REF_PATTERN.match(value)
      if match
        matrix_key = match[1] || lang_key
        matrix[matrix_key] || []
      else
        [value]
      end
    end
  end
end
