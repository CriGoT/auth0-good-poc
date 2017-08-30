window.DOMAIN_OPTIONS = {
  localhost: {
    "default" : {
      "domain" : "crigot-dev.auth0.com",
      "clientID": "QDGQgtmxUzlPqjlVm9nJkIEv5ajuZ0xn",
      "redirectUri": "http://localhost:9000/callback.html",
      "responseType": "token id_token",
      "responseMode": "fragment",
      "scope": "openid email nickname"
    },
    "silent": {
      "usePostMessage": true
    },
    "popup": {
      //"ignoreCasing": true
    },
    "lock": {
      "rememberLastLogin": true,
      // loginAfterSignUp: false,
      "theme": {
            "logo":     "https://vignette2.wikia.nocookie.net/logopedia/images/0/0b/Fox_News_Channel.svg.png/revision/latest?cb=20121107232621",
            "primaryColor": "#036"
      },
      "additionalSignUpFields": [{
                    "name": "first_name",
                    "placeholder": "Enter your first name"
            },
            {
                    "name": "last_name",
                    "placeholder": "Enter your last name"
            },
            {
                    "type": "select",
                    "name": "party",
                    "placeholder": "choose your party",
                    "options": [
                        { "value": "republican", "label": "Republican" },
                        { "value": "democrat", "label": "Democrat" },
                        { "value": "independent", "label": "Independent" },
                        { "value": "liberal", "label": "Liberal" },
                        { "value": "conservative", "label": "Conservative" },
                    ]
            },
            {
                "name": "zip_code",
                "placeholder": "Enter your zip code"
            },  
            {
              "type": "checkbox",
              "name": "fnMornHeadlines",
              "prefill": "false",
              "placeholder": "Fox News Morning Headlines"
            },
            {
              "type": "checkbox",
              "name": "topHeadline",
              "prefill": "false",
              "placeholder": "Fox News Top Headlines"
           },
           {
              "type": "checkbox",
              "name": "fnBreakingAlerts",
              "prefill": "false",
              "placeholder": "Fox News Breaking Alerts"
           },
           {
              "type": "checkbox",
              "name": "fbBreakingAlerts",
              "prefill": "false",
              "placeholder": "Fox Business Breaking Alerts"
           }
        ],
      "languageDictionary": 
      {
         "title": 'Fox News',
         "signUpTerms": "I have read and agree to Fox News Digital's " + '<a target="_blank" href="http://www.foxnews.com/story/0,2933,95454,00.html">Terms of Service</a> ' + "and " + '<a target="_blank" href="http://www.foxnews.com/story/0,2933,95452,00.html">Privacy Policy</a>'
      },
      "mustAcceptTerms": true,
      "closable": true,
      "loginAfterSignUp": true
    }
  },
   "lindahaviv.github.io":{
    "default" : {
      "domain" : "testing-foxnews.auth0.com",
      "clientID": "3ys8tHNcg8hzzUeV-nizksE1lYw3bvBX",
      "redirectUri": "https://lindahaviv.github.io/auth0-good-poc/callback.html",
      "responseType": "token id_token",
      "responseMode": "fragment",
      "scope": "openid email nickname"
    },
    "silent": {
      "usePostMessage": true
    },
    "popup": {
      //"ignoreCasing": true
    }
  }
};
