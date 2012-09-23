module SjFileManager
  class MediaController < Controller
    @fs

    def dispatch
      files = get_files

      response = { :media => { :add => [], :rm => [] }, :response => { :status => '', :msg => '' } }

      action = @context.params['action']
      width  = @context.params['width'].to_i
      height = @context.params['height'].to_i
      left   = @context.params['left'].to_i
      top    = @context.params['top'].to_i
      override_old = @context.params['override'] && !@context.params['override'].empty?

      begin
        root = @context.request.env['DOCUMENT_ROOT']
        files.each_pair do |image_path, new_name|
          file  = root + image_path
          pathinfo = fs.get_pathinfo(file)
          img = Magick::Image.read(file).first

          case action
          when 'resize'
            img.resize!(width, height)
          when 'crop'
            img.crop!(left, top, width, height)
          end

          file = pathinfo[:dirname] + File::Separator + fs.prepare_filename(new_name)
          file = fs.dynamic_filename(file) unless override_old

          img.write(file)

          response[:media][:add] << file.sub(root, '')
          response[:media][:rm]  << image_path if override_old
        end
        response[:response][:status] = 'success'
      rescue Magick::ImageMagickError => e
        raise SjException, @context.i18n.__('Unable to modify some images: %s', e.message)
      end

      response
    end

    private
      def fs
        unless @fs
          @fs = Filesystem.new
          @fs.i18n = @context.i18n
        end
        @fs
      end

      def get_files
        files = @context.params['files']

        raise SjException, @context.i18n.__('Unable to process request') unless files.kind_of?(::Hash)

        files.each_pair do |file_path, new_name|
          pathinfo = fs.get_pathinfo(file_path)
          dirpath  = get_dir(pathinfo[:dirname])
          files.delete(file_path) if dirpath.empty?
        end
      end
  end
end