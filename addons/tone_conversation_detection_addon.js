require('dotenv').config({silent: true});
var watson = require('watson-developer-cloud');  // watson sdk

/**
 * Instantiate the Watson Tone Analyzer
 * Credentials must be provided and can be found on the Bluemix Platform
 */
var tone_analyzer = watson.tone_analyzer({
	url: 'https://gateway.watsonplatform.net/tone-analyzer/api',
	username: process.env.TONE_ANALYZER_USERNAME,
	password: process.env.TONE_ANALYZER_PASSWORD,  
	version_date: '2016-05-19',
	version: 'v3'
});

/**
 * Thresholds for identifying meaningful tones returned by the Watson Tone Analyzer.
 * For more information: https://www.ibm.com/watson/developercloud/doc/tone-analyzer/understanding-tone.shtml
 */ 
var EMOTION_SCORE_THRESHOLD = 0.5;
var LANGUAGE_SCORE_THRESHOLD = 0.6;
var SOCIAL_SCORE_THRESHOLD = 0.75;

/**
 * Labels for the different tones returned by the Watson Tone Analyzer
 */
var EMOTION_TONE_LABEL = "emotion_tone";
var LANGUAGE_TONE_LABEL = "language_tone";
var SOCIAL_TONE_LABEL = "social_tone";


/**
 * Public functions for this module
 */
module.exports = {
  initToneContext,
  invokeTone,
  updateUserTone
};

/**
 * initToneContext initializes a user object containing tone data (from the Watson Tone Analyzer)
 * @returns user json object with the emotion, language and social tones.  The current
 * tone identifies the tone for a specific conversation turn, and the history provides the conversation for 
 * all tones up to the current tone for a conversation instance with a user.
 */
function initToneContext() {
    return {
      'user': {
        'tone': {
          'emotion': {
            'current': null,
            'history': []
          },
          'language': {
            'current': null,
            'history': []
          },
          'social': {
            'current': null,
            'history': []
          }
        }
      }
    };
};

/**
 * invokeTone calls the Watson Tone Analyzer with the (input) text and passes the payload returned by the 
 * Tone Analyzer to the callback function.
 * @param text - the input text provided by a user during a conversation turn
 * @param callback - the callback function to invoke after the Watson Tone Analyzer has processed the (input) text and returned a payload
 * @returns none
 */
function invokeTone(text, callback) {
	var toneAnalyzerPayload = {
      text: text
    };

	tone_analyzer.tone(toneAnalyzerPayload,
	    function(err, tone) {
	      if (err) {
	        callback(null);
	      } else {
	        callback(tone);
	      }
    });
  };


/**
 * updateUserTone processes the Tone Analyzer payload, if not erroneous, to pull out the emotion, language and social
 * tones, and further processes this data to identify the meaningful tones (i.e., those tones that meet a 
 * specified threshold).  The user json object is updated to includes these tones.
 * @param user
 * @param toneAnalyzerPayload
 * @returns
 */
function updateUserTone (user, toneAnalyzerPayload) {
    var emotionTone = null;
    var languageTone = null;
    var socialTone = null;
    
    console.log(JSON.stringify(toneAnalyzerPayload,2,null));


    if (toneAnalyzerPayload && toneAnalyzerPayload.document_tone) {
      toneAnalyzerPayload.document_tone.tone_categories.forEach(function(toneCategory) {
        if (toneCategory.category_id === EMOTION_TONE_LABEL) {
          emotionTone = toneCategory;
        }
        if (toneCategory.category_id === LANGUAGE_TONE_LABEL) {
          languageTone = toneCategory;
        }
        if (toneCategory.category_id === SOCIAL_TONE_LABEL) {
          socialTone = toneCategory;
        }
      });

      var emotionProfile = getEmotionProfile(emotionTone);
      user.tone.emotion.current = emotionProfile;
      if (typeof user.tone.emotion.history === 'undefined') {
        user.tone.emotion.history = [emotionProfile];
      } else {
        user.tone.emotion.history.push(emotionProfile);
      }

      var languageProfile = getLanguageProfile(languageTone);
      user.tone.language.current = languageProfile;
      if (typeof user.tone.language.history === 'undefined') {
        user.tone.language.history = [languageProfile];
      } else {
        user.tone.language.history.push(languageProfile);
      }

      var socialProfile = getSocialProfile(socialTone);
      user.tone.social.current = socialProfile;
      if (typeof user.tone.social.history === 'undefined') {
        user.tone.social.history = [socialProfile];
      } else {
        user.tone.social.history.push(socialProfile);
      }
    }
    return user;
};  
  
/**
 * getEmotionProfile identifies the primary emotion in the emotion tones in the payload returned by the Tone Analyzer
 * @param emotionTone a json object containing the emotion tones in the payload returned by the Tone Analyzer
 * @returns the primary emotion if one of the emotion tones has a score that is greater than or equal to the 
 * EMOTION_SCORE_THRESHOLD; otherwise, returns 'neutral'
 */
function getEmotionProfile(emotionTone) {
  var maxScore = 0;
  var primaryEmotion = null;

  emotionTone.tones.forEach(function(emotion) {
    if (emotion.score > maxScore) {
      maxScore = emotion.score;
      primaryEmotion = emotion.tone_name.toLowerCase();
    }
  });

    // There is a primary emotion only if the highest score is > 0.5
  if (maxScore <= EMOTION_SCORE_THRESHOLD) {
    primaryEmotion = 'neutral';
  }

  return primaryEmotion;
}

/**
 * getLanguageProfile identifies the language tones that are greater than the LANGUAGE_SCORE_THRESHOLD
 * @param languageTone a json object containing the language tones in the payload returned by the Tone Analyzer
 * @returns a space-separated string containing the language tones that have a score that meets or exceeds the
 * LANGUAGE_SCORE_THRESHOLD
 */
function getLanguageProfile(languageTone) {
  var languageProfile = '';

  languageTone.tones.forEach(function(lang) {
    if (lang.score >= LANGUAGE_SCORE_THRESHOLD) {
      languageProfile += lang.tone_name.toLowerCase() + ' ';
    }
  });

  return languageProfile;
};

/**
 * getSocialProfile 
 * @param socialTone a json object containing the social tones in the payload returned by the Tone Analyzer
 * @returns a space-separated string containing the social tones that have a score that meets or exceeds the
 * SOCIAL_SCORE_THRESHOLD
 */
function getSocialProfile(socialTone) {
  var socialProfile = '';

  socialTone.tones.forEach(function(social) {
    if (social.score >= SOCIAL_SCORE_THRESHOLD) {
      socialProfile += social.tone_name.toLowerCase() + ' ';
    }
  });

  return socialProfile;
};



