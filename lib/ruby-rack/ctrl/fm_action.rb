module SjFileManager
  class FileManager < Manager
    def respond
      respond_to?(@context.params['action']) && send(@context.params['action'], ctx)
    end
  end
end
