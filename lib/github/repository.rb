# frozen_string_literal: true

module GitHub
  Repository = Data.define(
    :name,                 #: String
    :url,                  #: String
    :updated_at,           #: Time
    :pull_requests_count,  #: Integer
    :language_versions     #: Hash[String, Array[String]]
  )
end
