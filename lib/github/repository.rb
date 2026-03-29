# frozen_string_literal: true

module GitHub
  Repository = Data.define(
    :name,                 #: String
    :url,                  #: String
    :pull_requests_count,  #: Integer
    :language_versions,    #: Hash[String, Array[String]]
    :no_actionlint         #: bool
  )
end
