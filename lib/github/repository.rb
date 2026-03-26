# frozen_string_literal: true

module GitHub
  Repository = Data.define(
    :name,       #: String
    :updated_at  #: Time
  )
end
