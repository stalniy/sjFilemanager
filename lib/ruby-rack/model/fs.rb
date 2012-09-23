require 'fileutils'
require 'RMagick'

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

    def parse_size_value(size)
      return 0 if !size || size.empty?

      base = 1000.0
      data = size.strip.scan(/^(\d+)\s*(\w*)$/)
      return 0 unless data[0][0]

      size = data[0][0].to_f
      type = data[0][1] || 'b'

      case data[0][1][1]
      when 'T'
        size * base * base * base * base
      when 'G'
        size * base * base * base
      when 'M'
        size * base * base
      when 'k'
        size * base
      end

      size
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
        :atime   => data.atime,
        :ctime   => data.ctime,
        :mtime   => data.mtime,
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
        if convert_name || !options['override']
          target = dynamic_filename(target)
        end

        image = false;
        if options['thumbs'].kind_of?(::Hash) || options['images'].kind_of?(::Hash)
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
      def adaptive_resize(img, x, y, mode = 'auto', options = {})
        width  = img.columns
        height = img.rows

        mode = (width >= height ? 'width' : 'height') if mode == 'auto'

        case mode
        when 'width'
          n = width.to_f / height
          y = (x / n).round
        when 'height'
          n = height.to_f / width
          x = (y / n).round
        when 'crop'
          x = width if x > width
          y = height if y > height

          case options['type']
          when 'left-top'
            _x = _y = 0
          when 'left-bottom'
            _x = 0
            _y = height - y
          when 'center'
            _x = ((width - x) / 2.0).floor
            _y = ((height - y) / 2.0).floor
          when 'right-top'
            _x = width - x
            _y = 0
          when 'right-bottom'
            _x = width - x
            _y = height - y
          else
            _x = options['x'] || 0
            _y = options['y'] || 0
          end

          img.crop!(_x, _y, x, y)
          return img
        else
          n = width.to_f / height
          x = x * width
          y = x / n
          x = x.round
          y = y.round
        end

        img.resize!(x, y)
        return img
      end

      def resize_image(img, target, options)
        return nil if !options || options.empty?

        thumbs = []
        info = get_pathinfo(target)
        options.each_pair do |prefix, config|
          tmb = img.dup

          if config['width'] && config['height'] && config['type'] && (
            !config['check_size'] ||
            tmb.columns > config['width'] ||
            tmb.rows > config['height'])
            adaptive_resize(tmb, config['width'], config['height'], config['type'])
          end

          if config['crop']
            cfg = config['crop'].kind_of?(::Hash) ? config['crop'] : { 'type' => config['crop'] }
            adaptive_resize(tmb, config['width'], config['height'], 'crop', cfg)
          end

          tmbpath = info[:dirname] + File::Separator + prefix + info[:basename]
          begin
            dirname = File.dirname(tmbpath);
            mkdirs(dirname) unless File.directory?(dirname)
            tmb.write(tmbpath) { self.quality = config['quality'] || 70 }
          rescue Magick::ImageMagickError
            remove(thumbs)
            thumbs = []
            break
          end

          thumbs << tmbpath
        end

        thumbs.empty? ? nil : thumbs
      end

      def save_image(img, target, options = [])
        if options['images'].kind_of?(::Hash)
          target = resize_image(img, target, { '' => options['images'] })
          target = target.first if target.kind_of?(::Array)
        else
          img.write(target)
        end

        thumbs = []
        if target
          if options['thumbs'].kind_of?(::Hash)
            thumbs = resize_image(img, target, options['thumbs'])
            raise SjException, i18n.__('Can not create thumbs for "%s"', target) unless thumbs.kind_of?(::Array)
          end
        else
          raise SjException, i18n.__('Can not save image "%s"', target)
        end

        thumbs << target
        return thumbs
      end

      def create_image(path, override = true)
        begin
          Magick::Image.read(path).first
        rescue Magick::ImageMagickError
          nil
        end
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
