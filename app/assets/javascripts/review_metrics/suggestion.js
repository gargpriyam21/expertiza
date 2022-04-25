class SuggestionMetric extends Metric {
    constructor(URL) {
        super(
            URL
        );
    }

    format_response(response, analysis, metric_name, number_of_comments) {

        let combined_api_output = [];

        // Loop through each comment
        for (let i = 0; i < number_of_comments; i++) {

            let single_output = {}
            single_output["Comment Number"] = i + 1;

            // Add the sentiment values to the output
            single_output[metric_name] = response[metric_name]['reviews'][i][String(analysis) + 's'];
            combined_api_output.push(single_output);
        }

        return combined_api_output;

    }
}