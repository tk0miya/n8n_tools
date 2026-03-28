# frozen_string_literal: true

require "rspec/core/rake_task"
require "rubocop/rake_task"

RuboCop::RakeTask.new
RSpec::Core::RakeTask.new(:spec)

task default: :ci

task ci: %i[rubocop spec rbs:validate steep]

namespace :rbs do
  desc "Generate RBS files"
  task :generate do
    sh "rbs-inline", "--opt-out", "--output=sig", "lib"
  end

  desc "Validate RBS files"
  task :validate do
    sh "bundle exec rbs -Isig validate"
  end
end

desc "Run Steep type check"
task :steep do
  sh "bundle exec steep check"
end
