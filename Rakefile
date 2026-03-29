# frozen_string_literal: true

require "rspec/core/rake_task"
require "rubocop/rake_task"

RuboCop::RakeTask.new
RSpec::Core::RakeTask.new(:spec)

task default: :ci

task ci: %i[ruboclean rubocop spec steep]

desc "Check .rubocop.yml is sorted in ASCII order"
task :ruboclean do
  sh "bundle exec ruboclean --verify"
end

namespace :rbs do
  desc "Generate RBS files"
  task :generate do
    sh "rbs-inline", "--opt-out", "--output=sig", "lib"
  end
end

desc "Run Steep type check"
task :steep do
  sh "bundle exec steep check"
end
