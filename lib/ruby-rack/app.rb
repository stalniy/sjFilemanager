require 'json'
require 'date'
require './model/fs'

module SjFileManager
  class Application
    @@base_dir = File.dirname(File.dirname(Dir.pwd))
    @params
    @config
    @i18n

    attr_reader :params, :config, :i18n

    def initialize
      @config = read_config('../../web/config.json')
      @config['lib_dir'].sub!('%BASE_DIR%', @@base_dir)

      begin
        i18n = read_config('../i18n/lang_' + @config['lang'] + '.json')
      rescue SjException
        i18n = {}
      end
      @i18n = I18n.new(i18n)
    end

    def call(env)
      @config['root'].sub!('%DOCUMENT_ROOT%', env['DOCUMENT_ROOT'] || '')
      @i18n.set_hidden_strings({
        @@base_dir      => '*base*',
        @config['root'] => '*root*'
      })

      parse_query(env['QUERY_STRING']);

      begin
        response = Manager.process(self)
      rescue SjException => e
        response = [e.respond]
      end

      [200, {"Content-Type" => "application/json"}, response]
    end

    private
      def parse_query(query)
        @params = Rack::Utils.parse_nested_query(query)
      end

      def read_config(path)
        unless File.readable?(path)
          raise SjException, ("Configuration file is missed. '%s' should be available for reading in the lib directory" % path)
        end

        data = {}
        File.open(path) do |f|
          data = JSON.parse f.read.gsub(/^\s*(?:\/\/|#).+\s/, '')
        end
        return data
      end
  end

  class SjException < Exception
    def respond
      return {
        :response => {
          :status => 'error',
          :msg    => message
        }
      }
    end
  end

  class I18n
    @vocabulary
    @hiddenStrings

    def initialize(vocabulary)
      set_vocabulary(vocabulary)
      @hiddenStrings = {}
    end

    def set_vocabulary(vocabulary)
      @vocabulary = vocabulary
      return self
    end

    def set_hidden_strings(data)
      @hiddenStrings = data
      return self
    end

    def format_date(date)
      DateTime.parse(date.to_s).to_s
    end

    def __(*args)
      string = args[0]
      unless @vocabulary[string].nil?
        string = @vocabulary[string]
      end

      unless args[1].nil?
        args[0] = string
        string = sprintf(*args);
      end

      @hiddenStrings.each do |k, v|
        string.gsub!(k, v)
      end

      return string
    end
  end

  class Manager
    @context
    @response
    @@managers = {}

    class << self
      protected :new
    end

    def initialize(ctx)
      @context = ctx
      @response = {}
    end

    def self.process(ctx)
      cls = nil
      if ctx.params['manager_type'] == 'media'
          require './ctrl/mm_action';
          cls = MediaManager
      elsif !ctx.params['action'].nil? && !ctx.params['action'].empty?
          require './ctrl/fm_action';
          cls = FileManager
      else
          require './ctrl/fm_read_dir';
          cls = DirManager
      end

      if @@managers[cls.to_s].nil?
        @@managers[cls.to_s] = cls.new(ctx)
      end

      @@managers[cls.to_s].respond
      return @@managers[cls.to_s]
    end

    def each
      yield @response.to_json
    end

    private
      def get_cur_dir(path)
        return '' if path.empty?

        realpath = File.realpath(@context.config['root'] + File::Separator + path);

        realLength = realpath.length
        rootLength = @context.config['root'].length;

        cur_dir = realpath.slice(rootLength, realpath.length);

        if realpath.empty? || realLength < rootLength
          cur_dir  =  '';
        end

        return cur_dir
      end
  end
end
