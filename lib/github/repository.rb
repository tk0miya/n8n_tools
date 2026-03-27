# frozen_string_literal: true

module GitHub
  Repository = Data.define(
    :name,                #: String
    :updated_at,          #: Time
    :ci_failing,          #: bool
    :pull_requests_count  #: Integer
  )
end
