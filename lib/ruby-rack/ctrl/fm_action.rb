require 'model/file_manager'

module SjFileManager
  class FileController < Controller
    def dispatch
      validate!()

      unless respond_to?(@context.params['action'])
        raise SjException, @context.i18n.__('Unknown action: %s',  @context.params['action'])
      end

      result = send(@context.params['action'])
      if result === false
        return nil
      end

      response = {
        :response => {
          :status => 'correct',
          :msg    => @context.i18n.__('Request was successfully done')
        }
      }

      if result.kind_of?(::Hash)
        result.each do |k, v|
          response[k] = v
        end
      end

      return response
    end

    def paste
      raise SjException, @context.i18n.__('Unable to process request') unless has_files

      have_to_copy = @context.params['onlyCopy']
      manager!.paste(get_path, {
        'dynamic_name' => true,
        'move'         => !have_to_copy || have_to_copy.empty?
      })
    end

    def remove
      fm = manager!
      raise SjException, @context.i18n.__('Unable to process request') if fm.empty?

      fm.remove_all
    end

    def download
      filename = 'files.zip'
      fm = manager!

      if fm.empty?
        fm.import [get_path]
      end

      file = fm.compress(filename)
      @context.response['Content-Type'] = 'application/octet-stream'
      @context.response['Expires'] = Time.now.gmtime.to_s
      @context.response['Content-Disposition'] = 'attachment; filename="%s"' % filename
      @context.response['Accept-Ranges'] = 'bytes'
      @context.response['Content-Length'] = File.size(file.path)

      if @context.request.user_agent.index 'MSIE'
        @context.response['Cache-Control'] = 'must-revalidate, post-check=0, pre-check=0'
        @context.response['Pragma'] = 'public'
      else
        @context.response['Pragma'] = 'no-cache'
      end

      File.open(file.path) do |file|
        @context.response.write file.read
      end
      return false
    end

    def perms
      raise SjException, @context.i18n.__('Unable to process request') unless has_files

      perms = @context.params['fileperms'].to_i

      unless perms == 0
        perms = perms.to_s
        if perms.length < 3
          perms << '0' * (3 - perms.length)
        end

        perms = perms.slice(0, 3).to_i(8);
        manager!.filesystem.chmod(get_files!, perms)
      end
    end

    def dir_info
      fm = manager!
      filename = fm.empty? ? get_path : get_files!.first

      stat = fm.filesystem.stat(filename)
      data = { :mode => nil, :size => nil, :mtime => nil, :type => nil }
      data.each_key do |k|
        data[k] = stat[k]
      end

      data[:size] << @context.i18n.__('b')
      data[:mtime] = @context.i18n.format_date(data[:mtime])
      data[:type].capitalize!

      return { :file_info => data }
    end

    def create_dir
      dirname = @context.params['dirname']
      raise SjException, @context.i18n.__('Unable to process request') if !dirname || dirname.empty?

      raise SjException, @context.i18n.__('File name can not contain following symbols: \/:*?<>|"\'') if dirname =~ /[\/:*?<>|'"]+/

      dirname.strip!
      path = get_path
      puts path
      raise SjException, @context.i18n.__('Unable to create folder. Folder with this name already exists') if File.directory?(path + dirname)

      raise SjException, @context.i18n.__('Unable to create folder. Permissions denied') unless manager!.filesystem.mkdirs(path + dirname)
    end

    def rename
      if !has_files || !@context.params['fileNames'] || @context.params['fileNames'].empty?
          raise SjException, @context.i18n.__('Unable to process request')
      end

      fs = manager!.filesystem

      new_file_name = fs.prepare_filename(@context.params['fileNames'].first[1])
      new_file_ext  = fs.get_pathinfo(new_file_name)[:extension]

      allowed_types = @context.config['uploader']['allowed_types']
      if new_file_ext && !new_file_ext.empty? && allowed_types.kind_of?(::Array) && !allowed_types.include?(new_file_ext)
        raise SjException, @context.i18n.__('Files with extension "%s" does not allowed', new_file_ext)
      end

      old_file = get_files!.first
      dirname  = File.dirname(old_file)
      fs.rename(old_file, dirname + File::Separator + new_file_name)
    end

    def upload
      files = @context.files
      raise SjException, @context.i18n.__('Unable to process request') if !files || files.empty?

      cfg_name = @context.params['use_cfg']
      cfg = @context.config['uploader']

      if cfg['named'] && cfg['named'][cfg_name]
        cfg['images'] = cfg['named'][cfg_name]['images']
        cfg['thumbs'] = cfg['named'][cfg_name]['thumbs']
      end

      fm = manager!(true)
      fm.import files.values
      fm.paste(get_path, cfg)
    end

    private
      def validate!
        unless @context.config['allowed_actions'].nil? || @context.config['allowed_actions'].include?(@context.params['action'])
          raise SjException, @context.i18n.__('Access denied')
        end
      end

      def get_path
        path = @context.config['root'] + get_dir(@context.params['path'])
        path << File::Separator unless path.end_with?(File::Separator)
        return path
      end

      def has_files
        files = get_files_dirty
        files.kind_of?(::Array) && !files.empty?
      end

      def get_files_dirty
        files = @context.params['files']
        if files.kind_of?(::Hash) && !files.empty?
          files = files.values
        end

        return files
      end

      def get_files!
        files = get_files_dirty
        return [] unless has_files

        base_dir = @context.params['baseDir']

        unless base_dir.nil? || base_dir.empty?
          base_dir = get_dir!(base_dir)
        else
          base_dir = get_dir(@context.params['path'])
        end

        base_dir << File::Separator unless base_dir.end_with?(File::Separator)

        base_dir = @context.config['root'] + base_dir
        files.map do |file|
          base_dir + file
        end
      end

      def manager!(empty = false)
        fm = Filemanager.new
        fm.filesystem = Filesystem.new
        fm.filesystem.i18n = @context.i18n

        fm.import get_files! unless empty
        return fm
      end
  end
end
