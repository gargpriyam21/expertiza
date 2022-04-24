//fetches the review form comments one by one - formats them into a single stringified json
function fetch_response_comments(){

    function create_comment_object(comment_id, question, class_name) {
        let comment_json = {};
        comment_json["id"] = comment_id+1;
        let iframe_id = comment_id >= 0 ? '#responses_'+comment_id+'_comments_ifr' : '#review_comments_ifr';
        let comment_string = $(iframe_id).contents().find('body[data-id='+ class_name +']').children().first().text();
        if(comment_string.length == 0) {
            return {};
        }
        comment_json["text"] = comment_string;
        comment_json["question"] = question;
        return comment_json;
    }

    var serialized_form = $("form").serialize();
    var form_value_to_json = [Object.fromEntries(new URLSearchParams(serialized_form))];

    //The while loop counts the number of comments in review form and breaks when
    //all the comments are found
    let review_count = 0;
    let review_mappings = {};
    while(true) {
        let comment_element = document.getElementById("responses_"+ review_count +"_comments");
        if(comment_element == null) {
            break;
        }
        review_count++;
    }

    //for loop parses comments from review form and pushes all of them into 'reviews' list
    var reviews = [];
    for (var i =0; i < review_count; i++) {
        if (document.getElementById("responses_"+i+"_comments") == null)
            continue;
        else
        {
            let question_class = 'responses_'+i;
            let question = $("label[for="+question_class+"]").text();
            let class_name = "responses_"+i+"_comments";
            let comment_object = create_comment_object(i, question, class_name);
            if(Object.keys(comment_object).length > 0) {
                reviews.push(comment_object);
            }
        }
    }

    //fetches the 'additional comment' text present at the end of review form
    let comment_object = create_comment_object(-1, "additional comments", 'review_comments');
    if(Object.keys(comment_object).length > 0) {
        reviews.push(comment_object);
    }
    var number_of_comments = reviews.length;

    //converts the reviews list into a json object, which is later converted into stringified json.
    var processed_comment_json = {};
    processed_comment_json["reviews"] = reviews;
    processed_comment_json_string = JSON.stringify(processed_comment_json);
    return [processed_comment_json_string, number_of_comments]
}

//This function takes in the processed api output to display a table(populated with API output) on UI
function generateTable(combined_output, processed_comment_json,metricsToCheck, columns, tooltips){
    //tooltip_json to store the text displayed in tooltip
    // Create a table header row using the extracted headers above.

    let table = document.createElement("table");
    let tr = table.insertRow(-1);                   // table row.

    processed_comment_json_string = JSON.parse(processed_comment_json)['reviews'];
    for (let i = 0; i < columns.length; i++) {
        var th = document.createElement("th");      // table header.
        th.innerHTML = columns[i] + `<img src="/assets/info.png" title='`+tooltips[columns[i]]+`'>`;
        th.classList.add("parentCell_metric_table");
        tr.appendChild(th);
    }

    // add json data to the table as rows.
    for (var i = 0; i < combined_output.length; i++) {
    
        tr = table.insertRow(-1);
    
        for (var j = 0; j < columns.length; j++) {
            var tabCell = tr.insertCell(-1);
            tabCell.innerHTML = combined_output[i][metricsToCheck[j]]
            if(j==0) {
                let title = 'Q) '+ processed_comment_json_string[i]['question'] + '   A) ' + processed_comment_json_string[i]['text'];
                tabCell.innerHTML += `<img src="/assets/info.png" title='`+title+`'>`;
            }
        }
    }
    
    // Now, add the newly created table with json data, to a container.
    var divShowData = document.getElementById('showData');
    divShowData.innerHTML = "";
    divShowData.appendChild(table);

    //provides conditional formatting to the generated table
    color();
}

// This function makes API calls
async function makeAPICalls(config_file_api_call_values,config_file_values,processed_comment_json){
    let analysisResponseDict = {};
     for(let metric in config_file_api_call_values){
        if(config_file_values.includes(metric)){
            callObject = eval(config_file_api_call_values[metric]['displayName']);
            const tempObject = new callObject(config_file_api_call_values);
            analysisResponseDict[config_file_api_call_values[metric]['displayName']] = await tempObject.callAPI(processed_comment_json);
        }
    }
    return analysisResponseDict;
}

function combineOutput(config_file_api_call_values,number_of_comments,config_file_values, analysisResponseDict){
    // This loop combines the output received by API's in an array
    let combined_output = [];
    for(let i=0; i< number_of_comments;i++){

        let output = {}
        output["Comment Number"] = i+1;

        for(let metric in config_file_api_call_values){
            if(config_file_values.includes(metric)){
                callObject = eval(config_file_api_call_values[metric]['displayName']);
                const tempObject = new callObject(config_file_api_call_values);
                output[config_file_api_call_values[metric]['displayName']] = tempObject.formatResponse(analysisResponseDict,metric,config_file_api_call_values[metric]['displayName'],i);
            }
        }
        combined_output.push(output);
    }
    return combined_output;
}

//The driver code to fetch the review comments, get API call output and display them in tabular format
async function getReviewFeedback(){
    //this variable fetches and stores the review metrics setting stored in config file review_metrics.yml
    var config_file_values =   $('.fetch_review_metric').data('params');

    //this variable fetches and stores the review metrics api urls stored in config file review_metrics_api_urls.yml
    var config_file_api_call_values =  $('.fetch_review_metric_api_call_values').data('params');

    //displays text 'Loading...' when 'get review feedback' button is pressed until table is displayed
    var time_taken_obj = document.getElementById('timeTaken');
    time_taken_obj.innerHTML = "Loading..."

    //start the timer here - which will be used to calculate total time taken.
    var time_start = performance.now();
    let responseComments = fetch_response_comments();
    let processed_comment_json = responseComments[0];
    let number_of_comments = responseComments[1];

    //This holds the response value of each analysis as a dictionar/hash(key = analysis name, value = response of analysis)
    var analysisResponseDict = {};

    //This loops through each analysis(key) in analysisVals hash/dictionary and gets its respective apiurl(value) and puts the response of the
    //api url into responseDict

    analysisResponseDict = await makeAPICalls(config_file_api_call_values,config_file_values,processed_comment_json);
    
    let tooltips = {"Comment Number":'The comment number from the top in the form.'};
    let metricsToCheck = ["Comment Number"];

    for(var metric in config_file_api_call_values){
        metricsToCheck.push(config_file_api_call_values[metric]['displayName']);
        tooltips[config_file_api_call_values[metric]['displayName']] = config_file_api_call_values[metric]['toolTipText'];
    }

    columnNames = ["Comment Number"]
    for(let metric in config_file_api_call_values){
        metric_string = String(metric);
        ColumnName = metric_string.substring(0,1).toUpperCase() + metric_string.substring(1,metric_string.length);
        columnNames.push(ColumnName);

    }

    combined_output = combineOutput(config_file_api_call_values,number_of_comments,config_file_values, analysisResponseDict);
    
    generateTable(combined_output,processed_comment_json ,metricsToCheck,columnNames, tooltips);

    time_end = performance.now();
    var time_taken = time_end - time_start;
    var time_taken_obj = document.getElementById('timeTaken');
    time_taken_obj.innerHTML = `<p> Time taken is ${(time_taken/1000).toFixed(2)} seconds. </p>`;

}

//This function does the conditional formatting of the output table on UI
function color(){ $('td').each(
    function() {
        var score = $(this).text();
        if (score == 'Positive' || score == 'Present') {
            $(this).addClass('good');
        }
        else if (score == 'Neutral') {
            $(this).addClass('neutral');
        }
        else if (score == 'Negative' || score == 'Absent') {
            $(this).addClass('poor');
        }
    });
}