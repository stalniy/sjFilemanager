require 'zip/zip'
require 'tempfile'

module SjFileManager
  class Filemanager
    @fs
    @files
    @options

    attr_accessor :options

    def initialize(options = {})
      @files   = []
      @options = prepare_config(options)
    end

    def filesystem=(fs)
      @fs = fs
    end

    def filesystem
      @fs
    end

    def import(files)
      raise SjException, "Before doing some operation you must set Filesystem object" unless @fs.kind_of?(SjFileManager::Filesystem)

      return false if files.nil? || files.empty? || !files.kind_of?(::Array)

      files.each do |file|
        if file[:tempfile].kind_of?(Tempfile)
          size = File.size(file[:tempfile].path)
          @files << {
            :type => file[:type],
            :name => file[:filename],
            :path => file[:tempfile].path,
            :error => size <= 0,
            :size => size
          }
        else
          info = @fs.get_pathinfo(file)
          filename = info[:basename]
          unless filename.empty? || !File.exists?(file)
            @files << {
              :name => filename,
              :type => info[:extension],
              :path => File.expand_path(file),
              :error => false,
              :size  => File.directory?(file) ? @fs.dirsize(file) : File.stat(file).size
            }
          end
        end
      end
    end

    def paste(to, options = {})
      to = (to || "").dup
      to = File.expand_path(to.strip)
      if to.empty? || @files.empty?
        raise SjException, @fs.i18n.__('Can not move files if destination or files array is empty')
      end

      raise SjException, @fs.i18n.__('The folder "%s" does not writable', to) unless File.writable?(to)

      max_size = false if options['max_size'].to_i == 0

      if max_size && get(:size).inject(:+) > max_size
        raise SjException, @fs.i18n.__('Uploaded files size greater then "%s"', @fs.format_size_value(max_size))
      end

      dry_run = options['dry_run'] || false
      allowed_types = options['allowed_types'] || false

      targets = []
      sources = []

      to << File::Separator unless to.end_with?(File::Separator)
      skip_dirs = options['skip_dirs'] || false

      @files.each do |info|
        if !skip_dirs && File.directory?(info[:path])
          result  = @fs.mirrors(info[:path], to)
          targets = targets.concat(result)
          next
        end

        if info[:size] <= 0
          next if dry_run
          raise SjException, @fs.i18n.__('Size of "%s" is less 0', info[:path])
        end

        path_info = @fs.get_pathinfo(info[:name])
        if allowed_types && !allowed_types.include?(path_info[:extension].downcase)
          next if dry_run
          raise SjException, @fs.i18n.__('Files with extension "%s" does not allowed', path_info[:extension])
        end

        result = @fs.copy(info[:path], to + info[:name], options)
        if !result || result.empty?
          next if dry_run
          raise SjException, @fs.i18n.__('Can not copy file "%s" to destination "%s"', info[:path], to)
        end

        targets = targets.concat(result)
        sources << info[:path]
      end

      @fs.chmod(targets, options['chmod'] || 0744)

      if options['move']
        @fs.remove(sources)
      end
    end

    def compress(filename)
      tmp = Tempfile.new(filename + '_' + Time.now.to_s)

      Zip::ZipFile.open(tmp.path) do |z|
        @files.each do |info|
          if File.directory?(info[:path])
            path = info[:path].dup
            path << File::Separator unless path.end_with?(File::Separator)

            @fs.read_dir(info[:path], 'r', :only_files => true).each do |file|
              z.add file, file
            end
          else
            z.add info[:path], info[:path]
          end
        end
      end
      return tmp
    end

    def empty?
      @files.empty?
    end

    def count
      @files.length
    end

    def remove_all
      @fs.remove get(:path)
      clear
    end

    def clear
      @files = []
    end

    def get(part)
      @files.map do |file|
        file[part]
      end
    end

    private
      def prepare_config(config)
        options = config.dup

        if options[:compress].nil?
          options[:compress] = {}
        end

        if options[:compress][:size_gt].nil?
          options[:compress][:size_gt] = 1000000
        end

        return options
      end
  end
end