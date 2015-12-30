class ImportFileController < ApplicationController
  def action_allowed?
    ['Instructor',
     'Teaching Assistant',
     'Administrator',
     'Super-Administrator'].include? current_role_name
  end

  def start
    @id = params[:id]
    @expected_fields = params[:expected_fields]
    @model = params[:model]
    @title = params[:title]
  end

  def import
    errors = importFile(session, params)
    err_msg = "The following errors were encountered during import.<br/>Other records may have been added. A second submission will not duplicate these records.<br/><ul>"
    errors.each{
      |error|
      err_msg = err_msg+"<li>"+error.to_s+"<br/>"
    }
    err_msg = err_msg+"</ul>"
    if errors.length > 0
      flash[:error] = err_msg
    end
    undo_link("File has been imported successfully. ")
    redirect_to session[:return_to]
  end

  protected
  def importFile(session, params)
    delimiter = get_delimiter(params)
    file = params['file'].tempfile

    errors = Array.new
    first_row_read = false
    row_header = {}
    file.each_line do |line|
      line.chomp!
      if first_row_read == false
        row_header = parse_line(line.downcase, delimiter)
        first_row_read = true
        if (row_header.include?("email"))
          #skip if first row contains header. In case of user information, it will contain name of user (mandatory
          next
        else
          row_header = {}
        end
      end
      unless line.empty?
        row = parse_line(line, delimiter)
        begin
          if params[:model] == 'AssignmentTeam' or params[:model] == 'CourseTeam'
            Object.const_get(params[:model]).import(row, params[:id], params[:options])
          elsif params[:model] == 'SignUpTopic'
            session[:assignment_id] = params[:id]
            Object.const_get(params[:model]).import(row, session, params[:id])
          else
            if (row_header.count() > 0)
              Object.const_get(params[:model]).import(row, row_header, session, params[:id])
            else
              Object.const_get(params[:model]).import(row, nil, session, params[:id])
            end
          end
        rescue
          errors << $!
        end
      end
    end
    return errors
  end


  def get_delimiter(params)
    delim_type = params[:delim_type]
    delimiter = case delim_type
                when "comma" then ","
                when "space" then " "
                when "tab" then "\t"
                when "other" then params[:other_char]
                end
    return delimiter
  end

  def parse_line(line, delimiter)
    if delimiter == ","
      items = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*(?![^\"]*\"))/)
    else
      items = line.split(delimiter)
    end
    row = Array.new
    items.each { | value | row << value.sub("\"","").sub("\"","").strip }
    return row
  end

  #def undo_link
  #  "<a href = #{url_for(:controller => :versions,:action => :revert,:id => Object.const_get(params[:model]).last.versions.last.id)}>undo</a>"
  #end
end
