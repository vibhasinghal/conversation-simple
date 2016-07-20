module.exports = {

  initToneContext: function(toneInstance) {
    toneAnalyzer = toneInstance;
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
  },


  invokeTone: function(text, callback) {
    var toneAnalyzerPayload = {
      text: text
    };

    toneAnalyzer.tone(toneAnalyzerPayload,
            function(err, tone) {
              if (err) {
                callback(null);
              } else {
                callback(tone);
              }
            });
  },


  updateUserTone: function(user, toneAnalyzerPayload) {
    var emotionTone = null;
    var languageTone = null;
    var socialTone = null;


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
  }
};


function getEmotionProfile(emotionTone) {
  var maxScore = 0;
  var primaryEmotion = null;

  emotionTone.tones.forEach(function(emotion) {
    if (emotion.score > maxScore) {
      maxScore = emotion.score;
      primaryEmotion = emotion.tone_id;
    }
  });

    // There is a primary emotion only if the highest score is > 0.5
  if (maxScore <= emotionScoreCutoff) {
    primaryEmotion = 'neutral';
  }

  return primaryEmotion;
}

function getLanguageProfile(languageTone) {
  var languageProfile = '';

  languageTone.tones.forEach(function(lang) {
    if (lang.score >= languageScoreCutoff) {
      languageProfile += lang.tone_id + ' ';
    }
  });

  return languageProfile;
}

function getSocialProfile(socialTone) {
  var socialProfile = '';

  socialTone.tones.forEach(function(social) {
    if (social.score >= socialScoreCutoff) {
      socialProfile += social.tone_id + ' ';
    }
  });

  return socialProfile;
}

var toneAnalyzer = null;
var emotionScoreCutoff = 0.5;
var languageScoreCutoff = 0.6;
var socialScoreCutoff = 0.75;
