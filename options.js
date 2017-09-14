window.DOMAIN_OPTIONS = {
        localhost: {
            /*"default" : {
              "domain" : "testing-foxnews.auth0.com",
              "clientID": "3ys8tHNcg8hzzUeV-nizksE1lYw3bvBX",
              //"clientID": "VR3pHc4XeFYtpu36zU55cTOxrAIJ98bg",
              "audience": "https://sso.foxnews.com/userinfo",
              "redirectUri": "http://localhost:9000/callback.html",
              "responseType": "token id_token",
              "responseMode": "fragment",
              "scope": "openid email nickname"
            },*/
            "default": {
                "domain": "testing-foxnews.auth0.com",
                "clientID": "3ys8tHNcg8hzzUeV-nizksE1lYw3bvBX",
                "audience": "https://sso.foxnews.com/userinfo",
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
            }
        },
        /*localhost: {
          "default" : {
            "domain" : "crigot-dev.auth0.com",
            "clientID": "DxcuqYhM4OmQFj0B7VyRPUKlwLeqMdlJ",
                  RehgszvYOAylp2HEfx4n4lpJq2oQ7GR5
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
        },*/
        "lindahaviv.github.io": {
            "default": {
                "domain": "testing-foxnews.auth0.com",
                "clientID": "3ys8tHNcg8hzzUeV-nizksE1lYw3bvBX",
                "audience": "https://sso.foxnews.com/userinfo",
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
        },
        "foxnews.com": {
            "default": {
                "domain": "testing-foxnews.auth0.com",
                "clientID": "3ys8tHNcg8hzzUeV-nizksE1lYw3bvBX",
                "audience": "https://sso.foxnews.com/userinfo",
                "redirectUri": "http://foxnews.com/callback.html",
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
        };