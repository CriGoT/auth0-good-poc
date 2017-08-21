(function(root) {
  const storagePrefix = "ffnauth:";
  const storageTokenKey = storagePrefix + "accessToken";
  const storageProfileKey = storagePrefix + "profile";
  const storageTargetUrlKey = storagePrefix + "targetUrl";

  const storage = root.sessionStorage;
  const document = root.document;
  const auth0jslocation = "http://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";

  if (!root.FNNAuth) {
    var domain;
    var redirect;
    var containerElement;
    var webAuth;
    var initialized;
    var options;

    const isElement = function(e) {
      return typeof HTMLElement === "object" ? e instanceof HTMLElement : e && typeof e === "object" && e.nodeType === 1 && typeof e.nodeName==="string";
    }

    const getDomainOptions = function(domain) {
      if (!options) {
        // Options are retrieved synchronously to provide feedback to the instance creator
        try {
          const request = new XMLHttpRequest();
          request.open('GET',  domain + ".json", false);  // Decide where to publish domain configs
          request.send(null);

          if (request.status === 200) {
            options = JSON.parse(request.responseText);
          }
        } catch(e) {
          console.error("An error ocurred while retrieving the domain authentication configuration", e);
        }
      }

      return options;
    }

    const loadJs = function(src, callback) {
      const script = document.createElement("script");
      script.onload = callback;
      script.src = src;
      document.head.appendChild(script);
    }

    const store = function(key, value) {
      if (value!==undefined) {
        storage.setItem(key, JSON.stringify(value));
      } else {
        storage.removeItem(key);
      }
    }

    const retrieve = function(key) {
      return JSON.parse(storage.getItem(key));
    }

    const storeAccessToken = store.bind(null,storageTokenKey);
    const storeProfile = store.bind(null,storageProfileKey);
    const storeTargetUrl = store.bind(null,storageTargetUrlKey);
    const retrieveAccessToken = retrieve.bind(null,storageTokenKey);
    const retrieveProfile = retrieve.bind(null,storageProfileKey);
    const retrieveTargetUrl = retrieve.bind(null,storageTargetUrlKey);

    const setResult = function(callback) {
      return function(err, authResult) {
        storeAccessToken(authResult && authResult.accessToken);
        storeProfile();
        callback(err, authResult);
      }
    }

    const createLink = function(text, className, callback) {
      const link = document.createElement("a");
      link.className = className;
      link.innerHTML = text;
      if (link.addEventListener) {
        link.addEventListener('click', callback);
      } else {
        link.attachEvent('onclick', callback);
      }
      return link;
    }

    const renderUserInfo=function(){
      getUserProfile(function (err, profile) {
        if (err) {
          console.error("Error retrieving the user profile", err);
          return renderLoginBox();
        }

        containerElement.innerHTML = "<span class='fnnauth-userinfo'>Welcome " + (profile.nickname || profile.email) + " </span>";
        containerElement.appendChild(createLink("Logout","fnnauth0-logout",startLogout));
      });
    }

    const renderLoginBox = function() {
      containerElement.innerHTML="";
      containerElement.appendChild(createLink("Login","fnnauth0-login",startLogin));
    }

    const createWebAuth = function() {
      webAuth = webAuth || new auth0.WebAuth(options.default);
      return webAuth;
    }

    const getWebAuth = function(callback) {
      if (!root.auth0) {
        loadJs(auth0jslocation, function () {
          callback(createWebAuth());
        });
      } else {
        callback(createWebAuth());
      }
    }

    const silentLogin = function(callback) {
      if (!initialized) throw new Error('You have to initialize the instance before trying to use it');

      getWebAuth(function (webAuth){
        webAuth.renewAuth(options.silent, setResult(callback));
      });
    }

    const auth0Logout = function() {
      getWebAuth(function (webAuth) {
        const iframe = document.createElement("iframe");
        iframe.style.display="none";
        iframe.src= webAuth.client.buildLogoutUrl();;
        document.body.appendChild(iframe);
        setTimeout(function() {
          document.body.removeChild(iframe);
        }, 1500);
      });
    }

    const startLogout =function(e) {
      if (e) e.preventDefault();
      storeAccessToken();
      storeProfile();
      renderLoginBox();
      setTimeout(auth0Logout,50);
    }


    const startLogin = function(e) {
      if (e) e.preventDefault();

      storeTargetUrl(window.location.href);
      getWebAuth(function(webAuth){
        if (redirect) {
          webAuth.authorize(options.authorize);
        } else {
          webAuth.popup.authorize(options.popup, setResult(authnCallback));
        }
      });
    }

    const authnCallback = function(err, authResult) {
      if (err || !authResult || !authResult.accessToken) {
        console.log("Unsuccessful attempt to login", err, authResult);
        renderLoginBox();
      } else {
        console.log("Login completed successfully");
        renderUserInfo();
      }
    }

    const getUserProfile= function(callback, useSilentLogin) {
      if (!isAuthenticated()) return callback(new Error("The user has to login to get the profile"));
      useSilentLogin = useSilentLogin !==false;

      const profile = retrieveProfile();
      if (profile) return callback(null, profile);

      //retrieve from Auth0
      const token = retrieveAccessToken();
      getWebAuth(function(webAuth) {
        webAuth.client.userInfo(token, function(err, user) {
          if (err) {
            if (useSilentLogin) {
              //Most likely access token has expired try silent login to renew
              silentLogin(getUserProfile.bind(null, callback, false));
            } else {
             return callback (err);
            }
          }
          storeProfile(user);
          callback(null, user);
        });
      });
    }

    const isAuthenticated = function() {
      return !!retrieveAccessToken();
    }

    const login = function(callback) {
      if (isAuthenticated()) {
        getUserProfile(callback);
      } else {
        silentogin(function (err, authResult) {
          if (err) return callback(err);

          if (isAuthenticated()) {
            getUserProfile(callback, false);
          } else {
            startLogin();
          }
        });
      }
    }

    const initialize = function(element) {
      if (!element) throw new Error("You must provide an HTML Element or an eleent id to include the authentication information");
      if (initialized) throw new Error("The instance is already initialized");

      if (typeof element === "string") element = document.getElementById(element);
      if (!isElement(element)) throw new Error("The object you passed is not an HTML Element nor the ID of one");

      containerElement = element;
      initialized = true;

      if (isAuthenticated()) {
        renderUserInfo();
      } else {
        silentLogin(authnCallback);
      }
    }
    
    const FNNAuth = function(domainName, useRedirect) {
      domain = domainName || root.location.hostname;
      redirect = useRedirect!==false ;
      initiialized = false;
      options = getDomainOptions(domain);
    }

    FNNAuth.prototype.initialize = initialize;
    FNNAuth.prototype.login = login;
    FNNAuth.prototype.isAuthenticated = isAuthenticated;
    FNNAuth.prototype.getUserProfile = getUserProfile;

    const staticInitialize = function(domain, element, redirect) {
      if (!element) {
        element = domain;
        domain = undefined;
      }

      const instance = new FNNAuth(domain, redirect);
      instance.initialize(element);
    }

    const handleCallback = function(domain){
      options = getDomainOptions(domain || root.location.hostname);
      getWebAuth(function (webAuth){
        if (root.opener) {
          webAuth.popup.callback();
        setTimeout(function(){
          root.close();
        }, 1000)

          
        
        } else {
          webAuth.parseHash(setResult(function(err, authResult) {
            const redirect = retrieveTargetUrl() || root.location.origin;
            storeTargetUrl();
            root.location.href = redirect;
          }));
        }
      });
    }

    FNNAuth.initialize = staticInitialize;
    FNNAuth.handleCallback = handleCallback;

    root.FNNAuth = FNNAuth;
  }
})(window)
