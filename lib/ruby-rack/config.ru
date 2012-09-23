require 'rack'
require './app.rb'

run SjFileManager::Application.new
