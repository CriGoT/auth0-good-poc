(function(root) {
  // Storage keys
  const storagePrefix = "fnnauth:";
  const storageTokenKey = storagePrefix + "accessToken";
  const storageProfileKey = storagePrefix + "profile";
  const storageTargetUrlKey = storagePrefix + "targetUrl";

  const storage = root.sessionStorage;
  const document = root.document;
  const auth0jslocation = "https://cdn.auth0.com/js/auth0/8.9.2/auth0.min.js";

  if (root.FNNAuth) {
    return
  }

  var domain;
  var containerElement;
  var webAuth;
  var initialized;
  var options;

  const setAuthAttributeInBody = function () {
    document.body.setAttribute("data-auth", isAuthenticated().toString());
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
      title: 'Change Password',
      text: "Are you sure you want to change your password?",
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
        getUserProfile(function (err, profile) {
          if (err) {
            err.message = err.message || err.description
            return swal({ type: "error", title: "Whoops!", text: err.message})
          }
          webAuth.changePassword({
            connection: 'Username-Password-Authentication',
            email: profile.email
          }, function (err, resp) {
            if(err){
              err.message = err.description
              swal({ type: "error", title: "Whoops!", text: err.message})
            } else {
              swal({ type: "success", title: "Yay!", text: "Check your inbox."})
            }
          });
        });
      });
    })
  }

  // const deleteAccount = function () {
  //   swal({
  //     title: 'Delete Account',
  //     text: "Are you sure you want to delete your account?",
  //     type: 'question',
  //     showCancelButton: true,
  //     confirmButtonColor: '#3085d6',
  //     cancelButtonColor: '#d33',
  //     confirmButtonText: 'Yes!',
  //     cancelButtonText: 'No, cancel!'
  //   }).then(function () {
  //     swal.showLoading();
  //     getUserManagement(function (mgmt) {
  //       getUserProfile(function (err, profile) {
  //         if (err) {
  //           err.message = err.message || err.description
  //           return swal({ type: "error", title: "Whoops!", text: err.message})
  //         }
  //         mgmt.users.delete({
  //           id: profile["https://example.com/user_id"]
  //         }, function (err) {
  //           if(err){
  //             err.message = err.description
  //             swal({ type: "error", title: "Whoops!", text: err.message})
  //           } else {
  //             swal({ type: "success", title: "Sorry to see you go!", text: "Byeee"})
  //           }
  //         });
  //       });
  //     });
  //   })
  // }

  const profileHandlers = function (profile) {
     // Handle change password
      document.getElementById("change-pass").addEventListener("click", changePassword);
      // document.getElementById("delete-account").addEventListener("click", deleteAccount);
      var backBtn = document.getElementById("back-button");
      // Hide the back button if the previous page is not on the same domain
      if (document.referrer.indexOf(location.hostname) === -1) {
        backBtn.style.display = "none";
      } else {
        backBtn.addEventListener("click", function () {
            history.go(-1); 
        })
      }
  }

  const renderProfileFields = function (profile) {
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
  }

  const getProfileSchema = function (profile) {
    const EMAIL_RE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return {
          type: "object",
          title: "Profile",
          properties: {
            nickname: {
              title: "Display Name",
              type: "string",
              readOnly: true,
              default: profile["https://example.com/nickname"],
              "propertyOrder": 1
            },
            first_name: {
              title: "First Name",
              type: "string",
              default: "",
              "propertyOrder": 2
            },
            email: {
              title: "Email",
              type: "string",
              readOnly: true,
              default: profile.email || "",
              "propertyOrder": 4
            },
            newsletter_email: {
              title: "Newsletter Email",
              type: "string",
              default: profile.email || "",
              "propertyOrder": 4.1,
              pattern: EMAIL_RE,
              //required: true
            },
            last_name: {
              title: "Last Name",
              type: "string",
              default: "",
              "propertyOrder": 3
            },
            zip_code: {
              title: "Zip Code",
              type: "string",
              default: "",
              "propertyOrder": 5
            },
            gender: {
              title: "Gender",
              type: "string",
              enum: [
                "Not Specified",
                "male",
                "female"
              ],
              default: "Not Specified",
              "propertyOrder": 6
            },
            party: {
              title: "Political Views",
              type: "string",
              enum: [
                "liberal",
                "democrat",
                "independent",
                "republican",
                "conservative"
              ],
              default: "",
              "propertyOrder": 7
            },
            fb_breaking_alerts: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FB Breaking Alerts",
              default: false
            },
            fn_breaking_alerts: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FN Breaking Alerts",
              visible: true,
              default: false
            },
            fn_morn_headlines: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to FN Morning Headlines",
              default: false,
            },
            top_headline: {
              type: "boolean",
              format: "checkbox",
              title: "Subscribe to Top Morning Headlines",
              default: false
            }
          }
        }
  }

  const setupProfileEditor = function (profile) {

      // Set up the jsoneditor
      // https://github.com/jdorn/json-editor
      var profileEditor = new JSONEditor(document.getElementById('profile-editor'), {
        disable_edit_json: true,
        disable_collapse: true,
        disable_properties: true,
        theme: 'barebones',
        // show_errors: "always",
        schema: getProfileSchema(profile)
      });

      // Get the metadata
      const metadata = profile["https://example.com/metadata"] || {};

      // We make the true/false string in to a boolean
      // TODO: This is a hack
      //       If there are humans with weird names as "false" or "true",
      //       or a party called "false", this will probably fail.
      Object.keys(metadata).forEach(function (key) {
          if (["true", "false"].includes(metadata[key])) {
            metadata[key] = metadata[key] === "true";
          }
      })

      
      // Set the default fields
      Object.keys(profileEditor.schema.properties).forEach(function (cProp) {
        var def = profileEditor.schema.properties[cProp].default
        if (def !== undefined && metadata[cProp] === undefined) {
          metadata[cProp] = def;
        }
      })

      //style the user form 
      const lineUserProfile = `<div class='hr'></div>`;
      const stylingNewsletterUserProfile = `<div><h3>Newsletter Subscriptions</h3>${lineUserProfile}</div>`;

      $('h3 span').append(lineUserProfile);
      $('div[data-schemapath="root.party"]').append(stylingNewsletterUserProfile);

      profileEditor.setValue(metadata);

      // Save the metadata, when we click on the save button
      document.querySelector("#save-profile").addEventListener("click", function () {
        
        var errors = profileEditor.validate()
        var errorsContainer = document.querySelector("#errors")
        errorsContainer.innerHTML = "";
        if (errors.length) {
          errors.forEach(function (err) {
            if (err.path === "root.newsletter_email") {
              err.message = "Invalid newsletter email";
            }
            err.elm = document.createElement("div")
            err.elm.textContent = err.message;
            err.elm.setAttribute("class", "error");
            errorsContainer.appendChild(err.elm);
          })
          
          return;
        }
        swal.showLoading()

        var value = profileEditor.getValue()
        
        // Delete the disabled fields from the value
        //deleting read only fields from the object sent to auth 0
        Object.keys(profileEditor.schema.properties).forEach(function (cProp) {
          if (profileEditor.schema.properties[cProp].readOnly) {
            delete value[cProp]
          }
        })

        //if (value....) {
          // update newsletter preferences
          // value.fn_subscribe...
        //}
        setUserProfile(value, function () {
          swal({ type: "success", title: "Saved!"});
        })
      });
  }

  const renderUserInfo = function(){
    getUserProfile(function (err, profile) {
      if (err) {
        console.error("Error retrieving the user profile", err);
        return;
      }

      profileHandlers(profile)
      renderProfileFields(profile)
      setupProfileEditor(profile);
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

  const getUserManagement = function (cb) {
    silentLogin(setResult(function(err, authResult) {
      loadAuth0js(function() {
        const mgmt = new root.auth0.Management({
          domain: options.default.domain,
          token: authResult.idToken
        });
        cb(mgmt)
      });
    }));
  }

  // Use the management constructor to patch the user metadata
  // and store the the updated profile in the storage
  const setUserProfile = function(profile, callback) {
    if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));

    silentLogin(setResult(function(err, authResult) {
      if (!isAuthenticated()) return callback(new Error("The user has to login to set the profile"));
      getUserManagement(function (mgmt) {
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
    document.getElementById("change-pass").parentElement.insertBefore(createLink("Log Out","fnnauth0-logout",startLogout), document.getElementById("change-pass"));
    
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



    //TO DO: make UI using vue.js
    //Goal: silent login, browser compatible, newsletter integration, spot im integration, editing profile

    //QUESTION: How to delete user?
    //QUESTION: How to edit fields outside of user_metadata

    //QUESTION: request.open('GET', '/authn/' + domain + ".json", false); --need to publish domain configs
    //TO DO: how to add validators for user metadata --use webtasks
    //TO DO: Newsletter email validator
    //TO DO: prompt user to fill newsletter email field if empty
    //TO DO: can you add a date field to the sign up form
    //TO DO: make pop up embeddable
    //T0 DO: validate metadata currently using rule in js before sending back to auth 0
    //TO DO: fix appended formatting by clearing user profile div
    //TO DO: update metadata for social sign in profile
    //T0 DO: edit placeholder text for login.
    //TO DO: add conditional for social login to not be able to change password
    //TO DO: make username unique
    //TO DO: Make callback url permissions link dynamic
    //TO DO: linking users
    //TO DO: connect newsletter 
    //TO DO: add 'rules'
    //TO DO: connect with spot IM commenting
    //TO DO: have a file where we can save revision for login form
    //TO DO: way to easily migrate users
    //TO DO: clean up hosted login page on dashboard
    //TO DO: add official logo


