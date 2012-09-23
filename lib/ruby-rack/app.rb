require 'rubygems'
require 'json'
require 'date'
require 'rack/request'
require 'rack/response'
require './model/fs'

module SjFileManager
  class Application
    @@base_dir = File.dirname(File.dirname(Dir.pwd))
    @config
    @i18n
    @request
    @response

    attr_reader :config, :i18n, :request, :response

    def call(env)
      @request  = Rack::Request.new(env)
      @response = Rack::Response.new([], 200)
      @response['Content-Type'] = 'application/json'

      configure

      puts @request.public_methods.inspect
      @i18n.set_hidden_strings({
        @@base_dir      => '*base*',
        @config['root'] => '*root*'
      })

      begin
        Controller.dispatch(self)
      rescue SjException => e
        #@response.status = 400
        @response.write prepare_response(e.respond)
      end

      @response.finish
    end

    def params
      @request.params
    end

    def files
      return nil unless @request.post?

      files = @request.POST.reject do |k, v|
        !v[:tempfile] || !v[:tempfile].kind_of?(Tempfile)
      end

      return files
    end

    def prepare_response(data)
      id, type = (params['_JsRequest'] || '').split('-', 2)
      text = {
        :id   => id.to_i,
        :js   => data,
        :text => ""
      }.to_json

      unless !type || type == 'xml'
        text = (type == 'form' ? 'top && top.$_Request' : '$_Request') + ".dataReady(#{text})\n"
        if type == 'form'
          text = '<script type="text/javascript"><!--' + "\n#{text}" + '//--></script>'
        end
      end

      return text
    end

    private
      def base_url
        url = @request.scheme + "://"
        url << @request.host

        if @request.scheme == "https" && @request.port != 443 ||
            @request.scheme == "http" && @request.port != 80
          url << ":#{@request.port}"
        end

        url
      end

      def configure
        @config = read_config('../../web/config.json') do |content|
          content.gsub('%BASE_DIR%', @@base_dir).gsub('%BASE_URL%', base_url)
        end
        @config['root'] = File.expand_path(@config['root'])
        @config['root'] = @config['root'][0...-1] if @config['root'].end_with?(File::Separator)
        @request.env['DOCUMENT_ROOT'] ||= @@base_dir

        begin
          i18n = read_config('../i18n/' + @config['lang'] + '.json')
        rescue SjException
          i18n = {}
        end
        @i18n = I18n.new(i18n)

        self
      end

      def read_config(path)
        unless File.readable?(path)
          raise SjException, ("Configuration file is missed. '%s' should be available for reading in the lib directory" % path)
        end

        data = {}
        File.open(path) do |f|
          content = f.read.gsub(/^\s*(?:\/\/|#).+\s/, '')
          if block_given?
            content = yield(content)
          end
          data = JSON.parse content
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

  class Controller
    @context
    @@controllers = {}

    class << self
      protected :new
    end

    def initialize(ctx)
      @context = ctx
    end

    def self.dispatch(ctx)
      if ctx.params['manager_type'] == 'media'
          require './ctrl/mm_action';
          controller_type = MediaController
      elsif !ctx.params['action'].nil? && !ctx.params['action'].empty?
          require './ctrl/fm_action';
          controller_type = FileController
      else
          require './ctrl/fm_read_dir';
          controller_type = DirController
      end

      controller = @@controllers[controller_type.to_s]
      if controller.nil?
        controller = controller_type.new(ctx)
        @@controllers[controller_type.to_s] = controller
      end

      result = controller.dispatch
      if result
        unless ctx.params['print_error']
          ctx.response.write ctx.prepare_response(result)
        else
          if result[:response][:status] != 'correct'
            ctx.response.write result[:response][:msg]
          else
            ctx.response.write ""
          end
        end
      end

      return ctx.response
    end

    private
      def get_dir(path)
        return '' if path.empty?

        realpath = File.expand_path(@context.config['root'] + File::Separator + path);

        realLength = realpath.length
        rootLength = @context.config['root'].length;

        cur_dir = realpath.slice(rootLength, realpath.length);

        if realpath.empty? || realLength < rootLength
          cur_dir  =  '';
        end

        return cur_dir
      end

      def get_dir!(path)
        dir = get_dir(path)

        raise SjException, @context.i18n.__('Access denied') if dir.empty?
        return dir
      end
  end
end
