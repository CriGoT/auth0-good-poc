(function(root) {
  // Storage keys
  const storagePrefix = "fnnauth:";
  const storageTokenKey = storagePrefix + "accessToken";
  const storageProfileKey = storagePrefix + "profile";
  const storageTargetUrlKey = storagePrefix + "targetUrl";

  const storage = root.sessionStorage;
  const document = root.document;
  const auth0jslocation = "http://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";

  if (root.FNNAuth) {
    return
  }

  var domain;
  var containerElement;
  var webAuth;
  var initialized;
  var options;

  const setAuthAttributeInBody = function () {
    document.body.setAttribute("data-auth", isAuthenticated().toString())
  }

  const getDomainOptions = function(domain) {
    if (!options) {
      // This is defined in options.js
      options = DOMAIN_OPTIONS[domain];
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

  //binding the value to 'this' & adding it or retrieving it from storage 
  const storeAccessToken = store.bind(null,storageTokenKey);
  const storeProfile = store.bind(null,storageProfileKey); // storeProfile({...}) the equivalent of store("fnnauth:profile", {...})
  const storeTargetUrl = store.bind(null,storageTargetUrlKey);
  const retrieveAccessToken = retrieve.bind(null,storageTokenKey);
  const retrieveProfile = retrieve.bind(null,storageProfileKey);
  const retrieveTargetUrl = retrieve.bind(null,storageTargetUrlKey); // retrieveTargetUrl() instead of retrieve("fnnnauth:...")

  const setResult = function(callback, updateProfile) {
    return function(err, authResult) {
      storeAccessToken(authResult && authResult.accessToken);

      //this is removing the cached version of the profile
      //optimizing it by checking if id token exists, otherwise we don't need to call it
      if (updateProfile) {
        storeProfile(authResult && authResult.idTokenPayload);
      }

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

  const changePassword = function () {
    swal({
      title: 'Really? :D',
      text: "Do you really want to change your password?",
      type: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes!',
      cancelButtonText: 'No, cancel!'
    }).then(function () {
      swal.showLoading();
      getWebAuth(function (webAuth){
        // This will send an email
        webAuth.changePassword({
          connection: 'Username-Password-Authentication',
          email: profile.email
        }, function (err, resp) {
          if(err){
            err.message = err.description
            swal({ type: "error", title: "Whoops!", text: err.message})
          }else{
            swal({ type: "success", title: "Yay!", text: "Check your inbox."})
          }
        });
      });
    })
  }

  const renderUserInfo = function(){
    getUserProfile(function (err, profile) {
      if (err) {
        console.error("Error retrieving the user profile", err);
        return;
      }

      // Handle change password
      document.getElementById("change-pass").addEventListener("click", changePassword)

      // Display dynamic fields in the profile, using the data-user-field attribute
      var elements = document.querySelectorAll("[data-user-field]");
      for (var i = elements.length - 1; i >= 0; i--) {
         var el = elements[i];
         var field = el.getAttribute("data-user-field");
         var value = profile[field] || profile["https://example.com/" + field]
         if (el.tagName === "IMG") {
          el.setAttribute("src", value)
         } else {
          el.textContent = value;
         }
      }

      // Set up the jsoneditor
      var profileEditor = new JSONEditor(document.getElementById('profile-editor'), {
        disable_edit_json: true,
        disable_collapse: true,
        disable_properties: true,
        schema: {
          type: "object",
          title: "Your Profile: @" + profile["https://example.com/nickname"],
          properties: {
            // display_name: {
            //   title: "Display Name",
            //   type: "string"
            // },
            // birthday: {
            //   title: "Birthday",
            //   type: "string"
            // },
            party: {
              title: "Party",
              type: "string",
              enum: [
                "liberal",
                "democrat",
                "independent",
                "republican",
                "conservative"
              ]
            },
            fb_breaking_alerts: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FB Breaking Alerts"
            },
            fn_breaking_alerts: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FN Breaking Alerts"
            },
            fn_morn_headlines: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FN Morning Headlines"
            },
            top_headline: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to Top Morning Headlines"
            }
          }
        }
      });

      // Get the metadata
      const metadata = profile["https://example.com/metadata"];

      // We make the true/false string in to a boolean
      // TODO: This is a hack
      //       If there are humans with weird names as "false" or "true",
      //       or a party called "false", this will probably fail.
      Object.keys(metadata).forEach(function (key) {
          if (["true", "false"].includes(metadata[key])) {
            metadata[key] = metadata[key] === "true";
          }
      })

      // metadata.display_name = metadata.display_name || "";
      // metadata.birthday = metadata.birthday || "";
      profileEditor.setValue(metadata);

      // Save the metadata, when we click on the save button
      document.querySelector("#save-profile").addEventListener("click", function () {
        swal.showLoading()
        var value = profileEditor.getValue()
        //if (value....) {
          // update newsletter preferences
          // value.fn_subscribe...
        //}
        setUserProfile(value, function () {
          swal({ type: "success", title: "Saved!"});
        })
      });
    });
  }

  const loadAuth0js = function(callback) {
    if (!root.auth0) {
      loadJs(auth0jslocation,callback);
    } else {
      callback();
    }
  }

  const getWebAuth = function(callback) {
    loadAuth0js(function() {
      webAuth = webAuth || new root.auth0.WebAuth(options.default);
      callback(webAuth);
    });
  }

  const silentLogin = function(callback) {
    if (!initialized) throw new Error('You have to initialize the instance before trying to use it');

    // Renew auth (basically, login)
    getWebAuth(function (webAuth){
      webAuth.renewAuth(options.silent, setResult(callback));
    });
  }

  const auth0Logout = function(cb) {
    getWebAuth(function (webAuth) {
      const iframe = document.createElement("iframe");
      iframe.style.display="none";
      iframe.src= webAuth.client.buildLogoutUrl();
      iframe.onload = cb;
      document.body.appendChild(iframe);

      setTimeout(function() {
        document.body.removeChild(iframe);
      }, 1500);
    });
  }

  const startLogout =function(e) {
    if (e) e.preventDefault();

    // Empty the storage data (by not passing anything)
    storeAccessToken();
    storeProfile();
    swal.showLoading();
    auth0Logout(function () {
      location.reload();
    })
  }

  const startLogin = function(e) {
    if (e) e.preventDefault();

    storeTargetUrl(window.location.href);
    getWebAuth(function(webAuth){
      // QUESTION: options.popup.ignoreCasing = true
      // Alice True
      // First: Alice
      // Last: [x] 

      // Question: storing boolean values, without converting into strings?
      //           subscribed: false instead of "false"
      webAuth.popup.authorize(options.popup, setResult(authnCallback));
    });
  }

  const authnCallback = function(err, authResult) {
    if (err || !authResult || !authResult.accessToken) {
      console.log("Unsuccessful attempt to login", err, authResult);
    } else {
      console.log("Login completed successfully");
      renderUserInfo();
    }
    setAuthAttributeInBody();
  }

  const getUserProfile = function(callback, useSilentLogin) {
    if (!isAuthenticated()) return callback(new Error("The user has to login to get the profile"));
    useSilentLogin = useSilentLogin !== false;

    // Try to get it from the storage
    const profile = retrieveProfile();

    // If it's cached in the storage, we stop here and callback
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
           return callback(err);
          }
        }

        // Cache the profile in storage after getting it
        storeProfile(user);

        callback(null, user);
      });
    });
  }

  // Use the management constructor to patch the user metadata
  // and store the the updated profile in the storage
  const setUserProfile = function(profile, callback) {
    if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

    silentLogin(setResult(function(err, authResult) {
      if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));
      loadAuth0js(function() {

        const mgmt = new root.auth0.Management({
          domain: options.default.domain,
          token: authResult.idToken
        });

        mgmt.patchUserMetadata(authResult.idTokenPayload.sub, profile, function(err, user) {
          if (err) return callback(err);
          // we get a new token to get the updated profile
          silentLogin(setResult(function(){
            getUserProfile(callback);
          }, true));
        });
      });
    }));
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

  const initialize = function(profileElSel, loginElSel) {
    if (initialized) throw new Error("The instance is already initialized");
    
    initialized = true;
    
    // Get elements from the DOM, based on the ids
    profileElement = document.getElementById(profileElSel)
    loginElement = document.getElementById(loginElSel)

    // Create the login/logout buttons
    loginElement.appendChild(createLink("Login","fnnauth0-login",startLogin));
    profileElement.appendChild(createLink("Logout","fnnauth0-logout",startLogout));
    
    // Set auth state in the body element
    setAuthAttributeInBody();

    // Eventually render the user info, if authenticated. Otherwise, the login view
    if (isAuthenticated()) {
      renderUserInfo();
    } else {
      silentLogin(authnCallback);
    }
  }

  // Class Constructor
  const FNNAuth = function(domainName) {
    domain = domainName || root.location.hostname;
    initialized = false;
    options = getDomainOptions(domain);
  };

  // Methods
  FNNAuth.prototype.initialize = initialize;
  FNNAuth.prototype.login = login;
  FNNAuth.prototype.isAuthenticated = isAuthenticated;
  FNNAuth.prototype.getUserProfile = getUserProfile;
  FNNAuth.prototype.setUserProfile = setUserProfile;

  const staticInitialize = function(profileElement, loginElement, domain) {
    const instance = new FNNAuth(domain);
    instance.initialize(profileElement, loginElement);
  };

  // Question:
  // Why camelCase by default ONLY on login? Not on the other routes.

  // After login (called from callback.html)
  const handleCallback = function(domain){
    options = getDomainOptions(domain || root.location.hostname);
    getWebAuth(function (webAuth){
        webAuth.popup.callback();
        setTimeout(root.close,500);
    });
  }

  // index.html             fnnauth.js
  // FNNAuth.initialize --> staticInitialize --> new FnnAuth().initialize

  //called in the html
  FNNAuth.initialize = staticInitialize;
  FNNAuth.handleCallback = handleCallback;

  //making it global 
  root.FNNAuth = FNNAuth;
})(window)



    // www.foxnews.com/portal/newsalertsubscribe
    // $.ajax({
    //     type: "POST",
    //     url: "/portal/newsalertsubscribe",
    //     data: ({ slids: SLID, email: email, format: "html" }),
    //     dataType: "text"
    // }).done(function() {
    //     ISA.track({ "email-sign-up-success": { listName: list } });
    // });



    //TO DO: make UI using vue.js
    //Goal: silent login, browser compatible, newsletter integration, spot im integration, editing profile


    //QUESTION: How to edit fields outside of user_metadata
    //QUESTION: request.open('GET', '/authn/' + domain + ".json", false); --need to publish domain configs
    //TO DO: make pop up embeddable
    //TO DO: Make callback url permissions link dynamic
    //TO DO: allow users to edit their profile
    //TO DO: linking users
    //TO DO: user profiles
    //TO DO: connect newsletter 
    //TO DO: add 'rules'
    //TO DO: add links to the terms & conditions
    //TO DO: connect with spot IM commenting
    //TO DO: have a file where we can save revision for login form
    //TO DO: way to easily migrate users
    //TO DO: clean up hosted login page on dashboard
    //TO DO: add official logo


    //link to user profile currently: http://www.foxnews.com/community/user/profile/edit

//REWRITES FOR USER PROFILE & LOGIN PAGES REFERENCE
// http://jira.nyc.foxnews.com/browse/FOX-30091?focusedCommentId=391096&page=com.atlassian.jira.plugin.system.issuetabpanels:comment-tabpanel#comment-391096

// The edit profile page for the currently logged in user 
// Public: http://www.foxnews.com/community/user/profile/edit 
// Origin: foxnews.com/static/v/all/html/edit-profile.html

// The full profile activity page for a user (Origin file not yet on server) 
// Public: [uuid]" class="external-link">http://www.foxnews.com/community/user/profile/[uuid] 
// Origin: foxnews.com/static/v/all/html/profile-activity.html

// Landing page for password reset 
// Public: http://www.foxnews.com/community/user/password-reset 
// Origin: foxnews.com/static/v/all/html/password-reset.html

// Landing page for verify email 
// Public: http://www.foxnews.com/community/user/verify-email 
// Origin: foxnews.com/static/v/all/html/email-verification.html

