require('dotenv').config({silent: true});
var watson = require('watson-developer-cloud');  // watson sdk

var fs = require("fs");
var path = require('path');

var ls = require("ls");
var hashmap = require('hashmap');

var INTENSITY_THRESHOLD = 0.5;
var INCLUDE_AGENT_HEADER = false;


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
	  console.log("invokeToneExpressions with emotion " + emotion);
	  
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

function personalizeMessage (conversationResponse, agentTone, clientEmotion) {
	
	console.log("personalize message called.");
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
    	if(INCLUDE_AGENT_HEADER){
    		personalizedMessage = expressAgentTone(agentTone, clientEmotion, conversationResponse) + '<br/>' + conversationResponse.output.text;
    	}else{
    		personalizedMessage = conversationResponse.output.text;
    	}
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
function expressAgentTone(agentTone, clientEmotion, conversationResponse)
{
	var separator ="_";
	
	// Check with Michal on intensity - 
	var intensity = 0.6;
	var emotion_history = [];
	agentTone = agentTone.toLowerCase();
	var output = "";
	
	
	var expressionsMap = loadToneExpressions();
	//console.log(expressionsMap.keys());
	
	var key = "";
	
	
	// if neutral, no need to add expression
	if(agentTone === "neutral"){
		console.log("agent tone is neutral - no expression will be added.")
		return "";
	}else{

		// set the intensity to high or medium
		intensity = intensity > INTENSITY_THRESHOLD ? "high" : "med";
		console.log("intensity is " + intensity);
	
		// if customer emotion neutral,  don't acknowledge any emotion, just simple tone
		if (clientEmotion == "neutral"){
			key = agentTone+separator+intensity;
		}
		else{
			key=agentTone+separator+clientEmotion;
		}
		/*
		else{
			// check history- we don't want the agent to acknowledge more than once the same emotion in the conversation
			if(!checkHistory(emotion_history,tone_history,emotion,tone)){
				key = tone+separator+emotion;
			}
			else{
				key = tone+separator+intensity;
			}
		
		}
		*/
		console.log('tone_conversation_expression_addon: key is ' + key);
		console.log('tone_conversation_expression_addon: expressions map is ' + expressionsMap);
		var expressions = expressionsMap.get(key); 
		console.log('tone_conversation_expression_addon: expressions is ' + expressions);
		if(expressions == "undefined"){
			console.log('tone_conversation_expression_addon: expressions undefined.');
			return "";
		}
		var randomKey = randomInt(0,expressions.length);
	}

	console.log("key is " + key + ", and expressions is " + expressions[randomKey]);
	return expressions[randomKey] + " " + key.toUpperCase();
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function loadToneExpressions(){
	var appDir = path.dirname(require.main.filename);
	var toneExpressionDir = appDir + '/addons/data/tone_expressions';
	
	var expressionsMap = new hashmap.HashMap();
	addFilesToMap(toneExpressionDir + "/level1",expressionsMap);
	addFilesToMap(toneExpressionDir + "/level2",expressionsMap);
	
	return expressionsMap;
};

function addFilesToMap(dir, map){
	var files = fs.readdirSync(dir);
	var fileCount = files.length;
	
	for(var i=0; i < fileCount; i++){
		var array = fs.readFileSync(dir + "/" + files[i]).toString().split("\n");
		var key = files[i].toString().replace(/.txt/g, '');
		map.set(key, array);
	}
};

module.exports = {
	invokeToneExpression,
	personalizeMessage
};




