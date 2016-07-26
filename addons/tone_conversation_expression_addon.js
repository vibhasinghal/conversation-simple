require('dotenv').config({silent: true});
var watson = require('watson-developer-cloud');  // watson sdk

/**
 * The tone_natural_language_classifier is an instance of Watson NLC that has been trained
 * on 
 */
var tone_natural_language_classifier = watson.natural_language_classifier({
  url: 'https://gateway.watsonplatform.net/natural-language-classifier/api',
  username: process.env.TONE_NLC_USERNAME || '<username>',
  password: process.env.TONE_NLC_PASSWORD || '<password>',
  version: 'v1'
});


/**
 * 
 * @param conversationResponse
 * @param userMessage
 * @param callback
 * @returns
 */
function invokeToneExpression (conversationResponse, userMessage, callback) {
	  var emotion = conversationResponse.context.user.tone.emotion.current;
	  var textToClassify = userMessage + " " + emotion;
	  tone_natural_language_classifier.classify({
		  text: textToClassify,
		  classifier_id: process.env.TONE_NLC_CLASSIFIER },
		  function(err, response) {
			  if (err)
			  {
				  callback("Neutral");
			  }
			  else
			  {
				  var toneExpressionClasses = response.classes;
				  var toneClassWithHighestConfidence = toneExpressionClasses[0];
				  
				  console.log("invokeToneExpression: tone class with highest confidence: " + toneClassWithHighestConfidence);
				  callback(toneClassWithHighestConfidence.class_name);
			  }
		  });
}

/**
 * 
 * @param conversationResponse
 * @param agentTone
 * @returns
 */

function personalizeMessage (conversationResponse, agentTone) {
    var personalizedMessage = null;

    if (conversationResponse === 'undefined') {
      conversationResponse = {
        'output': {
          'text': 'ERROR: I\'m sorry, an error was returned by the Watson Conversation service.  Please try again later.'
        }

      };
     return conversationResponse;
    }

    if (!conversationResponse.output) {
      conversationResponse.output = {
        'text': 'There was no output provided by the Conversation service.'
      };
    }

        // If a current_emotion (tone) is provided for the user input, prepend the output.text from the Conversation Service with the matching tone expression header
    if (agentTone != "") {
        personalizedMessage = expressAgentTone(agentTone, conversationResponse) + '<br/>' + conversationResponse.output.text;
        conversationResponse.output.text = personalizedMessage;
    }
    return conversationResponse;
}

/**
 * 
 * @param agentTone
 * @param conversationResponse
 * @returns
 */
function expressAgentTone(agentTone, conversationResponse)
{
	return agentTone;
}



module.exports = {
	invokeToneExpression,
	personalizeMessage
};




