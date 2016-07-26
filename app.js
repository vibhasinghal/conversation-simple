/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

require('dotenv').config({silent: true});
require('json-query');

var express = require('express');  // app server
var bodyParser = require('body-parser');  // parser for post requests
var watson = require('watson-developer-cloud');  // watson sdk
var tone_conversation_addon = require("./addons/tone_conversation_detection_addon.js");
var tone_expression_addon = require("./addons/tone_conversation_expression_addon.js");


var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = watson.conversation({
  url: 'https://gateway.watsonplatform.net/conversation/api',
  username: process.env.CONVERSATION_USERNAME || '<username>',
  password: process.env.CONVERSATION_PASSWORD || '<password>',
  version_date: '2016-07-11',
  version: 'v1'
});


var lastUserMessage = "";

// Endpoint to be call from the client side
app.post('/api/message', function(req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({'output': {'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' +
    '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' +
      'Once a workspace has been defined the intents may be imported from ' +
    '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'}});
  }
  var payload = {
    workspace_id: workspace,
    context: {}
  };
	// Extract the input and context from the request, and add it to the payload to be sent to the 
	// conversation service
	if (req.body) {

		// INPUT - check for input in the body of the request 
		if (req.body.input) {
			payload.input = req.body.input;
		}else{
			return new Error('Error: no input provided in request.');
		}
		
		// INPUT - user's input text is whitespace - no intent provided
		if (!(req.body.input.text).trim().length){
			return res.json({'output': {'text': 'No input has been provided.  Please state your intent.'}});
		}
		
		// CONTEXT - context/state maintained by client app
		if (req.body.context) { 		
			payload.context = req.body.context;				
			
			// USER - if there is no user in the context, initialize one and add to the context
			if(typeof req.body.context.user == 'undefined'){
				//var emptyUser = tone_conversation_addon.initToneContext(tone_analyzer);
				var emptyUser = tone_conversation_addon.initToneContext();
				payload.context = extend(payload.context, { emptyUser });
				console.log("app: payload is " + JSON.stringify(payload,2,null));
				invokeAddOns_Tone(payload,req,res);
	
		}
		else {
			invokeAddOns_Tone(payload,req,res);
		}
              } 
		// If there is no context, create it and add a user object to it
		else {
			//payload.context = tone_conversation_addon.initToneContext(tone_analyzer);
			payload.context = tone_conversation_addon.initToneContext();
			
			console.log("just prior to error - invokeAddOns_Tone");
			console.log("payload is " + JSON.stringify(payload,2,null));
			invokeAddOns_Tone(payload,req,res);
		}	

	
	}
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text += ". " + responseText;
  return response;
}

function invokeAddOns_Tone(payload,req,res)
{
	lastUserMessage = req.body.input.text;

	tone_conversation_addon.invokeTone(req.body.input.text, 
		function(tone_payload){
			tone_conversation_addon.updateUserTone(payload.context.user, tone_payload);
	
			// Send the input to the conversation service
			conversation.message(payload, function(err, data) {
				if (err) {
					return res.status(err.code || 500).json(err);
				}
				else {
					tone_expression_addon.invokeToneExpression(data,lastUserMessage, 
						function(agentTone){
							return res.json(tone_expression_addon.personalizeMessage((updateMessage(data)),agentTone));
					});
				}
			});
	});	
}

module.exports = app;

