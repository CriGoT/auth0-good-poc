window.DOMAIN_OPTIONS = {
  localhost: {
    "default" : {
      "domain" : "crigot-dev.auth0.com",
      "clientID": "DxcuqYhM4OmQFj0B7VyRPUKlwLeqMdlJ",
      "redirectUri": "http://localhost:9000/callback.html",
      "responseType": "token id_token",
      "responseMode": "fragment",
      "scope": "openid email nickname",
      "audience": "https://sso.foxnews.com/userinfo"
    },
    "silent": {
      "usePostMessage": true
    },
    "popup": {
      //"ignoreCasing": true
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
