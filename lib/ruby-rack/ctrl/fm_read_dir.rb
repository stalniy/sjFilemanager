module SjFileManager
  class DirManager < Manager
    def respond
      @response = {:cur_dir => '', :source => [] }

      cur_dir = get_cur_dir(@context.params['path'] || '')
      limit   = @context.config['max_files_per_page'].to_i
      offset  = 0
      page    = 1

      if !@context.params['page'].nil? && @context.params['page'].to_i > 1
        page = @context.params['page'].to_i
        offset = (page - 1) * limit + 1;
      end

      fs = Filesystem.new
      fs.i18n = @context.i18n

      result  = fs.read_dir(@context.config['root'] + cur_dir, '!r', {
        :sort   => true,
        :offset => offset,
        :limit  => limit
      })

      @response[:cur_dir] = cur_dir
      result.each do |file|
        info = fs.get_pathinfo(file)
        is_dir = File.directory?(file)
        filename =

        @response[:source] << {
          :basename => info[:basename],
          :name     => is_dir ? info[:basename] : info[:filename],
          :size     => fs.format_size(file).to_s + "b",
          :modified_at => @context.i18n.format_date(File.mtime(file)),
          :type     => info[:extension],
          :is_dir   => is_dir,
          :mode     => fs.get_mode(File.stat(file).mode)
        }
      end
    end

  end
end
