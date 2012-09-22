require 'fileutils'

module SjFileManager
  class Filesystem
    @@badFileChars = %q(/\"'?<>:|)
    @i18n
    attr_accessor :i18n

    def initialize
      @i18n = I18n.new
    end

    def prepare_filename(name)
      dirname = File.dirname(name)
      basename = File.basename(name).strip

      basename.gsub!(Regexp.new('[' + @@badFileChars + ']+'), '-')
      basename.gsub!(/[\s-]+/, '-')
      dirname << File::Separator unless dirname == File::Separator
      return dirname + basename
    end

    def read_dir(path, mode = nil, options = {})
      raise SjException, i18n.__('Directory "%s" is not readable', path) unless File.readable?(path)
      raise SjException, i18n.__('Path "%s" is not a directory', path) unless File.directory?(path)

      path = path.dup
      path << File::Separator unless path.end_with?(File::Separator)
      skip_regexp = options[:skip].nil? ? false : Regexp.new(options[:skip])

      case mode
      when "r"
        path << "**/*"
      else
        path <<  "**"
      end

      files = []
      Dir.glob(path) do |file|
        if !(skip_regexp || options[:only_files]) || skip_regexp && file !~ skip_regexp || options[:only_files] && File.file?(file)
          files << file
        end
      end

      unless options[:sort].nil?
        files = orderBy files
      end

      offset = 0
      unless options[:offset].nil?
        offset = options[:offset].to_i
      end

      limit = files.length
      unless options[:limit].nil?
        limit = options[:limit].to_i
      end

      return files[offset, limit] || []
    end

    def orderBy(files, &block)
      if block_given?
        files.sort(&block)
      else
        files.sort do |path1, path2|
          is_dir1 = File.directory?(path1)
          is_dir2 = File.directory?(path2)

          if is_dir1 && is_dir2 || !is_dir1 && !is_dir2
            path1 <=> path2
          else
            is_dir1 && !is_dir2 ? -1 : 1
          end
        end
      end
    end

    def dirsize(path)
      size = 0;
      read_dir(path, 'r', :only_files => true).each do |file|
        size += File.stat(file).size
      end

      return size
    end

    def format_size(file)
      raise SjException, i18n.__('Permissions denied for "%s"', file) unless File.readable?(file)

      format_size_value(File.directory?(file) ? dirsize(file) : File.stat(file).size)
    end

    def format_size_value(size)
      base = 1000.0
      size = size.to_f
      return size if size < base

      type = -1
      while (size >= base)
        size /= base
        type +=1
      end

      sufix = %w(k M G T)
      return ("%.2f" % size) + " " + sufix[type]
    end

    def chmod(files, mode)
      unless files.kind_of?(::Array)
        files = [files]
      end

      files.each do |file|
        File.chmod(mode, file)
      end
    end

    def get_mode(mode)
      ("%o" % mode).slice(-3, 4)
    end

    def stat(path)
      data = File.stat(path)
      return {
        :mode    => get_mode(data.mode),
        :atime   => i18n.format_date(data.atime),
        :ctime   => i18n.format_date(data.ctime),
        :mtime   => i18n.format_date(data.mtime),
        :blksize => data.blksize,
        :blocks  => data.blocks,
        :dev     => data.dev,
        :type    => data.ftype,
        :ino     => data.ino,
        :size    => format_size_value(data.size)
      }
    end

    def get_pathinfo(path)
      data =  {
        :dirname   => File.dirname(path),
        :basename  => File.basename(path),
        :extension => File.extname(path)
      }

      data[:filename]  = data[:basename].sub(data[:extension], '')
      data[:extension] = data[:extension].slice(1, data[:extension].length) unless data[:extension].empty?

      return data
    end

    def dynamic_filename(file)
      return file unless File.exists?(file)

      info = get_pathinfo(file)

      exp = info[:filename].match(/([^(]+)\((\d+)\)/) || [];
      index = exp[2].to_i == 0 ? 1 : exp[2].to_i
      info[:filename] = exp[1] unless exp[1].nil?

      has_ext = info[:extension].empty?
      while File.exists?(file)
        file = info[:dirname] + File::Separator + info[:filename] + '(' + index.to_s + ')';
        index += 1
        unless has_ext
          file << '.' + info[:extension]
        end
      end

      return file
    end

    def rename(orig, target)
      raise SjException, i18n.__('Cannot rename because the target "%s" already exist.', target) if File.exists?(target)

      File.rename(orig, target)
    end

    def mkdirs(path, mode = 0777)
      begin
        FileUtils.mkpath(path, :mode => mode)
      rescue
        return nil
      end
    end

    def copy(orig, target, options = {})
        target = prepare_filename(target)
        convert_name = options['dynamic_name'] || false

        options['override'] = options['override'] || false
        if convert_name
          target = dynamic_filename(target)
        end

        image = false;
        unless options['thumbs'].nil? || options['images'].nil?
          image = create_image(orig, options['override'])
        end

        files = []
        if image
          files = save_image(image, target, options)
        else
          dirpath = File.dirname(target)
          unless File.directory?(dirpath)
            mkdirs(dirpath)
          end

          mostRecent = false
          if File.exists?(target)
            stat_target = File.stat(target)
            stat_origin = File.stat(orig)
            mostRecent  = stat_origin.mtime > stat_origin.mtime
          end

          if options['override'] || !File.directory?(target) && !File.exists?(target) || mostRecent
            FileUtils.copy(orig, target)
            files << target
          end
        end

        return File.exists?(target) ? files : false;
    end

    def remove(files)
      begin
        files = [files] unless files.kind_of?(::Array)
        files.each do |file|
          FileUtils.rm_r(file)
        end
      rescue
        raise SjException, i18.__('Unable to remove file or directory. Maybe not enough permissions?')
      end
    end

    def mirrors(orig, dest)
      begin
        FileUtils.cp_r(orig, dest)

        if File.directory?(orig)
          read_dir(orig, "r").map do |file|
            file.sub(orig, dest)
          end
        else
          [dest]
        end
      rescue
        raise SjException, i18.__('Unable to copy "%s" to "%s"', orig, dest)
      end
    end

    private
      def save_image(img, where, options = [])
      end

      def create_image(path, override = true)
      end

    class I18n
      def __(*args)
        unless args[1].nil?
            args[0] = sprintf(*args);
        end
        args[0]
      end

      def format_date(date)
        date
      end
    end
  end
end
