require('dotenv').config({silent: true});
var watson = require('watson-developer-cloud');  // watson sdk

var tone_analyzer = watson.tone_analyzer({
	url: 'https://gateway.watsonplatform.net/tone-analyzer/api',
	username: process.env.TONE_ANALYZER_USERNAME,
	password: process.env.TONE_ANALYZER_PASSWORD,  
	version_date: '2016-05-19',
	version: 'v3'
});


var toneAnalyzer = null;
var EMOTION_SCORE_THRESHOLD = 0.5;
var LANGUAGE_SCORE_THRESHOLD = 0.6;
var SOCIAL_SCORE_THRESHOLD = 0.75;


module.exports = {
  initToneContext,
  invokeTone,
  updateUserTone
};


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


  
function updateUserTone (user, toneAnalyzerPayload) {
    var emotionTone = null;
    var languageTone = null;
    var socialTone = null;
    
    console.log(JSON.stringify(toneAnalyzerPayload,2,null));


    if (toneAnalyzerPayload && toneAnalyzerPayload.document_tone) {
      toneAnalyzerPayload.document_tone.tone_categories.forEach(function(toneCategory) {
        if (toneCategory.category_id === "emotion_tone") {
          emotionTone = toneCategory;
        }
        if (toneCategory.category_id === "language_tone") {
          languageTone = toneCategory;
        }
        if (toneCategory.category_id === "social_tone") {
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

function getLanguageProfile(languageTone) {
  var languageProfile = '';

  languageTone.tones.forEach(function(lang) {
    if (lang.score >= LANGUAGE_SCORE_THRESHOLD) {
      languageProfile += lang.tone_name.toLowerCase() + ' ';
    }
  });

  return languageProfile;
};

function getSocialProfile(socialTone) {
  var socialProfile = '';

  socialTone.tones.forEach(function(social) {
    if (social.score >= SOCIAL_SCORE_THRESHOLD) {
      socialProfile += social.tone_name.toLowerCase() + ' ';
    }
  });

  return socialProfile;
};



